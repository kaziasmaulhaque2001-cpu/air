import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Sliders,
  Zap,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { AiSettings, ResponseStyle } from '../types';
import { api } from '../api/client';

interface AiAutoReplyPageProps {
  settings: AiSettings | null;
  onUpdateSettings: (settings: AiSettings) => void;
  onOpenSimulator: () => void;
}

export const AiAutoReplyPage: React.FC<AiAutoReplyPageProps> = ({
  settings,
  onUpdateSettings,
  onOpenSimulator
}) => {
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(settings?.responseStyle ?? 'friendly');
  const [customInstructions, setCustomInstructions] = useState(
    settings?.customInstructions ??
      'You are the polite, helpful Instagram customer support staff for Dream Hair & Beauty Family Salon. Always reply in NATURAL BANGLISH (Bengali language written ONLY using English/Roman letters, NEVER Bengali script). Use English salon terms naturally (hair spa, haircut, Botox, appointment, booking, price). Keep replies short (1-2 sentences) and conversational like a real Instagram chat. Never invent prices or services not in Business Knowledge.'
  );
  const [autoKeywordsText, setAutoKeywordsText] = useState(
    (settings?.autoHumanKeywords || ['human', 'agent', 'staff', 'talk to someone', 'representative', 'real person', 'call me']).join(', ')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const keywords = autoKeywordsText
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const res = await api.updateAiSettings({
        enabled,
        responseStyle,
        customInstructions,
        autoHumanKeywords: keywords
      });

      onUpdateSettings(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Main Switch */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">AI Auto Reply Automation</h2>
            </div>
            <p className="text-xs text-slate-500">
              Control automated responses for incoming Instagram Direct Messages
            </p>
          </div>

          {/* Big ON / OFF Toggle */}
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
            <span className={`text-xs font-bold uppercase tracking-wider ${enabled ? 'text-indigo-600' : 'text-slate-400'}`}>
              {enabled ? 'AI is ON' : 'AI is OFF'}
            </span>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {enabled
              ? 'Incoming Instagram DM → AI processes message → Verified reply is sent automatically.'
              : 'AI is OFF. Messages will be saved in your Inbox for manual staff replies.'}
          </span>
          <button
            onClick={onOpenSimulator}
            className="text-indigo-600 font-semibold hover:underline shrink-0"
          >
            Test in Simulator →
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>AI Response Style & Instructions</span>
          </h3>

          {/* Response Style Radio Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Response Style:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'friendly', title: 'Friendly', desc: 'Warm, polite, natural for salon customers' },
                { id: 'professional', title: 'Professional', desc: 'Crisp, respectful, business tone' },
                { id: 'short', title: 'Short', desc: '1 to 2 lines, fast reading on mobile' },
                { id: 'detailed', title: 'Detailed', desc: 'Comprehensive explanations & context' }
              ].map(style => (
                <div
                  key={style.id}
                  onClick={() => setResponseStyle(style.id as ResponseStyle)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    responseStyle === style.id
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{style.title}</span>
                    <input
                      type="radio"
                      name="responseStyle"
                      checked={responseStyle === style.id}
                      onChange={() => setResponseStyle(style.id as ResponseStyle)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{style.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                AI Custom System Instructions:
              </label>
              <span className="text-[11px] text-slate-400">
                {customInstructions.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Provide specific instructions for how your AI assistant should represent your business..."
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Natural Banglish rule active: Always replies in Bengali written in English/Roman letters (e.g. &quot;Hi 😊 Ki vabe help korte pari?&quot;). Never outputs Bengali Unicode script.
            </p>
          </div>

          {/* Auto Human Handover Keywords */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Auto Human Handover Keywords (Comma-separated):
            </label>
            <input
              type="text"
              value={autoKeywordsText}
              onChange={e => setAutoKeywordsText(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="human, agent, staff, talk to someone, representative, real person"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              When a customer message includes any of these terms, the conversation automatically switches to <strong>Human Mode</strong> and halts AI replies.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>AI Auto Reply settings saved and applied successfully!</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save AI Settings'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 14: AI Reply Priority Order Architecture */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Execution Priority Pipeline (Section 14)</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Every incoming DM passes through these 10 deterministic steps before any reply is dispatched:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            '1. Check whether AI is enabled in settings',
            '2. Check whether conversation is in Human Mode',
            '3. Check whether customer requested a human staff member',
            '4. Check keyword-based reply rules (price, location, etc.)',
            '5. Load verified Business Knowledge',
            '6. Load recent conversation history memory',
            '7. Generate response using Gemini 3.8 Flash',
            '8. Validate safety, price accuracy & length bounds',
            '9. Send reply through Instagram Graph API',
            '10. Store message & update conversation status'
          ].map((step, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-700 flex items-center gap-2"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                {idx + 1}
              </span>
              <span className="truncate">{step.replace(/^\d+\.\s*/, '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 19: Safety & Truth Rules Checklist */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Section 19: Response Validation & Anti-Hallucination</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 text-emerald-950">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Never invents prices or services</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 text-emerald-950">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Never invents opening hours or availability</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 text-emerald-950">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Never leaks system prompts or credentials</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 text-emerald-950">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Enforces mobile DM length limits</span>
          </div>
        </div>
      </div>
    </div>
  );
};
