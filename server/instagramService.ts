import { db } from './db.js';
import { aiService } from './aiService.js';
import { InstagramAccount, Message, TokenHealthCheckResult } from './types.js';

export interface SendMessageOptions {
  recipientId: string;
  text: string;
  conversationId?: string;
  isSimulated?: boolean;
}

export class InstagramService {
  public get apiVersion(): string {
    return (process.env.META_API_VERSION || '').trim();
  }

  // Requirement 7 & 8: Read token only from INSTAGRAM_ACCESS_TOKEN and do not trim, mutate, or transform
  public get accessToken(): string {
    return process.env.INSTAGRAM_ACCESS_TOKEN || '';
  }

  public get businessAccountId(): string {
    return (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841472284295174').trim();
  }

  public get verifyToken(): string {
    return (process.env.WEBHOOK_VERIFY_TOKEN || '').trim() || 'dream_insta_verify_token_2026';
  }

  /**
   * Meta Instagram API host for the current Instagram API setup:
   * (instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments)
   * The current Instagram API authentication flow uses graph.instagram.com
   */
  public get apiBaseHost(): string {
    return 'https://graph.instagram.com';
  }

  public get outboundEndpointPattern(): string {
    return `${this.apiBaseHost}/${this.apiVersion || 'v26.0'}/me/messages`;
  }

  public getMetaApiVersion(): string {
    return this.apiVersion;
  }

  public getMetaApiVersionDisplay(): string {
    return this.apiVersion || 'Meta API version is not configured';
  }

  /**
   * Requirement 13: Redact access token, app secret, verify token, and api keys from any logged error
   */
  public sanitizeErrorMessage(msg: string): string {
    let sanitized = String(msg || '');
    const token = this.accessToken;
    if (token && token.length > 5) {
      sanitized = sanitized.split(token).join('[REDACTED_ACCESS_TOKEN]');
    }
    const secret = process.env.META_APP_SECRET;
    if (secret && secret.length > 4) {
      sanitized = sanitized.split(secret).join('[REDACTED_APP_SECRET]');
    }
    const verify = this.verifyToken;
    if (verify && verify.length > 4) {
      sanitized = sanitized.split(verify).join('[REDACTED_VERIFY_TOKEN]');
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.length > 5) {
      sanitized = sanitized.split(geminiKey).join('[REDACTED_AI_KEY]');
    }
    const aiKey = process.env.AI_API_KEY;
    if (aiKey && aiKey.length > 5) {
      sanitized = sanitized.split(aiKey).join('[REDACTED_AI_KEY]');
    }

    return sanitized
      .replace(/IG[A-Za-z0-9_-]{10,}/g, '[REDACTED_INSTAGRAM_TOKEN]')
      .replace(/EA[A-Za-z0-9_-]{10,}/g, '[REDACTED_FACEBOOK_TOKEN]')
      .replace(/Bearer\s+[A-Za-z0-9_\-.~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/access_token=[^&\s"']+/gi, 'access_token=[REDACTED]')
      .replace(/client_secret=[^&\s"']+/gi, 'client_secret=[REDACTED]');
  }

  /**
   * Section 6: Meta Hub Challenge Webhook Verification
   */
  public verifyWebhook(mode?: string, token?: string, challenge?: string): { success: boolean; challenge?: string } {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return { success: true, challenge };
    }
    return { success: false };
  }

  /**
   * Requirement 10: Secure server-side Instagram Token Health Check
   * Verifies that the configured token can authenticate against the correct Instagram API endpoint.
   * NEVER returns the actual token.
   */
  public async checkTokenHealth(): Promise<TokenHealthCheckResult> {
    const token = this.accessToken;
    const apiVersion = this.apiVersion || 'Meta API version is not configured';
    const defaultEndpoint = `${this.apiBaseHost}/${this.apiVersion || 'v26.0'}/me/messages`;

    if (!token) {
      return {
        tokenConfigured: 'NO',
        authentication: 'INVALID',
        instagramAccount: 'not connected',
        apiVersion,
        apiEndpoint: defaultEndpoint,
        error: 'INSTAGRAM_ACCESS_TOKEN is not configured in environment variables'
      };
    }

    if (!this.apiVersion) {
      return {
        tokenConfigured: 'YES',
        authentication: 'INVALID',
        instagramAccount: 'not connected',
        apiVersion,
        apiEndpoint: defaultEndpoint,
        error: 'Meta API version is not configured (META_API_VERSION is missing)'
      };
    }

    // Test candidate endpoints for token validation
    const candidateValidationUrls = [
      {
        url: `https://graph.instagram.com/${this.apiVersion}/me?fields=id,username,name`,
        outboundEndpoint: `https://graph.instagram.com/${this.apiVersion}/me/messages`
      },
      {
        url: `https://graph.instagram.com/${this.apiVersion}/${this.businessAccountId}?fields=id,username,name`,
        outboundEndpoint: `https://graph.instagram.com/${this.apiVersion}/${this.businessAccountId}/messages`
      },
      {
        url: `https://graph.facebook.com/${this.apiVersion}/${this.businessAccountId}?fields=id,name`,
        outboundEndpoint: `https://graph.facebook.com/${this.apiVersion}/${this.businessAccountId}/messages`
      },
      {
        url: `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name`,
        outboundEndpoint: `https://graph.facebook.com/${this.apiVersion}/me/messages`
      }
    ];

    let lastError = '';

    for (const candidate of candidateValidationUrls) {
      try {
        const res = await fetch(candidate.url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data: any = await res.json();

        if (res.ok && data?.id) {
          // Token is authenticated and valid!
          const accountUsername = data.username || 'dream_familysalon';
          const accountName = data.name || db.getInstagramAccount().name || 'Dream Hair & Beauty Family Salon';
          const accountId = data.id || this.businessAccountId;

          // Automatically sync connected Instagram account details
          await db.updateInstagramAccount({
            username: accountUsername,
            name: accountName,
            businessAccountId: accountId,
            status: 'connected',
            tokenStatus: 'valid',
            isSimulated: false
          });

          await db.logAudit(
            'TOKEN_HEALTH_VALID',
            `Instagram token validated successfully via ${candidate.url}. Connected account: @${accountUsername} (${accountId})`
          );

          return {
            tokenConfigured: 'YES',
            authentication: 'VALID',
            instagramAccount: 'connected',
            apiVersion: this.apiVersion,
            apiEndpoint: candidate.outboundEndpoint,
            accountUsername,
            accountId
          };
        }

        const rawErr = data?.error?.message || `HTTP ${res.status}`;
        lastError = this.sanitizeErrorMessage(rawErr);
      } catch (err: any) {
        lastError = this.sanitizeErrorMessage(err?.message || 'Network exception during token validation');
      }
    }

    await db.logAudit(
      'TOKEN_HEALTH_FAILED',
      `Instagram token validation failed against endpoints. Last error: ${lastError}`
    );

    return {
      tokenConfigured: 'YES',
      authentication: 'INVALID',
      instagramAccount: 'not connected',
      apiVersion: this.apiVersion,
      apiEndpoint: defaultEndpoint,
      error: lastError || 'Token authentication failed against Instagram Graph API endpoints'
    };
  }

  /**
   * Requirement 11: Test Instagram Reply server-side diagnostic
   * Sends a test message only when explicitly triggered by the admin.
   */
  public async testOutboundReply(recipientId: string, testText?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    endpointUsed: string;
  }> {
    const text = testText || 'Test reply from Instagram AI Auto Reply system. Everything is connected and working!';
    const result = await this.sendInstagramMessage({
      recipientId,
      text,
      isSimulated: false
    });

    await db.logAudit(
      result.success ? 'TEST_REPLY_SENT' : 'TEST_REPLY_FAILED',
      result.success
        ? `Diagnostic test message delivered to recipient ${recipientId} via ${result.endpointUsed || this.outboundEndpointPattern}. Meta Message ID: ${result.messageId}`
        : `Diagnostic test message to recipient ${recipientId} failed via ${result.endpointUsed || this.outboundEndpointPattern}: ${result.error}`
    );

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      endpointUsed: result.endpointUsed || this.outboundEndpointPattern
    };
  }

  /**
   * Section 17: Get sanitized account details without exposing secrets
   */
  public getInstagramAccount(): InstagramAccount {
    const acc = db.getInstagramAccount();
    const hasToken = Boolean(this.accessToken);
    const hasAccount = Boolean(this.businessAccountId);

    return {
      ...acc,
      businessAccountId: hasAccount ? this.businessAccountId : acc.businessAccountId,
      tokenStatus: hasToken ? 'valid' : acc.tokenStatus,
      isSimulated: !hasToken
    };
  }

  /**
   * Section 6 & 7: Process Meta/Instagram incoming webhook event
   * Real Instagram webhook events must come from /api/webhooks/instagram,
   * be stored as real messages (isDemo: false), NOT receive the DEMO label,
   * and NOT be treated as simulated messages.
   */
  public async processWebhookEvent(payload: any): Promise<{ handled: boolean; messageId?: string; isDuplicate?: boolean }> {
    if (!payload || (payload.object !== 'instagram' && payload.object !== 'page')) {
      return { handled: false };
    }

    // Strict channel isolation: Reject any WhatsApp payloads immediately
    if (
      payload.object === 'whatsapp_business_account' ||
      payload.entry?.[0]?.changes?.[0]?.value?.messaging_product === 'whatsapp' ||
      (payload.entry?.[0]?.changes?.[0]?.field === 'messages' && Boolean(payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id))
    ) {
      return { handled: false };
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const entryId = entry.id;
      const messagingList = entry.messaging || [];

      for (const item of messagingList) {
        const senderId = item.sender?.id;
        const recipientId = item.recipient?.id;
        const message = item.message;
        const timestamp = item.timestamp;

        // Skip non-message events like read receipts, deliveries, or echo messages from our own bot
        if (!message || message.is_echo || !message.text) {
          continue;
        }

        const externalMessageId = message.mid || `mid_${timestamp}_${senderId}`;
        const externalEventId = `${entryId}_${externalMessageId}`;

        // Section 7: Duplicate Event Protection
        if (db.isDuplicateEvent(externalEventId, externalMessageId)) {
          await db.recordWebhookEvent({
            externalEventId,
            externalMessageId,
            eventType: 'instagram_dm',
            payloadSummary: `Duplicate skipped for sender ${senderId}`,
            status: 'skipped_duplicate'
          });
          return { handled: true, isDuplicate: true };
        }

        // Find or create REAL conversation (channel: 'instagram', isDemo: false)
        let conversation = db.getConversationByInstagramUserId(senderId);
        if (!conversation) {
          conversation = await db.createConversation({
            instagramUserId: senderId,
            username: `ig_user_${senderId.slice(-6)}`,
            customerName: `Instagram User (${senderId.slice(-4)})`,
            isDemo: false
          });
          await db.logAudit(
            'NEW_CONVERSATION',
            `Started new live DM conversation with Instagram user ${senderId}`
          );
        }

        // Store REAL inbound message (channel: 'instagram', isDemo: false)
        const storedMessage = await db.addMessage({
          conversationId: conversation.id,
          channel: 'instagram',
          externalMessageId,
          senderId,
          senderName: conversation.username,
          messageText: message.text,
          direction: 'inbound',
          messageType: 'text',
          status: 'received',
          isDemo: false
        });

        // Record webhook event processed
        await db.recordWebhookEvent({
          externalEventId,
          externalMessageId,
          eventType: 'instagram_dm',
          payloadSummary: `Received live DM: "${message.text.slice(0, 50)}" from ${senderId}`,
          status: 'processed'
        });

        // Trigger AI auto-reply asynchronously so webhook responds within 2 seconds
        this.triggerAsyncAiReply(conversation.id, senderId, message.text, storedMessage.id);

        return { handled: true, messageId: storedMessage.id };
      }

      // Requirement 19: Process Instagram Comments separately from DMs
      const changesList = entry.changes || [];
      for (const change of changesList) {
        if (change.field === 'comments') {
          const commentVal = change.value;
          const commentId = commentVal?.id;
          const commentText = commentVal?.text;
          const fromUser = commentVal?.from?.username || 'user';
          if (!commentId || !commentText) continue;

          const externalEventId = `comment_${commentId}`;
          if (db.isDuplicateEvent(externalEventId, commentId)) {
            continue;
          }

          await db.recordWebhookEvent({
            externalEventId,
            externalMessageId: commentId,
            eventType: 'instagram_comment',
            payloadSummary: `Comment from @${fromUser}: "${commentText.slice(0, 50)}"`,
            status: 'processed'
          });

          // Trigger comment AI reply in comment context (no DM history mixed in)
          this.triggerAsyncCommentReply(commentId, commentText, fromUser);
          return { handled: true };
        }
      }
    }

    return { handled: true };
  }

  /**
   * Requirement 19: Asynchronous Comment AI Reply Pipeline
   * Comments and DMs maintain completely separated contexts
   */
  private async triggerAsyncCommentReply(commentId: string, commentText: string, username: string): Promise<void> {
    try {
      const aiResult = await aiService.generateReply({
        customerMessage: commentText,
        conversationId: '',
        username,
        isCommentContext: true
      });

      if (!aiResult.replyText) return;

      const token = this.accessToken;
      if (!token) return;

      const endpoint = `${this.apiBaseHost}/${this.apiVersion}/${commentId}/replies`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: aiResult.replyText })
      });

      if (response.ok) {
        await db.logAudit('COMMENT_REPLY_SENT', `Replied to comment ${commentId} by @${username}: "${aiResult.replyText}"`);
      } else {
        const data: any = await response.json().catch(() => null);
        console.warn('[Instagram Comment Reply Error]:', data?.error?.message || response.statusText);
      }
    } catch (err) {
      console.error('[Comment AI Reply Exception]:', err);
    }
  }

  /**
   * Asynchronous AI reply pipeline execution
   */
  private async triggerAsyncAiReply(
    conversationId: string,
    recipientId: string,
    messageText: string,
    inboundMessageId: string
  ): Promise<void> {
    try {
      const conv = db.getConversationById(conversationId);
      if (!conv) return;

      const isDemoMode = Boolean(conv.isDemo);

      const aiResult = await aiService.generateReply({
        customerMessage: messageText,
        conversationId,
        customerName: conv.customerName,
        username: conv.username,
        channel: 'instagram'
      });

      if (!aiResult.replyText || aiResult.status === 'fallback' || aiResult.status === 'human_required') {
        if (aiResult.replyText) {
          // Send polite hand-off / notice to customer
          const noticeResult = await this.sendInstagramMessage({
            recipientId,
            text: aiResult.replyText,
            conversationId,
            isSimulated: isDemoMode
          });

          if (noticeResult.success) {
            await db.updateMessage(inboundMessageId, { status: 'human_replied' });
          } else {
            await db.updateMessage(inboundMessageId, {
              status: 'failed',
              errorMessage: noticeResult.error || 'Failed sending notice to Instagram'
            });
          }
        }
        return;
      }

      // Send the AI reply through Meta API
      const sendResult = await this.sendInstagramMessage({
        recipientId,
        text: aiResult.replyText,
        conversationId,
        isSimulated: isDemoMode
      });

      // Requirement 12 & 14: Only mark as "ai_replied" after Meta returns successful message ID
      if (sendResult.success) {
        await db.updateMessage(inboundMessageId, { status: 'ai_replied' });
      } else {
        await db.updateMessage(inboundMessageId, {
          status: 'failed',
          errorMessage: sendResult.error || 'Failed delivering reply via Instagram API'
        });
      }
    } catch (err) {
      console.error('[Instagram Service] Async AI Reply error:', err);
      const safeErr = this.sanitizeErrorMessage((err as Error).message);
      await db.logAudit('AI_REPLY_ERROR', `Failed processing AI reply for conv ${conversationId}: ${safeErr}`);
      await db.updateMessage(inboundMessageId, {
        status: 'failed',
        errorMessage: safeErr
      });
    }
  }

  /**
   * Section 17 & 19: Send Instagram DM through Meta Graph API
   * Implements corrected Instagram Send API host and format for the current token type
   */
  public async sendInstagramMessage(options: SendMessageOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    isSimulated?: boolean;
    endpointUsed?: string;
  }> {
    const { recipientId, text, conversationId, isSimulated } = options;
    const token = this.accessToken;
    const apiVersion = this.apiVersion;
    const apiHost = this.apiBaseHost;
    const targetEndpoint = `${apiHost}/${apiVersion}/me/messages`;

    // Explicit simulator / demo mode ONLY (from Dev Simulator)
    if (isSimulated === true) {
      let storedMsg: Message | null = null;
      if (conversationId) {
        storedMsg = await db.addMessage({
          conversationId,
          channel: 'instagram',
          senderId: 'bot',
          senderName: 'Dream Hair & Beauty (AI)',
          messageText: text,
          direction: 'outbound',
          messageType: 'text',
          status: 'ai_replied',
          isDemo: true
        });
      }

      await db.logAudit(
        'MESSAGE_SENT_SIMULATED',
        `Simulated DM sent to @${recipientId}: "${text.slice(0, 50)}"`
      );

      return {
        success: true,
        messageId: storedMsg?.id || `sim_${Date.now()}`,
        isSimulated: true,
        endpointUsed: targetEndpoint
      };
    }

    // ==========================================
    // REAL INSTAGRAM MODE — STRICT VALIDATION & ERROR REPORTING
    // ==========================================

    // Requirement 6: Do not send the Instagram Business Account ID as the recipient ID
    if (this.businessAccountId && recipientId === this.businessAccountId) {
      const errorMsg = `Recipient ID (${recipientId}) cannot be your own Instagram Business Account ID. The recipient must be the customer's Instagram user ID.`;
      if (conversationId) {
        await db.addMessage({
          conversationId,
          channel: 'instagram',
          senderId: 'bot',
          senderName: 'Dream Hair & Beauty (AI)',
          messageText: text,
          direction: 'outbound',
          messageType: 'text',
          status: 'failed',
          errorMessage: errorMsg,
          isDemo: false
        });
      }

      await db.logAudit('META_API_ERROR', errorMsg);
      return {
        success: false,
        error: errorMsg,
        isSimulated: false,
        endpointUsed: targetEndpoint
      };
    }

    // 1. Verify Meta API Version is configured
    if (!apiVersion) {
      const errorMsg = 'Meta API version is not configured. Please set the META_API_VERSION environment variable.';
      if (conversationId) {
        await db.addMessage({
          conversationId,
          channel: 'instagram',
          senderId: 'bot',
          senderName: 'Dream Hair & Beauty (AI)',
          messageText: text,
          direction: 'outbound',
          messageType: 'text',
          status: 'failed',
          errorMessage: errorMsg,
          isDemo: false
        });
      }

      await db.logAudit(
        'META_API_ERROR',
        `Cannot dispatch Instagram DM to ${recipientId}: Meta API version is not configured.`
      );

      return {
        success: false,
        error: errorMsg,
        isSimulated: false,
        endpointUsed: targetEndpoint
      };
    }

    // 2. Verify Instagram Access Token is configured
    if (!token) {
      const errorMsg = 'Instagram Access Token is not configured. Please set INSTAGRAM_ACCESS_TOKEN in environment variables.';
      if (conversationId) {
        await db.addMessage({
          conversationId,
          channel: 'instagram',
          senderId: 'bot',
          senderName: 'Dream Hair & Beauty (AI)',
          messageText: text,
          direction: 'outbound',
          messageType: 'text',
          status: 'failed',
          errorMessage: errorMsg,
          isDemo: false
        });
      }

      await db.logAudit(
        'META_API_ERROR',
        `Cannot dispatch live Instagram DM to ${recipientId}: INSTAGRAM_ACCESS_TOKEN is not configured.`
      );

      return {
        success: false,
        error: errorMsg,
        isSimulated: false,
        endpointUsed: targetEndpoint
      };
    }

    // 3. Dispatch Live Request using correct host and endpoints for Instagram Send API
    const candidateEndpoints = [
      `https://graph.instagram.com/${apiVersion}/me/messages`,
      `https://graph.instagram.com/${apiVersion}/${this.businessAccountId}/messages`,
      `https://graph.facebook.com/${apiVersion}/${this.businessAccountId}/messages`
    ];

    let lastErrorMsg = '';
    let lastEndpointUsed = targetEndpoint;

    for (const endpoint of candidateEndpoints) {
      lastEndpointUsed = endpoint;
      try {
        const payload = {
          recipient: { id: recipientId },
          message: { text }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data: any = await response.json();

        // Requirement 12: Only mark as successful when Meta returns a successful response containing a message ID
        if (response.ok && data?.message_id) {
          const externalMessageId = data.message_id;

          let storedMsg: Message | null = null;
          if (conversationId) {
            storedMsg = await db.addMessage({
              conversationId,
              channel: 'instagram',
              externalMessageId,
              senderId: 'bot',
              senderName: 'Dream Hair & Beauty (AI)',
              messageText: text,
              direction: 'outbound',
              messageType: 'text',
              status: 'ai_replied',
              isDemo: false
            });
          }

          await db.logAudit(
            'MESSAGE_SENT_LIVE',
            `Live message delivered to recipient ${recipientId} via ${endpoint}. Meta Message ID: ${externalMessageId}`
          );

          return {
            success: true,
            messageId: storedMsg?.id || externalMessageId,
            isSimulated: false,
            endpointUsed: endpoint
          };
        }

        const errorObj = data?.error;
        const rawError = errorObj?.message || `Instagram API request failed with HTTP ${response.status}`;
        lastErrorMsg = this.sanitizeErrorMessage(rawError);
        console.warn(`[Instagram API Send Error - ${endpoint}]:`, lastErrorMsg);

        // If graph.instagram.com returned an IGApiException (e.g. user not found, messaging window, rate limit),
        // or a client error (HTTP 400/403/404), the token was received and evaluated by the Instagram API;
        // stop here to preserve the authentic Instagram Graph API error.
        if (errorObj?.type === 'IGApiException' || errorObj?.error_subcode || response.status === 400 || response.status === 403) {
          break;
        }
      } catch (err: any) {
        lastErrorMsg = this.sanitizeErrorMessage(err?.message || String(err));
        console.warn(`[Instagram Service Network Exception - ${endpoint}]:`, lastErrorMsg);
      }
    }

    // All endpoints failed
    if (conversationId) {
      await db.addMessage({
        conversationId,
        channel: 'instagram',
        senderId: 'bot',
        senderName: 'Dream Hair & Beauty (AI)',
        messageText: text,
        direction: 'outbound',
        messageType: 'text',
        status: 'failed',
        errorMessage: lastErrorMsg,
        isDemo: false
      });
    }

    await db.logAudit(
      'META_API_ERROR',
      `Failed sending live DM to ${recipientId} via ${lastEndpointUsed}: ${lastErrorMsg}`
    );

    return {
      success: false,
      error: lastErrorMsg,
      isSimulated: false,
      endpointUsed: lastEndpointUsed
    };
  }

  /**
   * Section 25: Friendly human-readable error handler for Meta API exceptions
   */
  public handleInstagramError(err: any): string {
    const message = err?.message || String(err);
    if (message.includes('190') || message.includes('OAuthException') || message.includes('Session')) {
      return 'Instagram connection expired or invalid. Please reconnect your Instagram account in the Connection tab.';
    }
    if (message.includes('Rate limit') || message.includes('request limit')) {
      return 'Meta API rate limit reached. Messages will be queued automatically.';
    }
    if (message.includes('permission') || message.includes('instagram_business_manage_messages') || message.includes('instagram_manage_messages')) {
      return 'Missing required Instagram messaging permissions. Please verify app permissions in Meta Developer settings.';
    }
    if (message.includes('user cannot be found') || message.includes('2534014')) {
      return 'Instagram recipient user not found or recipient has not messaged the business account within the allowed 24-hour window.';
    }
    return `Instagram API Error: ${this.sanitizeErrorMessage(message)}`;
  }
}

export const instagramService = new InstagramService();
