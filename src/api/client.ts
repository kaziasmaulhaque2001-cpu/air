import {
  Conversation,
  Message,
  InstagramAccount,
  WhatsAppAccount,
  WhatsAppSettings,
  AiSettings,
  BusinessKnowledge,
  ReplyRule,
  MetaSetupData,
  DashboardStats,
  AuditLog,
  User,
  TokenHealthCheckResult,
  InstagramStatusResponse
} from '../types';

let authToken: string | null = localStorage.getItem('auth_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed with status ' + res.status }));
    throw new Error(errorData.error || errorData.message || 'API request error');
  }

  return res.json();
}

export const api = {
  // Auth
  async login(email: string, pass: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    setToken(data.token);
    return data;
  },

  async demoLogin(): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/api/auth/demo-login', {
      method: 'POST'
    });
    setToken(data.token);
    return data;
  },

  async getMe(): Promise<{ authenticated: boolean; user: User | null }> {
    return request<{ authenticated: boolean; user: User | null }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
    }
  },

  // Instagram Connection
  async getInstagramStatus(): Promise<{
    account: InstagramAccount;
    stats: DashboardStats;
    envStatus: {
      hasMetaAppId: boolean;
      hasMetaSecret: boolean;
      hasToken: boolean;
      hasAccountId: boolean;
      hasVerifyToken: boolean;
      hasAiKey: boolean;
      apiVersion: string;
    };
  }> {
    return request('/api/instagram/status');
  },

  async connectInstagram(data?: { username?: string; businessAccountId?: string; simulated?: boolean }): Promise<{
    success?: boolean;
    redirectUrl?: string;
    account?: InstagramAccount;
  }> {
    return request('/api/instagram/connect', {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },

  async disconnectInstagram(): Promise<{ success: boolean; account: InstagramAccount }> {
    return request('/api/instagram/disconnect', { method: 'POST' });
  },

  async checkTokenHealth(): Promise<TokenHealthCheckResult> {
    return request('/api/instagram/health-check', { method: 'POST' });
  },

  async testOutboundReply(recipientId: string, testText?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    endpointUsed: string;
  }> {
    return request('/api/instagram/test-reply', {
      method: 'POST',
      body: JSON.stringify({ recipientId, testText })
    });
  },

  // Conversations
  async getConversations(params?: { filter?: string; search?: string; channel?: string }): Promise<{ conversations: Conversation[] }> {
    const query = new URLSearchParams();
    if (params?.filter) query.set('filter', params.filter);
    if (params?.search) query.set('search', params.search);
    if (params?.channel) query.set('channel', params.channel);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/conversations${qs}`);
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    return request(`/api/conversations/${id}`);
  },

  async sendMessage(conversationId: string, messageText: string): Promise<{ success: boolean; message: Message; error?: string }> {
    return request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messageText })
    });
  },

  async takeoverConversation(id: string): Promise<{ success: boolean; conversation: Conversation }> {
    return request(`/api/conversations/${id}/takeover`, { method: 'POST' });
  },

  async returnToAi(id: string): Promise<{ success: boolean; conversation: Conversation }> {
    return request(`/api/conversations/${id}/return-to-ai`, { method: 'POST' });
  },

  async updateConversationMode(id: string, mode: 'ai' | 'human'): Promise<{ success: boolean; conversation: Conversation }> {
    return mode === 'human' ? this.takeoverConversation(id) : this.returnToAi(id);
  },

  async triggerAiReply(conversationId: string): Promise<{ success: boolean; replyText?: string; error?: string; reason?: string }> {
    return request(`/api/conversations/${conversationId}/trigger-ai`, { method: 'POST' });
  },

  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    return request(`/api/conversations/${conversationId}/read`, { method: 'POST' });
  },

  // AI Settings
  async getAiSettings(): Promise<{ settings: AiSettings }> {
    return request('/api/settings/ai');
  },

  async updateAiSettings(settings: Partial<AiSettings>): Promise<{ settings: AiSettings }> {
    return request('/api/settings/ai', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  // Business Knowledge
  async getBusinessKnowledge(): Promise<{ knowledge: BusinessKnowledge }> {
    return request('/api/business-knowledge');
  },

  async updateBusinessKnowledge(knowledge: Partial<BusinessKnowledge>): Promise<{ knowledge: BusinessKnowledge }> {
    return request('/api/business-knowledge', {
      method: 'PUT',
      body: JSON.stringify(knowledge)
    });
  },

  // Services & Prices CRUD (Requirements 2, 3, 4, 7)
  async getServices(): Promise<{ services: any[] }> {
    return request('/api/business-knowledge/services');
  },

  async addService(service: any): Promise<{ success: boolean; service: any; knowledge: BusinessKnowledge }> {
    return request('/api/business-knowledge/services', {
      method: 'POST',
      body: JSON.stringify(service)
    });
  },

  async updateService(id: string, service: any): Promise<{ success: boolean; service: any; knowledge: BusinessKnowledge }> {
    return request(`/api/business-knowledge/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(service)
    });
  },

  async deleteService(id: string): Promise<{ success: boolean; knowledge: BusinessKnowledge }> {
    return request(`/api/business-knowledge/services/${id}`, {
      method: 'DELETE'
    });
  },

  async toggleService(id: string): Promise<{ success: boolean; service: any; knowledge: BusinessKnowledge }> {
    return request(`/api/business-knowledge/services/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  // Reply Rules
  async getReplyRules(): Promise<{ rules: ReplyRule[] }> {
    return request('/api/reply-rules');
  },

  async addReplyRule(rule: Partial<ReplyRule>): Promise<{ rule: ReplyRule }> {
    return request('/api/reply-rules', {
      method: 'POST',
      body: JSON.stringify(rule)
    });
  },

  async updateReplyRule(id: string, rule: Partial<ReplyRule>): Promise<{ rule: ReplyRule }> {
    return request(`/api/reply-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule)
    });
  },

  async deleteReplyRule(id: string): Promise<{ success: boolean }> {
    return request(`/api/reply-rules/${id}`, { method: 'DELETE' });
  },

  // Meta Setup
  async getMetaSetup(): Promise<MetaSetupData> {
    return request('/api/meta/setup');
  },

  async validateUrls(): Promise<{ validations: any[] }> {
    return request('/api/meta/validate-urls', { method: 'POST' });
  },

  // Simulation & Dev
  async simulateMessage(data: { username: string; messageText: string; customerName?: string }): Promise<{
    conversation: Conversation;
    inboundMessage: Message;
    outboundMessage?: Message;
    aiResult: any;
  }> {
    return request('/api/dev/simulate-message', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    return request('/api/dev/reset-demo', { method: 'POST' });
  },

  // System Settings & Logs
  async getSystemSettings(): Promise<{ environment: Record<string, boolean | string>; nodeEnv: string }> {
    return request('/api/settings/system');
  },

  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return request('/api/audit-logs');
  },

  // WhatsApp Module
  async getWhatsAppStatus(): Promise<{
    account: WhatsAppAccount;
    settings: WhatsAppSettings;
    webhookCallbackUrl: string;
    verifyToken: string;
    metaCheck?: {
      status: 'CONNECTED' | 'NOT CONNECTED';
      metaVerified: boolean;
      displayPhoneNumber?: string;
      verifiedName?: string;
      qualityRating?: string;
      accountStatus?: string;
      error?: string;
      checkedAt: string;
    };
    envStatus: {
      hasToken: boolean;
      hasPhoneId: boolean;
      hasWabaId: boolean;
      hasVerifyToken: boolean;
      apiVersion: string;
    };
  }> {
    return request('/api/whatsapp/status');
  },

  async getWhatsAppAccount(): Promise<{ account: WhatsAppAccount }> {
    return request('/api/whatsapp/account');
  },

  async updateWhatsAppAccount(account: Partial<WhatsAppAccount>): Promise<{ success: boolean; account: WhatsAppAccount }> {
    return request('/api/whatsapp/account', {
      method: 'PUT',
      body: JSON.stringify(account)
    });
  },

  async getWhatsAppSettings(): Promise<{ settings: WhatsAppSettings }> {
    return request('/api/whatsapp/settings');
  },

  async updateWhatsAppSettings(settings: Partial<WhatsAppSettings>): Promise<{ success: boolean; settings: WhatsAppSettings }> {
    return request('/api/whatsapp/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async testWhatsAppConnection(data?: { token?: string; phoneNumberId?: string }): Promise<{
    valid: boolean;
    status?: 'CONNECTED' | 'NOT CONNECTED';
    displayPhoneNumber?: string;
    verifiedName?: string;
    error?: string;
  }> {
    return request('/api/whatsapp/test-connection', {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },

  async simulateWhatsAppMessage(data: { phoneNumber: string; customerName?: string; messageText: string }): Promise<{
    conversation: Conversation;
    inboundMessage: Message;
    outboundMessage?: Message;
    aiResult: any;
  }> {
    return request('/api/whatsapp/simulate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
