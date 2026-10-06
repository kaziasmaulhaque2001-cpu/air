import React, { useState, useEffect } from 'react';
import {
  Layers,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  FileCode,
  Info
} from 'lucide-react';
import { MetaSetupData, UrlStatusCheck } from '../types';
import { api } from '../api/client';

export const MetaSetupPage: React.FC = () => {
  const [setupData, setSetupData] = useState<MetaSetupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showVerifyToken, setShowVerifyToken] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMetaSetup();
      setSetupData(data);
    } catch (err) {
      console.error('Failed loading meta setup:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleValidateAll = async () => {
    setIsValidating(true);
    try {
      await api.validateUrls();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading || !setupData) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
        Detecting live production origin & generating Meta URLs...
      </div>
    );
  }

  const { urls, validations, permissions, verifyTokenValue, apiVersion } = setupData;

  const steps = [
    {
      step: 1,
      name: 'Production URL',
      key: 'baseUrl',
      url: urls.baseUrl,
      metaDestination: 'Meta App Dashboard → App Settings → Basic → App Domains & Site URL',
      description: 'The root domain of your hosted application. Used for app domain whitelisting.',
      isEndpoint: false
    },
    {
      step: 2,
      name: 'OAuth Redirect URI',
      key: 'oauthRedirectUri',
      url: urls.oauthRedirectUri,
      metaDestination: 'Instagram / Facebook Login → Settings → Valid OAuth Redirect URIs',
      description: 'Where Meta redirects customers or admins after authorizing permissions.',
      isEndpoint: true
    },
    {
      step: 3,
      name: 'Instagram Webhook Callback URL',
      key: 'webhookUrl',
      url: urls.webhookUrl,
      metaDestination: 'Webhooks → Select "Instagram" → Edit Subscription → Callback URL',
      description: 'Meta pushes real-time Instagram DM events to this secure webhook endpoint.',
      isEndpoint: true
    },
    {
      step: 4,
      name: 'Privacy Policy URL',
      key: 'privacyPolicyUrl',
      url: urls.privacyPolicyUrl,
      metaDestination: 'App Settings → Basic → Privacy Policy URL',
      description: 'Public legal policy detailing message handling, AI processing, and user data rights.',
      isEndpoint: true
    },
    {
      step: 5,
      name: 'Terms of Service URL',
      key: 'termsUrl',
      url: urls.termsUrl,
      metaDestination: 'App Settings → Basic → Terms of Service URL',
      description: 'Public terms governing app usage and Instagram DM automation.',
      isEndpoint: true
    },
    {
      step: 6,
      name: 'User Data Deletion Callback URL',
      key: 'dataDeletionUrl',
      url: urls.dataDeletionUrl,
      metaDestination: 'App Settings → Basic → User Data Deletion → Data Deletion Request URL',
      description: 'Complies with Meta privacy regulations for user data deletion callbacks.',
      isEndpoint: true
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Meta Developer Setup Guide</h2>
            </div>
            <p className="text-xs text-slate-500">
              Live production origin automatically detected. Copy and paste these endpoints into your Meta App Dashboard.
            </p>
          </div>

          <button
            onClick={handleValidateAll}
            disabled={isValidating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Checking...' : 'Re-check Endpoints'}</span>
          </button>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-semibold">Auto-Detected Production Origin:</span>
            <span className="font-mono text-indigo-700 font-bold">{urls.baseUrl}</span>
          </div>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active & Responsive</span>
          </span>
        </div>
      </div>

      {/* Webhook Verify Token Card */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Webhook Verification Secret (Verify Token)
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
            Required by Meta
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          When configuring the Instagram webhook inside Meta Developer settings, Meta will ask for a
          <strong>Verify Token</strong>. Enter the exact string below:
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 p-2.5 rounded-xl bg-white border border-purple-200 font-mono text-xs text-slate-800 font-bold overflow-x-auto">
            {showVerifyToken ? verifyTokenValue : '••••••••••••••••••••••••••••••••'}
          </div>

          <button
            type="button"
            onClick={() => setShowVerifyToken(!showVerifyToken)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shrink-0"
          >
            {showVerifyToken ? 'Hide' : 'Reveal'}
          </button>

          <button
            type="button"
            onClick={() => handleCopy(verifyTokenValue, 'verifyToken')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition-colors shrink-0"
          >
            {copiedKey === 'verifyToken' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Token</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step by Step URLs list (Sections 4, 5, 31) */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Step-by-Step Meta URL Setup</h3>

        {steps.map(item => {
          const isCopied = copiedKey === item.key;
          return (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {item.step}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Ready</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500">{item.description}</p>

              {/* Where to paste */}
              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900">
                <span className="font-bold">Where to enter in Meta Dashboard:</span> {item.metaDestination}
              </div>

              {/* URL Box & Action Buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={item.url}
                  className="flex-1 p-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 select-all focus:outline-none"
                />

                <button
                  onClick={() => handleCopy(item.url, item.key)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 7: Meta Permissions Reference (Section 32) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">
              STEP 7: Required Instagram Graph API Permissions ({apiVersion || 'Meta API version is not configured'})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            {apiVersion && apiVersion !== 'Meta API version is not configured' ? `Meta ${apiVersion}` : 'Meta API not configured'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Request these permissions in Meta App Review (App Dashboard → App Review → Permissions and Features)
          to enable live DM automation for public customers:
        </p>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {permissions.map((p, i) => (
            <div key={i} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-slate-900 block text-xs">
                  {p.name}
                </span>
                <span className="text-slate-500 text-[11px]">{p.description}</span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  p.reviewRequired
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
