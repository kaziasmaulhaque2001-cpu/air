import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  User,
  Bot,
  Send,
  Sparkles,
  Phone,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { Conversation, Message, WhatsAppAccount } from '../types';
import { api } from '../api/client';
import { formatMessageDate } from '../utils/dateFormatter';

interface WhatsAppChatsPageProps {
  onOpenSimulator?: () => void;
}

export const WhatsAppChatsPage: React.FC<WhatsAppChatsPageProps> = ({ onOpenSimulator }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'real' | 'all' | 'demo' | 'unread' | 'ai' | 'human'>('real');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [triggeringAi, setTriggeringAi] = useState(false);

  // Real Meta API connection status
  const [waAccount, setWaAccount] = useState<WhatsAppAccount | null>(null);
  const [isMetaConnected, setIsMetaConnected] = useState<boolean>(false);
  const [connectionCheckLoading, setConnectionCheckLoading] = useState<boolean>(false);

  const checkConnectionStatus = async () => {
    try {
      setConnectionCheckLoading(true);
      const res = await api.getWhatsAppStatus();
      setWaAccount(res.account);
      const isConnected = res.account?.connectionStatus === 'CONNECTED' || (res.metaCheck && res.metaCheck.status === 'CONNECTED');
      setIsMetaConnected(Boolean(isConnected));
    } catch (err) {
      setIsMetaConnected(false);
    } finally {
      setConnectionCheckLoading(false);
    }
  };

  const fetchConversations = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await api.getConversations({
        channel: 'whatsapp',
        filter,
        search: searchTerm
      });
      const convList = res.conversations || [];
      setConversations(convList);

      if (convList.length > 0) {
        if (!selectedConvId || !convList.some(c => c.id === selectedConvId)) {
          setSelectedConvId(convList[0].id);
        }
      } else {
        setSelectedConvId(null);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp conversations', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadConversationDetails = async (convId: string, showSpinner = false) => {
    if (!convId) return;
    try {
      const res = await api.getConversation(convId);
      setSelectedConv(res.conversation);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load conversation details', err);
    }
  };

  // Initial load
  useEffect(() => {
    checkConnectionStatus();
    fetchConversations(true);
  }, []);

  // When filter or search term changes
  useEffect(() => {
    fetchConversations(true);
  }, [filter, searchTerm]);

  // When active conversation ID changes
  useEffect(() => {
    if (!selectedConvId) {
      setSelectedConv(null);
      setMessages([]);
      return;
    }
    loadConversationDetails(selectedConvId, true);
  }, [selectedConvId]);

  // Real-time update listeners: SSE + periodic 3-second safe polling
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/whatsapp/events');
      eventSource.onmessage = (event) => {
        // Immediate realtime response when webhook saves message
        fetchConversations(false);
        if (selectedConvId) {
          loadConversationDetails(selectedConvId, false);
        }
      };
    } catch (e) {
      // EventSource fallback handled by polling
    }

    const pollTimer = setInterval(() => {
      fetchConversations(false);
      if (selectedConvId) {
        loadConversationDetails(selectedConvId, false);
      }
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedConvId, filter, searchTerm]);

  const handleManualRefresh = async () => {
    await Promise.all([
      checkConnectionStatus(),
      fetchConversations(true),
      selectedConvId ? loadConversationDetails(selectedConvId, true) : Promise.resolve()
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId) return;

    setSending(true);
    try {
      await api.sendMessage(selectedConvId, replyText.trim());
      setReplyText('');
      await loadConversationDetails(selectedConvId, false);
      fetchConversations(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleToggleMode = async () => {
    if (!selectedConv) return;
    const newMode = selectedConv.mode === 'ai' ? 'human' : 'ai';
    try {
      await api.updateConversationMode(selectedConv.id, newMode);
      setSelectedConv(prev => (prev ? { ...prev, mode: newMode } : null));
      fetchConversations(false);
    } catch (err: any) {
      alert(err.message || 'Failed to switch mode');
    }
  };

  const handleTriggerAi = async () => {
    if (!selectedConvId) return;
    setTriggeringAi(true);
    try {
      const res = await api.triggerAiReply(selectedConvId);
      if (res.replyText) {
        await loadConversationDetails(selectedConvId, false);
        fetchConversations(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger AI reply');
    } finally {
      setTriggeringAi(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-4">
      {/* Top Bar with Clear CONNECTED / NOT CONNECTED Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">WhatsApp Inbox &amp; Live Chats</h1>
              {/* REAL Meta API Status Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-2xs ${
                  isMetaConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
                title="Verified via direct Meta Graph API check (not simulator)"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMetaConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span>WhatsApp: {isMetaConnected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time customer messages via WhatsApp Cloud API backed by shared Gemini AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={loading || connectionCheckLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition flex items-center gap-1.5 text-xs font-medium"
            title="Refresh Chats & Connection Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading || connectionCheckLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {onOpenSimulator && (
            <button
              onClick={onOpenSimulator}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left List: Conversations */}
        <div className="md:col-span-5 lg:col-span-4 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-xs overflow-hidden">
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search phone or customer name..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Filter Pills with Real / Demo Separation */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {[
                { id: 'real', label: 'Real WhatsApp', badge: 'Live' },
                { id: 'all', label: 'All Chats' },
                { id: 'demo', label: 'Simulated / Demo', badge: 'Demo' },
                { id: 'unread', label: 'Unread' },
                { id: 'ai', label: 'AI Active' },
                { id: 'human', label: 'Staff Mode' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1 ${
                    filter === tab.id
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No WhatsApp conversations found.</p>
                <p className="text-[11px] text-slate-400">
                  {filter === 'real'
                    ? 'No real customer messages received yet from Meta webhook.'
                    : filter === 'demo'
                    ? 'No simulator conversations created yet.'
                    : 'Send a message to your WhatsApp number or run the simulator.'}
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = conv.id === selectedConvId;
                const isHumanMode = conv.mode === 'human';
                const isRealCustomer = !conv.isDemo;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3 cursor-pointer transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isRealCustomer
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-purple-100 text-purple-800 border border-purple-300'
                      }`}
                    >
                      {conv.customerName?.[0] || <User className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {conv.customerName || conv.whatsAppCustomerId || conv.username}
                        </span>
                        {/* Validated timestamp rendering: Today → time only, Yesterday → Yesterday + time, Older → date + time */}
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatMessageDate(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-500 text-[11px] truncate mt-0.5">
                        {conv.lastMessageSnippet || 'No messages yet'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {/* Real vs Simulator clear badge */}
                        {isRealCustomer ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Real WhatsApp</span>
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span>Simulated</span>
                          </span>
                        )}

                        {/* AI / Staff Mode badge */}
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-1 ${
                            isHumanMode
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isHumanMode ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                          <span>{isHumanMode ? 'Staff Mode' : 'AI Active'}</span>
                        </span>

                        {conv.unreadCount > 0 && (
                          <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-auto">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Timeline */}
        <div className="md:col-span-7 lg:col-span-8 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-xs overflow-hidden">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                      !selectedConv.isDemo ? 'bg-emerald-600' : 'bg-purple-600'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span>{selectedConv.customerName || selectedConv.whatsAppCustomerId}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {selectedConv.whatsAppCustomerId}
                      </span>
                      {selectedConv.isDemo ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          Demo Mode
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Live Customer
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>Channel: WhatsApp Business</span>
                      <span>•</span>
                      <span>Status: {selectedConv.mode === 'human' ? 'Staff Takeover' : 'Gemini AI Handling'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMode}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                      selectedConv.mode === 'human'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {selectedConv.mode === 'human' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    <span>{selectedConv.mode === 'human' ? 'Switch to AI' : 'Take Over Chat'}</span>
                  </button>

                  <button
                    onClick={handleTriggerAi}
                    disabled={triggeringAi}
                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-slate-600 transition"
                    title="Trigger AI Auto-Reply"
                  >
                    <Sparkles className={`w-4 h-4 ${triggeringAi ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Chat Messages Feed with Strict Timestamp Formatting */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-12 text-xs">
                    No messages yet in this WhatsApp chat.
                  </div>
                ) : (
                  messages.map(msg => {
                    const isInbound = msg.direction === 'inbound';
                    const isBot = msg.senderType === 'ai' || msg.senderId === 'bot' || msg.status === 'ai_replied' || msg.status === 'sent';
                    const formattedDate = formatMessageDate(msg.createdAt || msg.timestamp) || 'Just now';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 text-xs shadow-2xs leading-relaxed ${
                            isInbound
                              ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                              : isBot
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-slate-900 text-white rounded-br-xs'
                          }`}
                        >
                          <div className="text-[10px] font-semibold opacity-75 mb-1 flex items-center gap-1">
                            {isInbound ? (
                              <span>Customer</span>
                            ) : isBot ? (
                              <>
                                <Bot className="w-2.5 h-2.5" />
                                <span>Gemini AI Auto-Reply</span>
                              </>
                            ) : (
                              <>
                                <User className="w-2.5 h-2.5" />
                                <span>Salon Staff</span>
                              </>
                            )}
                          </div>

                          <div className="whitespace-pre-wrap">{msg.messageText}</div>

                          {/* Guaranteed Valid Timestamp & Clear Delivery Status */}
                          <div className="text-[9px] opacity-75 text-right mt-1.5 font-sans flex items-center justify-end gap-1.5">
                            <span>{formattedDate}</span>
                            {!isInbound && (
                              msg.status === 'sent' ? (
                                <span className="font-bold text-emerald-100" title="Delivered via Meta WhatsApp Cloud API">✓✓ Sent</span>
                              ) : msg.status === 'failed' ? (
                                <span className="font-bold text-rose-200" title={msg.errorMessage || msg.error_message || 'Outbound send rejected by Meta'}>⚠️ Failed</span>
                              ) : null
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type a message as staff to send to customer on WhatsApp..."
                  className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 space-y-2">
              <Phone className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Select a WhatsApp chat to view conversation</p>
              <p className="text-[11px] text-slate-400">Manage real-time customer queries with unified Gemini responses.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
