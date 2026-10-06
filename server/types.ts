export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'received' | 'processing' | 'ai_replied' | 'human_replied' | 'sent' | 'failed';
export type ConversationMode = 'ai' | 'human';
export type ActionType = 'knowledge' | 'location' | 'appointment' | 'contact' | 'custom_response';
export type ResponseStyle = 'professional' | 'friendly' | 'short' | 'detailed';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface InstagramAccount {
  id: string;
  userId: string;
  instagramUserId: string;
  username: string;
  name: string;
  profilePictureUrl?: string;
  businessAccountId: string;
  pageId?: string;
  status: 'connected' | 'disconnected' | 'token_expired';
  connectedAt: string;
  tokenExpiresAt?: string;
  tokenStatus: 'valid' | 'expiring_soon' | 'expired' | 'unconfigured';
  isSimulated?: boolean;
}

export interface WhatsAppAccount {
  id: string;
  userId: string;
  businessAccountId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName?: string;
  status: 'not_connected' | 'connected' | 'webhook_active' | 'connection_error';
  webhookStatus: 'unverified' | 'verified' | 'error';
  connectionStatus?: 'CONNECTED' | 'NOT CONNECTED';
  metaVerified?: boolean;
  connectedAt?: string;
  lastWebhookAt?: string;
  lastError?: string;
  isSimulated?: boolean;
}

export interface WhatsAppSettings {
  id: string;
  enabled: boolean;
  autoReply: boolean;
  humanTakeover: boolean;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  channel?: 'instagram' | 'whatsapp';
  instagramUserId?: string;
  whatsAppCustomerId?: string;
  customerPhone?: string;
  username: string;
  customerName?: string;
  status: 'active' | 'archived';
  mode: ConversationMode;
  humanTakeoverReason?: string;
  unreadCount: number;
  lastMessageSnippet: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;

  // Requirement 3 & 6: Persistent Conversation State & Context Memory
  currentTopic?: string;
  currentIntent?: string;
  pendingQuestion?: 'HAIR_CUT_GENDER' | 'HAIR_SPA_GENDER' | 'TREATMENT_SELECTION' | 'APPOINTMENT_DATE_OR_TIME' | 'APPOINTMENT_DATE' | 'APPOINTMENT_TIME' | 'SERVICE_CLARIFICATION' | 'GENERAL_QUESTION' | 'GENDER_CLARIFICATION' | 'SERVICE_SELECTION' | string;
  selectedService?: string;
  gender?: 'gents' | 'ladies' | 'kids' | 'unspecified';
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentState?: 'none' | 'requesting' | 'date_provided' | 'time_provided' | 'details_noted';
  lastActivityAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  channel?: 'instagram' | 'whatsapp';
  externalMessageId?: string;
  external_message_id?: string;
  instagramMessageId?: string;
  customerPhone?: string;
  customer_phone?: string;
  senderId: string;
  senderName: string;
  senderType?: 'customer' | 'ai' | 'human' | string;
  messageText: string;
  direction: MessageDirection;
  messageType: 'text' | 'quick_reply' | 'system';
  status: MessageStatus;
  errorMessage?: string;
  isDemo?: boolean;
  createdAt: string;
  timestamp?: string;
}

export interface AiSettings {
  id: string;
  enabled: boolean;
  responseStyle: ResponseStyle;
  customInstructions: string;
  temperature: number;
  maxTokens: number;
  autoHumanKeywords: string[];
  updatedAt: string;
}

export interface ServicePriceItem {
  id?: string;
  service: string;
  category?: string;
  brand?: string;
  gender?: 'gents' | 'ladies' | 'kids' | 'unisex' | 'all' | string;
  hairLength?: string;
  price: string;
  description?: string;
  aliases?: string[];
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessKnowledge {
  id: string;
  // Category 3: Salon Information
  businessName: string;
  businessDescription: string;
  location: string;
  phoneNumber: string;
  openingHours: string;
  salonInfo?: string;

  // Category 1: Services & Prices
  services: string[];
  servicePrices: ServicePriceItem[];

  // Category 2: Offers & Combos
  specialOffers: string;
  offersAndCombos?: string;

  // Category 4: Service Details
  serviceDetails?: Array<{ service: string; details: string; duration?: string; recommendedFor?: string }>;

  // Category 5: Policies
  bookingInformation: string;
  paymentInformation: string;
  policies?: string;
  additionalInformation: string;

  // Category 6: FAQ
  faqs: Array<{ question: string; answer: string }>;

  // Category 7: Human Handoff Instructions
  humanHandoffInstructions?: string;

  // Category 8: Custom Knowledge
  customKnowledge?: Array<{ topic: string; information: string }>;

  updatedAt: string;
}

export interface ReplyRule {
  id: string;
  keyword: string;
  matchType: 'exact' | 'contains';
  actionType: ActionType;
  customResponse?: string;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  externalEventId: string;
  externalMessageId?: string;
  eventType: string;
  payloadSummary: string;
  processedAt: string;
  status: 'processed' | 'skipped_duplicate' | 'error';
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  ip?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface TokenHealthCheckResult {
  tokenConfigured: 'YES' | 'NO';
  authentication: 'VALID' | 'INVALID';
  instagramAccount: 'connected' | 'not connected';
  apiVersion: string;
  apiEndpoint: string;
  accountUsername?: string;
  accountId?: string;
  error?: string;
}

export interface DatabaseSchema {
  users: User[];
  instagramAccount: InstagramAccount;
  whatsAppAccount?: WhatsAppAccount;
  whatsAppSettings?: WhatsAppSettings;
  conversations: Conversation[];
  messages: Message[];
  aiSettings: AiSettings;
  businessKnowledge: BusinessKnowledge;
  replyRules: ReplyRule[];
  webhookEvents: WebhookEvent[];
  auditLogs: AuditLog[];
  sessions: Session[];
}
