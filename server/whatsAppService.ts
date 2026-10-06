import { Request, Response } from 'express';
import { db } from './db';
import { aiService } from './aiService';
import { eventBus } from './eventBus';
import { WhatsAppAccount, WhatsAppSettings, Conversation, Message } from './types';

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
    // Requirement 8: Read token strictly from WHATSAPP_ACCESS_TOKEN. Never fall back to Instagram token!
    const accessToken = tokenOverride || process.env.WHATSAPP_ACCESS_TOKEN;
    const account = this.getWhatsAppAccount();
    const phoneNumberId = phoneIdOverride || account.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
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
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data: any = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || `Meta Graph API HTTP ${res.status}: Verification failed`;
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
      // Requirement 6: Mark AI message as sent/replied ONLY when Meta actually returns a successful response
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
        status: 'ai_replied',
        timestamp: outboundTime,
        createdAt: outboundTime,
        isDemo: Boolean(conv.isDemo)
      });

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

      console.log(`[WHATSAPP WEBHOOK] AI reply sent successfully to ${cleanRecipient}`);
    } else {
      // Requirement 6 & 8: If Meta returns an error, save status = failed, save safe error message, log error
      const safeError = sendSuccess.error || 'Outbound send rejected by Meta';
      console.error(`[WHATSAPP WEBHOOK] Outbound WhatsApp reply failed to ${cleanRecipient}:`, safeError);

      const failedMsg = await db.addMessage({
        conversationId: conv.id,
        channel: 'whatsapp',
        externalMessageId: `wa_fail_${Date.now()}`,
        external_message_id: `wa_fail_${Date.now()}`,
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
        timestamp: outboundTime,
        createdAt: outboundTime,
        isDemo: Boolean(conv.isDemo)
      });

      await db.updateConversation(conv.id, {
        lastMessageSnippet: `[AI Failed: ${safeError}] ${aiResult.replyText}`,
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
   */
  public async sendWhatsAppMessage(params: {
    toPhoneNumber: string;
    text: string;
    conversationId: string;
    isSimulated?: boolean;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Requirement 8: Read token strictly from WHATSAPP_ACCESS_TOKEN. Never fall back to Instagram token!
    const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const account = this.getWhatsAppAccount();
    const phoneNumberId = account.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const cleanTo = params.toPhoneNumber.replace(/[^0-9]/g, '');

    // [WA OUTBOUND 4] WhatsApp send started
    console.log('[WA OUTBOUND 4] WhatsApp send started', {
      to: cleanTo,
      phoneNumberId,
      isSimulated: Boolean(params.isSimulated || account.isSimulated)
    });

    // Simulated demo test check (ONLY when explicitly marked simulated)
    if (params.isSimulated || account.isSimulated) {
      console.log(`[WhatsApp Simulator Outbound to ${cleanTo}]:`, params.text);
      const fakeId = `sim_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[WA OUTBOUND 5] Meta HTTP status = 200 (simulated)`);
      console.log(`[WA OUTBOUND 6] Meta response = ${JSON.stringify({ simulated: true, messageId: fakeId })}`);
      console.log(`[WA OUTBOUND 7] message sent = true`);
      return { success: true, messageId: fakeId };
    }

    if (!token) {
      console.error('[WhatsApp Cloud API Outbound Error] WHATSAPP_ACCESS_TOKEN is not configured');
      console.log(`[WA OUTBOUND 5] Meta HTTP status = 401 (missing token)`);
      console.log(`[WA OUTBOUND 6] Meta response = ${JSON.stringify({ error: 'Missing WHATSAPP_ACCESS_TOKEN' })}`);
      console.log(`[WA OUTBOUND 7] message sent = false`);
      return { success: false, error: 'WHATSAPP_ACCESS_TOKEN is not configured' };
    }

    if (!phoneNumberId) {
      console.error('[WhatsApp Cloud API Outbound Error] WHATSAPP_PHONE_NUMBER_ID is not configured');
      console.log(`[WA OUTBOUND 5] Meta HTTP status = 400 (missing phone number id)`);
      console.log(`[WA OUTBOUND 6] Meta response = ${JSON.stringify({ error: 'Missing WHATSAPP_PHONE_NUMBER_ID' })}`);
      console.log(`[WA OUTBOUND 7] message sent = false`);
      return { success: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not configured' };
    }

    // Call Real Meta WhatsApp Cloud API: POST https://graph.facebook.com/{META_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages
    const apiVer = process.env.META_API_VERSION || this.apiVersion || 'v22.0';
    const url = `https://graph.facebook.com/${apiVer}/${phoneNumberId}/messages`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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

      // [WA OUTBOUND 5] Meta HTTP status = ...
      console.log(`[WA OUTBOUND 5] Meta HTTP status = ${response.status}`);

      const resData: any = await response.json().catch(() => null);

      // Safe representation of response without sensitive tokens
      const safeMetaResponse = resData ? {
        error: resData.error ? {
          message: resData.error.message,
          type: resData.error.type,
          code: resData.error.code,
          error_subcode: resData.error.error_subcode,
          fbtrace_id: resData.error.fbtrace_id
        } : undefined,
        messaging_product: resData.messaging_product,
        contacts: resData.contacts,
        messages: resData.messages
      } : { rawStatus: response.status };

      // [WA OUTBOUND 6] Meta response = ...
      console.log(`[WA OUTBOUND 6] Meta response = ${JSON.stringify(safeMetaResponse)}`);

      if (!response.ok) {
        const errorMsg = resData?.error?.message || `WhatsApp API error ${response.status}`;
        const errorCode = resData?.error?.code || 'N/A';
        console.error(`[WhatsApp Cloud API Outbound Error] HTTP ${response.status} Code: ${errorCode} - ${errorMsg}`);
        // [WA OUTBOUND 7] message sent = false
        console.log(`[WA OUTBOUND 7] message sent = false`);
        return {
          success: false,
          error: errorMsg
        };
      }

      const sentMsgId = resData?.messages?.[0]?.id;
      // [WA OUTBOUND 7] message sent = true
      console.log(`[WA OUTBOUND 7] message sent = true`);
      return { success: true, messageId: sentMsgId };
    } catch (err: any) {
      console.error('[WhatsApp Network Error]', err?.message || err);
      console.log(`[WA OUTBOUND 5] Meta HTTP status = 0 (network error)`);
      console.log(`[WA OUTBOUND 6] Meta response = ${JSON.stringify({ error: err?.message || 'Network request failed' })}`);
      console.log(`[WA OUTBOUND 7] message sent = false`);
      return { success: false, error: err.message || 'Network request failed' };
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
