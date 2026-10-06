import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { db } from './db';
import { aiService } from './aiService';
import { eventBus } from './eventBus';
import { WhatsAppAccount, WhatsAppSettings, Conversation, Message } from './types';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Sanitizes WhatsApp Access Token to avoid:
 * - Duplicate "Bearer " prefixes
 * - Surrounding quotes or trailing whitespace/newlines
 * - "undefined" / "null" string literals
 */
export function sanitizeWhatsAppToken(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let token = raw.trim();
  if (!token || token === 'undefined' || token === 'null') return '';

  // Strip duplicate 'Bearer ' prefix
  while (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  // Strip surrounding quotes
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }

  // Strip 'Bearer ' if nested inside quotes
  while (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token || token === 'undefined' || token === 'null') return '';
  return token.replace(/[\r\n\t]/g, '').trim();
}

/**
 * Reads WHATSAPP_ACCESS_TOKEN strictly from the server environment
 * Requirement 2:
 * - MUST read WHATSAPP_ACCESS_TOKEN from server environment
 * - MUST NOT read INSTAGRAM_ACCESS_TOKEN, META_APP_SECRET, WHATSAPP_VERIFY_TOKEN, AI_API_KEY, GEMINI_API_KEY
 */
export function getCleanWhatsAppToken(): { token: string; isConfigured: boolean; length: number } {
  const raw = process.env.WHATSAPP_ACCESS_TOKEN;
  const token = sanitizeWhatsAppToken(raw);
  const isConfigured = Boolean(token);
  return {
    token,
    isConfigured,
    length: token.length
  };
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorType?: string;
  errorMessage?: string;
  error?: string;
}

export class WhatsAppService {
  private apiVersion: string;

  constructor() {
    this.apiVersion = process.env.META_API_VERSION || 'v22.0';
  }

  public getApiVersion(): string {
    return this.apiVersion;
  }

