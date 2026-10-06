import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Legal Compliance & Meta Platform Terms</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-1">
            Last updated: October 5, 2026 • Valid for Instagram Graph API & Meta Developer Compliance
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            Instagram AI Auto Reply ("the Application") processes Direct Messages sent to the connected
            Instagram Business/Professional account through Meta Graph API Webhooks. Information collected includes:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Instagram User ID and Public Username of the sender.</li>
            <li>Direct message text content, timestamps, and message identifiers (MID).</li>
            <li>Connected Instagram business account profile details and metadata.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. How We Use and Process Data</h2>
          <p>
            The Application uses the collected data solely for the following business purposes:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Generating automated, helpful, and polite customer service replies using Google Gemini AI models.</li>
            <li>Grounding replies in verified business knowledge (such as operating hours, address, services, and official pricing).</li>
            <li>Enabling authorized human salon staff to review customer conversations and take over support when requested.</li>
            <li>Preventing duplicate message delivery via unique event ID protection.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Artificial Intelligence & Third-Party Processing</h2>
          <p>
            Inbound customer messages are transmitted via secure HTTPS server-side proxy to the Gemini AI API for text understanding and auto-reply generation. Inbound messages are evaluated against strictly enforced safety guidelines and are never used to train generalized third-party public models.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Data Storage and Security</h2>
          <p>
            All application credentials (including Meta App Secrets, Instagram Access Tokens, and AI API Keys) are stored server-side in encrypted environment configurations and are never sent to or stored in client-side browser storage. All network transmissions use TLS/HTTPS encryption.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">5. User Rights & Data Deletion</h2>
          <p>
            Under Meta Platform Terms and global privacy regulations, customers have the right to request deletion of their stored message history. Users or administrators may submit deletion requests via our Data Deletion callback endpoint (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">/api/data-deletion</code>), which purges user conversation records immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">6. Contact Information</h2>
          <p>
            For privacy inquiries or technical questions regarding data processing, contact our Data Protection Officer at:
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            Dream Hair & Beauty Family Salon • Telephone Maidan, Katwa • Phone: 6294748025
          </div>
        </section>
      </div>
    </div>
  );
};
