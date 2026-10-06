import React from 'react';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Clock,
  Instagram,
  ArrowUpRight,
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Play
} from 'lucide-react';
import { InstagramAccount, AiSettings, Conversation, DashboardStats } from '../types';
import { formatMessageDate } from '../utils/dateFormatter';

interface DashboardPageProps {
  account: InstagramAccount | null;
  aiSettings: AiSettings | null;
  conversations: Conversation[];
  stats: DashboardStats | null;
  onNavigate: (tab: string) => void;
  onSelectConversation: (id: string) => void;
  onToggleAi: () => void;
  onOpenSimulator: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  account,
  aiSettings,
  conversations,
  stats,
  onNavigate,
  onSelectConversation,
  onToggleAi,
  onOpenSimulator
}) => {
  const isConnected = account?.status === 'connected';
  const isAiOn = aiSettings?.enabled ?? false;

  const recentList = conversations.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Action Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-pink-300 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart DM Assistant Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Instagram AI Auto Reply
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automate customer replies, bookings, and pricing inquiries 24/7 with
              Gemini 3.8 Flash, strict business knowledge grounding, and human agent takeover.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs shadow-md active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch DM Simulator</span>
            </button>
            <button
              onClick={() => onNavigate('meta-setup')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-all"
            >
              <span>Meta Setup URLs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Status & Connection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instagram Account Connection Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Instagram Connection
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  {account?.username ? `@${account.username}` : 'Not Connected'}
                </h3>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Business Account ID:</span>
              <span className="font-mono font-medium text-slate-800">
                {account?.businessAccountId || 'Unconfigured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Token Status:</span>
              <span className="font-semibold text-emerald-600">
                {account?.tokenStatus === 'valid' ? 'Active & Valid' : 'Unconfigured'}
              </span>
            </div>
            {account?.isSimulated && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                Running in <span className="font-bold">DEVELOPMENT / SIMULATED</span> mode. Real Meta API messages are sent once Meta credentials are provided.
              </div>
            )}
          </div>

          <div className="mt-5">
            <button
              onClick={() => onNavigate('instagram')}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors text-center"
            >
              Manage Instagram Account →
            </button>
          </div>
        </div>

        {/* AI Auto Reply Mode Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                  isAiOn
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600'
                    : 'bg-slate-400'
                }`}
              >
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  AI Auto Reply Mode
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  {isAiOn ? 'Active & Responding' : 'Automated Replies Paused'}
                </h3>
              </div>
            </div>

            <button
              onClick={onToggleAi}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAiOn ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isAiOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Tone & Style:</span>
              <span className="font-semibold capitalize text-slate-800">
                {aiSettings?.responseStyle || 'Friendly'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Knowledge Grounding:</span>
              <span className="font-semibold text-indigo-600">
                Dream Hair & Beauty Salon
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Human Handover Trigger:</span>
              <span className="font-medium text-slate-700">Automatic on keyword</span>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={() => onNavigate('ai')}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors text-center"
            >
              Configure AI Instructions →
            </button>
          </div>
        </div>

        {/* Business Grounding Snapshot */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xs">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Knowledge Status
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  Strict Truth Rule
                </h3>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Zero Hallucinations
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <p className="text-slate-600 leading-relaxed">
              The AI strictly enforces that pricing, working hours, and availability
              come exclusively from your Business Knowledge.
            </p>
            <div className="p-2 rounded-lg bg-slate-50 text-slate-700 font-mono text-[11px]">
              📍 Telephone Maidan, Katwa • 📞 6294748025
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={() => onNavigate('knowledge')}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors text-center"
            >
              Edit Business Services & Prices →
            </button>
          </div>
        </div>
      </div>

      {/* KPI Statistics Row (Section 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Conversations */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Chats</span>
            <MessageSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {stats?.totalConversations ?? conversations.length}
          </div>
          <p className="text-[11px] text-slate-400">All-time Instagram DMs</p>
        </div>

        {/* Today's Messages */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Msgs</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {stats?.todayMessages ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">Received today</p>
        </div>

        {/* AI Replies */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Replies</span>
            <Bot className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {stats?.aiReplies ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">Handled automatically</p>
        </div>

        {/* Human Replies */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Human Replies</span>
            <UserCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600">
            {stats?.humanReplies ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">Agent takeover handled</p>
        </div>

        {/* Unanswered Messages */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Unanswered</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {stats?.unansweredMessages ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">Requires agent reply</p>
        </div>
      </div>

      {/* Recent Conversations Table / Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Conversations</h3>
            <p className="text-xs text-slate-500">
              Live customer direct messages from Instagram
            </p>
          </div>
          <button
            onClick={() => onNavigate('inbox')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            <span>View All in Inbox</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No conversations recorded yet. Launch the DM simulator to test!
            </div>
          ) : (
            recentList.map(c => {
              const isHuman = c.mode === 'human';
              const formattedTime = formatMessageDate(c.lastMessageAt);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    onNavigate('inbox');
                  }}
                  className="px-6 py-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {c.username[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          @{c.username}
                        </span>
                        {c.customerName && c.customerName !== c.username && (
                          <span className="text-xs text-slate-500 hidden sm:inline truncate">
                            ({c.customerName})
                          </span>
                        )}
                        {c.isDemo && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-md sm:max-w-xl">
                        {c.lastMessageSnippet || 'No messages yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isHuman
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isHuman ? <UserCheck className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      <span>{isHuman ? 'Human Mode' : 'AI Active'}</span>
                    </span>

                    {/* Unread badge */}
                    {c.unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-xs animate-pulse">
                        {c.unreadCount} unread
                      </span>
                    )}

                    <span className="text-xs text-slate-400 hidden md:inline">
                      {formattedTime}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