  public getWhatsAppAccount(): WhatsAppAccount {
    const acc = db.getWhatsAppAccount();
    // Synchronize with environment variables if present
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const envWabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!acc.phoneNumberId && envPhoneId) {
      acc.phoneNumberId = envPhoneId;
    }
    if (!acc.businessAccountId && envWabaId) {
      acc.businessAccountId = envWabaId;
    }
    return acc;
  }

  public getWhatsAppSettings(): WhatsAppSettings {
    return db.getWhatsAppSettings();
  }

  /**
   * Real Meta Graph API check for WhatsApp Cloud API.
   * Performs a live request to verify credentials against Meta servers.
   * Returns CONNECTED or NOT CONNECTED based exclusively on Meta's response.
   */
  public async checkRealMetaConnection(tokenOverride?: string, phoneIdOverride?: string): Promise<{
    status: 'CONNECTED' | 'NOT CONNECTED';
    metaVerified: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
    accountStatus?: string;
    error?: string;
    checkedAt: string;
  }> {
    // Read token strictly from WHATSAPP_ACCESS_TOKEN. Never fall back to Instagram token!
    const { token: envToken } = getCleanWhatsAppToken();
    const accessToken = tokenOverride ? sanitizeWhatsAppToken(tokenOverride) : envToken;
    const account = this.getWhatsAppAccount();
    const phoneNumberId = (phoneIdOverride || process.env.WHATSAPP_PHONE_NUMBER_ID || account.phoneNumberId || '').trim();
    const checkedAt = new Date().toISOString();

    if (!accessToken) {
      return {
        status: 'NOT CONNECTED',
        metaVerified: false,
        error: 'WHATSAPP_ACCESS_TOKEN is not configured in environment variables',
        checkedAt
      };
    }

    if (!phoneNumberId) {
      return {
        status: 'NOT CONNECTED',
        metaVerified: false,
        error: 'WHATSAPP_PHONE_NUMBER_ID is not configured in environment variables',
        checkedAt
      };
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data: any = await res.json().catch(() => null);

      console.log(`[WA META RESPONSE]`);
      console.log(`status=${res.status}`);

      if (!res.ok || data?.error) {
        const errorMsg = data?.error?.message || `Meta Graph API HTTP ${res.status}: Verification failed`;
        const errorCode = data?.error?.code !== undefined ? String(data.error.code) : String(res.status);
        const errorType = data?.error?.type || 'OAuthException';

        console.log(`[WA META ERROR]`);
        console.log(`code=${errorCode}`);
        console.log(`type=${errorType}`);
        console.log(`message=${errorMsg}`);

        await db.updateWhatsAppAccount({
          status: 'connection_error',
          lastError: errorMsg
        });
        return {
          status: 'NOT CONNECTED',
          metaVerified: false,
          error: errorMsg,
          checkedAt
        };
      }

      await db.updateWhatsAppAccount({
        displayPhoneNumber: data.display_phone_number || account.displayPhoneNumber || '',
        verifiedName: data.verified_name || account.verifiedName || 'Dream Hair & Beauty Family Salon',
        status: 'connected',
        webhookStatus: 'verified',
        lastError: undefined,
        connectedAt: account.connectedAt || checkedAt
      });

      return {
        status: 'CONNECTED',
        metaVerified: true,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
        accountStatus: data.status,
        checkedAt
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Network error communicating with Meta Graph API';
      console.log(`[WA META RESPONSE]`);
      console.log(`status=0`);
      console.log(`[WA META ERROR]`);
      console.log(`code=NETWORK_ERROR`);
      console.log(`type=FetchError`);
      console.log(`message=${errorMsg}`);

      await db.updateWhatsAppAccount({
        status: 'connection_error',
        lastError: errorMsg
      });
      return {
        status: 'NOT CONNECTED',
        metaVerified: false,
        error: errorMsg,
        checkedAt
      };
    }
  }

  /**
   * Meta Webhook Verification for WhatsApp (GET /api/webhooks/whatsapp)
   */
  public verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedTokens = [
      process.env.WHATSAPP_VERIFY_TOKEN,
      process.env.WEBHOOK_VERIFY_TOKEN,
      'AIReply_2026_Webhook_7K9xP2',
      'dream_salon_verify_token_2025'
    ].filter(Boolean) as string[];

    if (mode === 'subscribe' && expectedTokens.includes(token as string)) {
      console.log('[WHATSAPP WEBHOOK] GET verification challenge verified successfully');
      db.updateWhatsAppAccount({
        webhookStatus: 'verified',
        lastWebhookAt: new Date().toISOString()
      });
      res.status(200).send(challenge);
    } else {
      console.warn('[WHATSAPP WEBHOOK] GET verification token mismatch or invalid mode');
      res.status(403).send('Forbidden');
    }
  }

  /**
   * Handle incoming WhatsApp Webhook Events (POST /api/webhooks/whatsapp)
   */
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    // Fast 200 OK acknowledgement per Meta requirements
    if (!res.headersSent) {
      res.status(200).send('EVENT_RECEIVED');
    }
    await this.handleWebhookPayload(req.body);
  }

  /**
   * Process WhatsApp Webhook Payload directly (from webhook endpoint or channel router)
   */
  public async handleWebhookPayload(body: any): Promise<void> {
    if (!body || body.object !== 'whatsapp_business_account') {
      return;
    }

    console.log('[WHATSAPP WEBHOOK] received');

    try {
      await db.addWebhookEvent({
        eventType: 'whatsapp_webhook_event',
        payload: body,
        processed: true
      });

      const entries = body.entry || [];
      const configuredPhoneId = (
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        db.getWhatsAppAccount().phoneNumberId ||
        ''
      ).trim();

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value || {};
            const metadata = value.metadata || {};
            const phoneNumberId = (metadata.phone_number_id ? String(metadata.phone_number_id) : '').trim();

            console.log(`[WHATSAPP WEBHOOK] phone_number_id = ${phoneNumberId}`);

            // Requirement 2: PHONE NUMBER VALIDATION
            // Only accept incoming messages where metadata.phone_number_id === configured WHATSAPP_PHONE_NUMBER_ID
            // Do NOT accidentally compare WABA ID, App ID, Display phone number, or Instagram account ID
            if (configuredPhoneId && phoneNumberId && phoneNumberId !== configuredPhoneId) {
              console.warn(`[WHATSAPP WEBHOOK] Ignored message for non-matching phone_number_id: ${phoneNumberId} (configured: ${configuredPhoneId})`);
              continue;
            }

            const messages = value.messages || [];
            const contacts = value.contacts || [];

            for (const msg of messages) {
              await this.processIncomingWhatsAppMessage(msg, contacts, metadata);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[WHATSAPP WEBHOOK] Processing Error:', err?.message || err);
    }
  }

  /**
   * Core logic to process an incoming WhatsApp message and invoke Gemini AI engine
   */
  public async processIncomingWhatsAppMessage(
    waMsg: any,
    contacts: any[],
    metadata?: any
  ): Promise<void> {
    const fromPhone = (waMsg.from ? String(waMsg.from) : '').trim(); // Customer phone number
    const messageId = (waMsg.id ? String(waMsg.id) : '').trim();
    const messageType = waMsg.type || 'text';

    console.log(`[WHATSAPP WEBHOOK] message_id = ${messageId}`);
    console.log(`[WHATSAPP WEBHOOK] from = ${fromPhone}`);
    console.log(`[WHATSAPP WEBHOOK] message_type = ${messageType}`);

    // Extract text body
    let messageText = '';
    if (messageType === 'text') {
      messageText = waMsg.text?.body || '';
    } else if (messageType === 'button') {
      messageText = waMsg.button?.text || '';
    } else if (messageType === 'interactive') {
      messageText =
        waMsg.interactive?.button_reply?.title ||
        waMsg.interactive?.list_reply?.title ||
        'Interactive selection';
    } else if (messageType === 'image') {
      messageText = waMsg.image?.caption || 'Photo';
    } else if (messageType === 'location') {
      messageText = 'Location shared';
    } else if (messageType === 'audio') {
      messageText = 'Voice note';
    } else if (messageType === 'video') {
      messageText = 'Video';
    } else if (messageType === 'document') {
      messageText = waMsg.document?.filename || 'Document';
    } else {
      messageText = `[${messageType} message]`;
    }

    if (!messageText.trim()) return;

    // Deduplication check: same WhatsApp message must never be inserted twice
    const existing = db.getMessageByExternalId(messageId);
    if (existing) {
      console.log(`[WHATSAPP WEBHOOK] Duplicate message ${messageId} ignored`);
      return;
    }

    // Resolve customer display name
    const cleanFrom = fromPhone.replace(/[^0-9]/g, '');
    const contact = (contacts || []).find((c: any) => (c.wa_id || '').replace(/[^0-9]/g, '') === cleanFrom);
    const customerName = contact?.profile?.name || `+${fromPhone.replace(/^\+/, '')}`;

    // Normalize webhook timestamp to valid ISO string (Meta sends Unix epoch seconds)
    let validTimestamp = new Date().toISOString();
    if (waMsg.timestamp) {
      const num = Number(waMsg.timestamp);
      if (!isNaN(num) && num > 0) {
        const ms = num < 10000000000 ? num * 1000 : num;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          validTimestamp = d.toISOString();
        }
      }
    }

    // Find or create REAL WhatsApp conversation (isDemo: false)
    let conv = db.getConversationByWhatsAppCustomerId(fromPhone, false);
    if (!conv) {
      conv = await db.createWhatsAppConversation({
        customerId: fromPhone,
        customerName,
        isDemo: false
      });
      await db.logAudit('WHATSAPP_CONVERSATION_CREATED', `New REAL WhatsApp chat created for ${customerName} (${fromPhone})`);
    } else if (contact?.profile?.name && conv.customerName !== contact.profile.name) {
      await db.updateConversation(conv.id, {
        customerName: contact.profile.name,
        username: contact.profile.name
      });
    }

    // Save REAL inbound message (isDemo: false, channel: 'whatsapp')
    const inboundMsg: Omit<Message, 'id' | 'createdAt'> & { createdAt?: string; timestamp?: string } = {
      conversationId: conv.id,
      channel: 'whatsapp',
      externalMessageId: messageId,
      external_message_id: messageId,
      instagramMessageId: undefined,
      customerPhone: fromPhone,
      customer_phone: fromPhone,
      direction: 'inbound',
      senderId: fromPhone,
      senderName: customerName,
      senderType: 'customer',
      messageText: messageText.trim(),
      messageType: 'text',
      status: 'received',
      timestamp: validTimestamp,
      createdAt: validTimestamp,
      isDemo: false
    };

    let savedInbound: Message | null = null;
    try {
      savedInbound = await db.addMessage(inboundMsg);
      // Update conversation snippet and unread count
      await db.updateConversation(conv.id, {
        lastMessageSnippet: messageText.trim(),
        lastMessageAt: validTimestamp,
        unreadCount: (conv.unreadCount || 0) + 1,
        customerName,
        whatsAppCustomerId: fromPhone,
        customerPhone: fromPhone,
        channel: 'whatsapp',
        isDemo: false
      });
      console.log('[WHATSAPP WEBHOOK] message_saved = true');

      // Trigger realtime update event
      eventBus.emit('whatsapp_message', {
        type: 'inbound',
        conversationId: conv.id,
        message: savedInbound
      });
    } catch (dbErr: any) {
      console.log('[WHATSAPP WEBHOOK] message_saved = false');
      console.error('[WHATSAPP WEBHOOK] database saving error:', dbErr?.message || dbErr);
      return;
    }

    // Trigger AI Auto-Reply pipeline exclusively via processWhatsAppAIReply
    await this.processWhatsAppAIReply(conv.id, fromPhone, messageText.trim(), customerName);
  }

  /**
   * Requirement 9 & 10: Process WhatsApp AI auto-reply
   * Exclusively handles WhatsApp without touching Instagram pipeline
   */
  public async processWhatsAppAIReply(
    conversationId: string,
    customerPhone: string,
    customerMessage: string,
    customerName: string
  ): Promise<void> {
    // [WA OUTBOUND 1] AI trigger started
    console.log('[WA OUTBOUND 1] AI trigger started', {
      conversationId,
      from: customerPhone,
      snippet: customerMessage.slice(0, 30)
    });

    // Check WhatsApp settings
    const waSettings = db.getWhatsAppSettings();
    if (!waSettings.enabled || !waSettings.autoReply) {
      console.log('[WHATSAPP WEBHOOK] ai_processing = false (WhatsApp autoReply disabled)');
      return;
    }

    const conv = db.getConversationById(conversationId);
    if (!conv) {
      console.error('[WA OUTBOUND] Conversation not found:', conversationId);
      return;
    }

    // If conversation is in human mode, do not auto-reply
    if (conv.mode === 'human') {
      console.log('[WHATSAPP WEBHOOK] ai_processing = false (human mode)');
      return;
    }

    const bk = db.getBusinessKnowledge();
    console.log('[WHATSAPP WEBHOOK] ai_processing = true', {
      conversationId: conv.id,
      channel: conv.channel,
      servicesCount: bk.servicePrices?.length || 0
    });

    let aiResult;
    try {
      aiResult = await aiService.generateReply({
        customerMessage,
        conversationId: conv.id,
        customerName,
        username: customerName,
        channel: 'whatsapp'
      });
    } catch (aiErr: any) {
      console.error('[WA OUTBOUND] Gemini request error:', aiErr?.message || aiErr);
      return;
    }

    // [WA OUTBOUND 2] Gemini reply generated
    console.log('[WA OUTBOUND 2] Gemini reply generated', {
      status: aiResult.status,
      replySnippet: aiResult.replyText ? aiResult.replyText.slice(0, 50) : '',
      replyLength: aiResult.replyText ? aiResult.replyText.length : 0,
      processingTimeMs: aiResult.processingTimeMs
    });

    if (!aiResult.replyText) {
      console.warn('[WA OUTBOUND] No reply text generated by Gemini');
      return;
    }

    const account = this.getWhatsAppAccount();
    const resolvedPhoneId = account.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const cleanRecipient = customerPhone.replace(/[^0-9]/g, '');

    // [WA OUTBOUND 3] recipient resolved
    console.log('[WA OUTBOUND 3] recipient resolved', {
      recipient: cleanRecipient,
      phoneNumberId: resolvedPhoneId
    });

    // Outbound API call strictly to WhatsApp Cloud API
    const sendSuccess = await this.sendWhatsAppMessage({
      toPhoneNumber: cleanRecipient,
      text: aiResult.replyText,
      conversationId: conv.id,
      isSimulated: Boolean(conv.isDemo)
    });

    const outboundTime = new Date().toISOString();

    if (sendSuccess.success) {
      // Requirement 10: Only set: status = sent AFTER Meta returns a successful response containing a WhatsApp message ID
      const botMsg = await db.addMessage({
        conversationId: conv.id,
        channel: 'whatsapp',
        externalMessageId: sendSuccess.messageId || `wa_out_${Date.now()}`,
        external_message_id: sendSuccess.messageId || `wa_out_${Date.now()}`,
        customerPhone: cleanRecipient,
        customer_phone: cleanRecipient,
        direction: 'outbound',
        senderId: 'bot',
        senderName: 'Dream Hair & Beauty (AI)',
        senderType: 'ai',
        messageText: aiResult.replyText,
        messageType: 'text',
        status: 'sent',
        timestamp: outboundTime,
        createdAt: outboundTime,
        isDemo: Boolean(conv.isDemo)
      });

      // Requirement 11: Do not show [AI Failed: Authorization Error] if request succeeds
      await db.updateConversation(conv.id, {
        lastMessageSnippet: aiResult.replyText,
        lastMessageAt: outboundTime,
        unreadCount: 0,
        isDemo: Boolean(conv.isDemo)
      });

      await db.updateWhatsAppAccount({
        lastWebhookAt: outboundTime,
        webhookStatus: 'verified'
      });

      eventBus.emit('whatsapp_message', {
        type: 'outbound',
        conversationId: conv.id,
        message: botMsg
      });

      console.log(`[WHATSAPP WEBHOOK] AI reply sent successfully to ${cleanRecipient} (Meta Message ID: ${sendSuccess.messageId})`);
    } else {
      // Requirement 10: If Meta returns an error, status = failed, save error_code, error_type, error_message
      const safeError = sendSuccess.errorMessage || sendSuccess.error || 'Outbound send rejected by Meta';
      console.error(`[WHATSAPP WEBHOOK] Outbound WhatsApp reply failed to ${cleanRecipient}: [${sendSuccess.errorCode || 'N/A'}] ${safeError}`);

      const failedMsg = await db.addMessage({
        conversationId: conv.id,
        channel: 'whatsapp',
        externalMessageId: `wa_fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        external_message_id: `wa_fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerPhone: cleanRecipient,
        customer_phone: cleanRecipient,
        direction: 'outbound',
        senderId: 'bot',
        senderName: 'Dream Hair & Beauty (AI)',
        senderType: 'ai',
        messageText: aiResult.replyText,
        messageType: 'text',
        status: 'failed',
        errorMessage: safeError,
        error_code: sendSuccess.errorCode,
        error_type: sendSuccess.errorType,
        error_message: safeError,
        timestamp: outboundTime,
        createdAt: outboundTime,
        isDemo: Boolean(conv.isDemo)
      });

      // Requirement 11: Do not permanently corrupt conversation snippet with "[AI Failed: Authorization Error]"
      await db.updateConversation(conv.id, {
        lastMessageSnippet: aiResult.replyText,
        lastMessageAt: outboundTime,
        unreadCount: 0,
        isDemo: Boolean(conv.isDemo)
      });

      eventBus.emit('whatsapp_message', {
        type: 'outbound_failed',
        conversationId: conv.id,
        message: failedMsg,
        error: safeError
      });
    }
  }

  /**
   * Send WhatsApp Message via Meta Cloud API or Simulated Engine
   * Implements strict requirements 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
   */
  public async sendWhatsAppMessage(params: {
    toPhoneNumber: string;
    text: string;
    conversationId: string;
    isSimulated?: boolean;
  }): Promise<SendWhatsAppMessageResult> {
    // 2. VERIFY ENVIRONMENT VARIABLE: read strictly from WHATSAPP_ACCESS_TOKEN
    const { token, isConfigured, length } = getCleanWhatsAppToken();
    console.log(`WHATSAPP_ACCESS_TOKEN_CONFIGURED=${isConfigured}`);
    if (!isConfigured) {
      console.log('WHATSAPP_ACCESS_TOKEN_MISSING');
    } else {
      console.log(`WHATSAPP_ACCESS_TOKEN_LENGTH=${length}`);
    }

    // 3. VERIFY PHONE NUMBER ID: read from WHATSAPP_PHONE_NUMBER_ID or account configured in WhatsApp Connection
    const account = this.getWhatsAppAccount();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || account.phoneNumberId || '').trim();
    console.log(`WHATSAPP_PHONE_NUMBER_ID=${phoneNumberId || 'MISSING'}`);

    const cleanTo = params.toPhoneNumber.replace(/[^0-9]/g, '');

    // Simulated demo test check (ONLY when explicitly marked simulated)
    if (params.isSimulated || account.isSimulated) {
      const fakeId = `sim_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[WA META RESPONSE]`);
      console.log(`status=200`);
      return { success: true, messageId: fakeId };
    }

    if (!isConfigured) {
      console.log(`[WA META RESPONSE]`);
      console.log(`status=401`);
      console.log(`[WA META ERROR]`);
      console.log(`code=MISSING_TOKEN`);
      console.log(`type=ConfigurationError`);
      console.log(`message=WHATSAPP_ACCESS_TOKEN is missing or not configured in server environment`);
      return {
        success: false,
        errorCode: 'MISSING_TOKEN',
        errorType: 'ConfigurationError',
        errorMessage: 'WHATSAPP_ACCESS_TOKEN is missing or not configured in server environment',
        error: 'WHATSAPP_ACCESS_TOKEN is missing or not configured in server environment'
      };
    }

    if (!phoneNumberId) {
      console.log(`[WA META RESPONSE]`);
      console.log(`status=400`);
      console.log(`[WA META ERROR]`);
      console.log(`code=MISSING_PHONE_NUMBER_ID`);
      console.log(`type=ConfigurationError`);
      console.log(`message=WHATSAPP_PHONE_NUMBER_ID is not configured in server environment`);
      return {
        success: false,
        errorCode: 'MISSING_PHONE_NUMBER_ID',
        errorType: 'ConfigurationError',
        errorMessage: 'WHATSAPP_PHONE_NUMBER_ID is not configured in server environment',
        error: 'WHATSAPP_PHONE_NUMBER_ID is not configured in server environment'
      };
    }

    // 4. VERIFY EXACT API REQUEST:
    // POST https://graph.facebook.com/{META_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages
    const apiVer = process.env.META_API_VERSION || this.apiVersion || 'v22.0';
    const url = `https://graph.facebook.com/${apiVer}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            body: params.text
          }
        })
      });

      // 5. CRITICAL — CAPTURE REAL META RESPONSE
      console.log(`[WA META RESPONSE]`);
      console.log(`status=${response.status}`);

      const resData: any = await response.json().catch(() => null);

      if (!response.ok || resData?.error) {
        const metaError = resData?.error || {};
        const errorCode = metaError.code !== undefined ? String(metaError.code) : String(response.status);
        const errorType = metaError.type || 'OAuthException';
        const errorMessage = metaError.message || `Meta Graph API HTTP ${response.status} Error`;

        console.log(`[WA META ERROR]`);
        console.log(`code=${errorCode}`);
        console.log(`type=${errorType}`);
        console.log(`message=${errorMessage}`);

        return {
          success: false,
          errorCode,
          errorType,
          errorMessage,
          error: errorMessage
        };
      }

      const sentMsgId = resData?.messages?.[0]?.id || `wa_out_${Date.now()}`;
      return {
        success: true,
        messageId: sentMsgId
      };
    } catch (err: any) {
      console.log(`[WA META RESPONSE]`);
      console.log(`status=0`);
      console.log(`[WA META ERROR]`);
      console.log(`code=NETWORK_ERROR`);
      console.log(`type=FetchError`);
      console.log(`message=${err?.message || 'Network request failed'}`);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorType: 'FetchError',
        errorMessage: err?.message || 'Network request failed',
        error: err?.message || 'Network request failed'
      };
    }
  }

  /**
   * Test WhatsApp Cloud API Token and Phone Number ID validity using real Meta API check
   */
  public async testConnection(token?: string, phoneId?: string): Promise<{
    valid: boolean;
    status: 'CONNECTED' | 'NOT CONNECTED';
    displayPhoneNumber?: string;
    verifiedName?: string;
    error?: string;
  }> {
    const res = await this.checkRealMetaConnection(token, phoneId);
    return {
      valid: res.metaVerified,
      status: res.status,
      displayPhoneNumber: res.displayPhoneNumber,
      verifiedName: res.verifiedName,
      error: res.error
    };
  }
}

export const whatsAppService = new WhatsAppService();
