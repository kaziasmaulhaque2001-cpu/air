import React, { useState } from 'react';
import {
  X,
  Play,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Instagram,
  Phone
} from 'lucide-react';
import { api } from '../api/client';

interface DevSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationComplete: (conversationId: string, channel?: string) => void;
}

const PRESET_SCENARIOS = [
  {
    title: 'Strex Straightening (Ladies)',
    username: 'sneha_katwa',
    phone: '919876543210',
    message: 'Strex price koto?'
  },
  {
    title: 'Hair Straightening (No Gender)',
    username: 'ananya_kolkata',
    phone: '919876543211',
    message: 'Hair straightening price koto?'
  },
  {
    title: 'Hair Cut (Ask Gents/Ladies)',
    username: 'rohit_stylist',
    phone: '919876543212',
    message: 'Hair cut price?'
  },
  {
    title: 'Ladies Hair Cut',
    username: 'priya_lifestyle',
    phone: '919876543213',
    message: 'Ladies hair cut price koto?'
  },
  {
    title: 'Fruit Facial Offer',
    username: 'meera_dm',
    phone: '919876543214',
    message: 'Fruit Facial price? Offer ache?'
  },
  {
    title: 'Hair Spa (Gents)',
    username: 'rahul_katwa',
    phone: '919876543215',
    message: 'Gents Hair Spa options and price bolben?'
  },
  {
    title: 'Request Human Staff',
    username: 'vikram_roy',
    phone: '919876543216',
    message: 'I want to speak with a human staff member.'
  }
];

export const DevSimulatorModal: React.FC<DevSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulationComplete
}) => {
  const [channel, setChannel] = useState<'instagram' | 'whatsapp'>('whatsapp');
  const [username, setUsername] = useState('sneha_katwa');
  const [phone, setPhone] = useState('919876543210');
  const [customerName, setCustomerName] = useState('Sneha Roy');
  const [messageText, setMessageText] = useState('Strex price koto?');
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    if (!messageText.trim()) return;
    setIsLoading(true);
    setError(null);
    setSimulationResult(null);

    try {
      let res: any;
      if (channel === 'whatsapp') {
        res = await api.simulateWhatsAppMessage({
          phoneNumber: phone.trim(),
          customerName: customerName.trim() || undefined,
          messageText: messageText.trim()
        });
      } else {
        res = await api.simulateMessage({
          username: username.trim(),
          customerName: customerName.trim(),
          messageText: messageText.trim()
        });
      }
      setSimulationResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setUsername(preset.username);
    setPhone(preset.phone);
    setCustomerName(preset.username.replace(/_/g, ' '));
    setMessageText(preset.message);
    setSimulationResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-emerald-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight">Multi-Channel AI Simulator</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-slate-900">
                  SHARED ENGINE
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Simulate inbound customer chats across Instagram DM &amp; WhatsApp Business
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Inbound Channel:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Business</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('instagram')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  channel === 'instagram'
                    ? 'bg-pink-50 border-pink-300 text-pink-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>Instagram Direct Message</span>
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
              Quick Test Salon Scenarios:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENARIOS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {channel === 'whatsapp' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="919876543210"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instagram Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="customer_handle"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Full Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inbound Customer Message:
            </label>
            <textarea
              rows={3}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Strex price koto? / Ladies Hair Cut koto?"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trigger Button */}
          <button
            onClick={handleSimulate}
            disabled={isLoading || !messageText.trim()}
            className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition ${
              channel === 'whatsapp'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating Inbound Message & Gemini Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Simulate Inbound {channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'} DM</span>
              </>
            )}
          </button>

          {/* Simulation Output Card */}
          {simulationResult && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 space-y-0">
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pipeline Response Generated</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {simulationResult.aiResult?.processingTimeMs}ms
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* User Message */}
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800">
                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                      Customer ({channel === 'whatsapp' ? `+${phone}` : `@${username}`}):
                    </div>
                    {simulationResult.inboundMessage?.messageText}
                  </div>
                </div>

                {/* AI Outbound Reply */}
                {simulationResult.outboundMessage ? (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium">
                      <div className="text-[10px] text-emerald-700 font-bold mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Auto-Reply (Quoting Live Business Knowledge):</span>
                      </div>
                      {simulationResult.outboundMessage.messageText}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    No automated reply sent ({simulationResult.aiResult?.reason || 'Human Takeover active'}).
                  </div>
                )}
              </div>

              <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    onSimulationComplete(simulationResult.conversation.id, channel);
                    onClose();
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                >
                  <span>Open in {channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'} Inbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
