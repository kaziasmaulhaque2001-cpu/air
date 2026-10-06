import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bot,
  User,
  Send,
  Sparkles,
  UserCheck,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Phone,
  Calendar,
  MessageSquare,
  ShieldAlert,
  ChevronLeft,
  Instagram
} from 'lucide-react';
import { Conversation, Message } from '../types';
import { api } from '../api/client';
import { formatMessageDate } from '../utils/dateFormatter';

interface InboxPageProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  onRefreshConversations: () => void;
  onOpenSimulator: () => void;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  onRefreshConversations,
  onOpenSimulator
}) => {
  const [filter, setFilter] = useState<'all' | 'real' | 'unread' | 'ai' | 'human' | 'needs_reply' | 'demo'>('all');
  const [search, setSearch] = useState('');
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages]);

  // Requirement 6 & 12: Ensure ONLY Instagram conversations appear in Instagram Inbox
  const instagramOnlyConvs = conversations.filter(c => c.channel === 'instagram' || (!c.channel && !c.whatsAppCustomerId));

  // Load active conversation messages
  useEffect(() => {
    if (!selectedId) {
      if (instagramOnlyConvs.length > 0) {
        onSelectConversation(instagramOnlyConvs[0].id);
      }
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);
    setErrorMsg(null);

    api.getConversation(selectedId)
      .then(res => {
        if (isMounted) {
          setActiveMessages(res.messages || []);
          setIsLoadingMessages(false);
          // Mark conversation as read if unread
          if (res.conversation.unreadCount > 0) {
            api.markAsRead(selectedId).then(() => onRefreshConversations());
          }
        }
      })
      .catch(err => {
        if (isMounted) {
          setErrorMsg(err.message);
          setIsLoadingMessages(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId, instagramOnlyConvs.length]);

  const activeConv = instagramOnlyConvs.find(c => c.id === selectedId);

  // Filter conversations
  const filteredList = instagramOnlyConvs.filter(c => {
    const matchesSearch =
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      (c.customerName && c.customerName.toLowerCase().includes(search.toLowerCase())) ||
      c.lastMessageSnippet.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'real') return !c.isDemo;
    if (filter === 'demo') return Boolean(c.isDemo);
    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'ai') return c.mode === 'ai';
    if (filter === 'human') return c.mode === 'human';
    if (filter === 'needs_reply') return c.unreadCount > 0 || c.mode === 'human';
    return true;
  });

  // Handle human agent sending message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedId || isSending) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      const res = await api.sendMessage(selectedId, inputText.trim());
      setInputText('');
      setActiveMessages(prev => [...prev, res.message]);
      onRefreshConversations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Trigger AI to generate and send a reply right now
  const handleTriggerAiReply = async () => {
    if (!selectedId || isAiGenerating) return;
    setIsAiGenerating(true);
    setErrorMsg(null);

    try {
      const res = await api.triggerAiReply(selectedId);
      if (res.success) {
        // Refresh messages
        const updated = await api.getConversation(selectedId);
        setActiveMessages(updated.messages);
        onRefreshConversations();
      } else {
        setErrorMsg(res.reason || res.error || 'AI reply was not sent.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Human Takeover toggle
  const handleTakeover = async () => {
    if (!selectedId) return;
    try {
      await api.takeoverConversation(selectedId);
      const updated = await api.getConversation(selectedId);
      setActiveMessages(updated.messages);
      onRefreshConversations();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Return to AI toggle
  const handleReturnToAi = async () => {
    if (!selectedId) return;
    try {
      await api.returnToAi(selectedId);
      const updated = await api.getConversation(selectedId);
      setActiveMessages(updated.messages);
      onRefreshConversations();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-6.5rem)] flex rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* LEFT COLUMN: Conversation List */}
      <div
        className={`w-full lg:w-80 xl:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
          activeConv && selectedId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Header */}
        <div className="p-3.5 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-lg">Inbox</h2>
            <button
              onClick={onOpenSimulator}
              className="text-xs font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              + Simulate DM
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'real', label: 'Real DMs' },
              { id: 'unread', label: 'Unread' },
              { id: 'ai', label: 'AI' },
              { id: 'human', label: 'Human' },
              { id: 'needs_reply', label: 'Needs Reply' },
              { id: 'demo', label: 'Demo' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No conversations found.
            </div>
          ) : (
            filteredList.map(c => {
              const isSelected = c.id === selectedId;
              const isHuman = c.mode === 'human';

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  className={`p-3.5 cursor-pointer transition-colors relative flex items-start gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                    {c.username[0]?.toUpperCase() || 'U'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        @{c.username}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatMessageDate(c.lastMessageAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 truncate mb-1">
                      {c.lastMessageSnippet || 'No messages'}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isHuman
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isHuman ? (
                          <>
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>Human</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-2.5 h-2.5" />
                            <span>AI Mode</span>
                          </>
                        )}
                      </span>

                      {c.isDemo ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          DEMO
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200/80 flex items-center gap-1">
                          <Instagram className="w-2.5 h-2.5 text-pink-600" />
                          <span>Real Instagram</span>
                        </span>
                      )}

                      {c.unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                          {c.unreadCount}
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

      {/* RIGHT COLUMN: Active Chat Panel */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
          {/* Chat Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back button for mobile */}
              <button
                onClick={() => onSelectConversation('')}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800 lg:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                {activeConv.username[0]?.toUpperCase() || 'U'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    @{activeConv.username}
                  </h3>
                  {activeConv.customerName && (
                    <span className="text-xs text-slate-500 hidden sm:inline truncate">
                      ({activeConv.customerName})
                    </span>
                  )}
                  {activeConv.isDemo ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      DEMO
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1">
                      <Instagram className="w-2.5 h-2.5 text-pink-600" />
                      <span>Live Instagram DM</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Instagram User ID: {activeConv.instagramUserId}
                </p>
              </div>
            </div>

            {/* Header Actions: Take Over / Return to AI */}
            <div className="flex items-center gap-2">
              {activeConv.mode === 'ai' ? (
                <button
                  onClick={handleTakeover}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition-colors"
                  title="Pause AI and answer manually as human staff"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Take Over Conversation</span>
                  <span className="sm:hidden">Take Over</span>
                </button>
              ) : (
                <button
                  onClick={handleReturnToAi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
                  title="Resume automated AI responses for this user"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Return to AI</span>
                  <span className="sm:hidden">To AI</span>
                </button>
              )}
            </div>
          </div>

          {/* Takeover Notice Banner if Human Mode */}
          {activeConv.mode === 'human' && (
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Human Mode Active:</strong> Automatic AI replies are paused for this conversation.
                  {activeConv.humanTakeoverReason && ` (${activeConv.humanTakeoverReason})`}
                </span>
              </div>
              <button
                onClick={handleReturnToAi}
                className="text-purple-700 underline font-semibold ml-2 hover:text-purple-900 shrink-0"
              >
                Re-enable AI
              </button>
            </div>
          )}

          {/* Error Banner if any */}
          {errorMsg && (
            <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center justify-between shrink-0">
              <span className="truncate">{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="font-bold ml-2">×</button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {isLoadingMessages ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading messages...
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <p>No messages yet in this conversation.</p>
              </div>
            ) : (
              activeMessages.map(m => {
                const isInbound = m.direction === 'inbound';
                const isSystem = m.messageType === 'system';
                const isAi = m.senderId === 'bot' || m.status === 'ai_replied';
                const isHuman = m.status === 'human_replied' || (!isInbound && !isAi && !isSystem);

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-full text-[11px] bg-slate-200/70 text-slate-700 font-medium">
                        {m.messageText}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                  >
                    {/* Sender Label & Role Badge */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500">
                      <span>{isInbound ? `@${activeConv.username}` : m.senderName}</span>
                      {isAi && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700">
                          <Bot className="w-2.5 h-2.5" />
                          <span>AI REPLY</span>
                        </span>
                      )}
                      {isHuman && !isInbound && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>HUMAN AGENT</span>
                        </span>
                      )}
                      {m.isDemo ? (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 rounded">
                          DEMO
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Instagram className="w-2.5 h-2.5 text-pink-600" />
                          <span>Real DM</span>
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-md sm:max-w-lg px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isInbound
                          ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm'
                          : m.status === 'failed'
                          ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tr-sm'
                          : isAi
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
                          : 'bg-purple-700 text-white rounded-tr-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.messageText}</p>
                    </div>

                    {/* Delivery Failure Error Callout */}
                    {m.status === 'failed' && m.errorMessage && (
                      <div className="mt-1 max-w-md sm:max-w-lg p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5 shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="break-all font-mono leading-tight">{m.errorMessage}</span>
                      </div>
                    )}

                    {/* Timestamp & Status */}
                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                      <span>
                        {formatMessageDate(m.createdAt || m.timestamp) || 'Just now'}
                      </span>
                      {!isInbound && (
                        <>
                          <span>•</span>
                          <span className={`capitalize ${m.status === 'failed' ? 'text-rose-600 font-bold' : ''}`}>
                            {m.status.replace('_', ' ')}
                          </span>
                          {m.status === 'ai_replied' || m.status === 'sent' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-500 inline" />
                          ) : m.status === 'failed' ? (
                            <AlertTriangle className="w-3 h-3 text-rose-500 inline" />
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Message Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message as salon staff..."
                  className="flex-1 p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
                    title="Send message directly to customer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerAiReply}
                    disabled={isAiGenerating}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold text-xs transition-colors disabled:opacity-50"
                    title="Ask Gemini AI to generate grounded reply immediately"
                  >
                    {isAiGenerating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>AI Reply</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Press Enter to send, Shift + Enter for new line</span>
                <span>Mode: {activeConv.mode === 'human' ? 'Human Agent' : 'AI Auto Reply'}</span>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-base">Select a Conversation</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Choose an Instagram DM thread from the left or launch the simulator to test real-time AI auto-replies.
          </p>
          <button
            onClick={onOpenSimulator}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-all"
          >
            Launch DM Simulator
          </button>
        </div>
      )}
    </div>
  );
};
