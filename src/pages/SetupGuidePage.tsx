import React from 'react';
import {
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  Bot,
  Instagram,
  Layers,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  PlayCircle
} from 'lucide-react';

interface SetupGuidePageProps {
  onNavigate: (tab: string) => void;
  onOpenSimulator: () => void;
}

export const SetupGuidePage: React.FC<SetupGuidePageProps> = ({
  onNavigate,
  onOpenSimulator
}) => {
  const steps = [
    {
      num: 1,
      title: 'Configure Environment Variables',
      desc: 'Ensure your server environment has META_APP_ID, META_APP_SECRET, INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID, and GEMINI_API_KEY. In AI Studio, GEMINI_API_KEY is injected automatically.',
      action: 'Check Settings',
      tab: 'settings'
    },
    {
      num: 2,
      title: 'Create or Open Meta Developer App',
      desc: 'Visit https://developers.facebook.com and create a "Business" type app. Add the "Instagram Graph API" and "Facebook Login for Business" products.',
      action: 'Open Meta Setup',
      tab: 'meta-setup'
    },
    {
      num: 3,
      title: 'Add OAuth Redirect URI',
      desc: 'In your Meta App Dashboard under Facebook Login → Settings, paste the auto-generated OAuth Redirect URI ({APP_BASE_URL}/api/instagram/callback).',
      action: 'Copy OAuth URI',
      tab: 'meta-setup'
    },
    {
      num: 4,
      title: 'Configure Instagram Webhook',
      desc: 'In Meta App Dashboard under Webhooks → Instagram, set Callback URL to {APP_BASE_URL}/api/webhooks/instagram. Enter your Webhook Verify Token and subscribe to the "messages" field.',
      action: 'View Webhook URL',
      tab: 'meta-setup'
    },
    {
      num: 5,
      title: 'Configure Required Meta Permissions',
      desc: 'Ensure your app has instagram_basic, instagram_manage_messages, pages_manage_metadata, and pages_show_list permissions enabled or requested in App Review.',
      action: 'View Permissions',
      tab: 'meta-setup'
    },
    {
      num: 6,
      title: 'Connect Your Instagram Business Account',
      desc: 'Navigate to Instagram Connection tab and click "Connect Instagram". Complete the Meta permission dialog to link your professional handle.',
      action: 'Go to Instagram Connection',
      tab: 'instagram'
    },
    {
      num: 7,
      title: 'Enable AI Auto Reply',
      desc: 'Turn the main switch to "AI ON" in the AI Auto Reply tab. Choose your preferred response tone (Friendly, Professional, Short, or Detailed).',
      action: 'Configure AI',
      tab: 'ai'
    },
    {
      num: 8,
      title: 'Add Your Business Knowledge Base',
      desc: 'Enter your business name, location, phone number, opening hours, official service prices, booking instructions, and FAQs so the AI never invents false information.',
      action: 'Edit Knowledge Base',
      tab: 'knowledge'
    },
    {
      num: 9,
      title: 'Create Custom Reply Rules',
      desc: 'Set up keyword rules for "price", "location", "appointment", and "contact" to instantly trigger deterministic actions and answers.',
      action: 'Manage Rules',
      tab: 'rules'
    },
    {
      num: 10,
      title: 'Test an Instagram DM Simulation',
      desc: 'Use the in-app Development Simulator to send simulated DMs from test customers (e.g. asking for haircuts, prices, or human staff takeover) before going live!',
      action: 'Launch Simulator',
      customAction: onOpenSimulator
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">10-Step Setup & Deployment Guide</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Follow this checklist to take your Instagram AI Auto-Reply web app from deployment to live production responses.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map(s => (
          <div
            key={s.num}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {s.num}
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{s.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (s.customAction) {
                  s.customAction();
                } else if (s.tab) {
                  onNavigate(s.tab);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold text-xs border border-slate-200/80 transition-colors shrink-0 self-end sm:self-center"
            >
              <span>{s.action}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
