import React from 'react';
import { FileText, ArrowLeft, ShieldCheck } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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
            <FileText className="w-4 h-4" />
            <span>Service Agreement</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Terms of Service</h1>
          <p className="text-xs text-slate-400 mt-1">
            Effective Date: October 5, 2026
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By connecting an Instagram Professional account to Instagram AI Auto Reply ("the Service"), you agree to abide by these Terms of Service and all applicable Meta Platform Terms and Policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Description of Service</h2>
          <p>
            The Service provides AI-assisted response generation and customer support workflow tools for Instagram Direct Messages. While the AI is strictly grounded in the business knowledge you configure, you acknowledge that automated responses require proper configuration and human oversight where appropriate.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Human Takeover & Compliance</h2>
          <p>
            The Service includes a Human Mode feature. Whenever a customer requests a human agent, or whenever an agent takes over a conversation, automated messaging halts to ensure high-quality support and compliance with consumer guidelines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Limitation of Liability</h2>
          <p>
            The Service is provided on an "as is" and "as available" basis. To the maximum extent permitted by applicable law, the Service providers are not liable for incidental, indirect, or consequential damages resulting from network interruptions or third-party API rate limits.
          </p>
        </section>
      </div>
    </div>
  );
};
