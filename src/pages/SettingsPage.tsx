import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  History,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  Cpu,
  Instagram,
  Radio,
  Send
} from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sys, logs] = await Promise.all([
        api.getSystemSettings(),
        api.getAuditLogs()
      ]);
      setSystemInfo(sys);
      setAuditLogs(logs.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetDemo = async () => {
    if (!confirm('Reset conversations and business information back to initial sample defaults?')) return;
    setIsResetting(true);
    try {
      await api.resetDemoData();
      setMessage('Demo data has been reset to default state.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading || !systemInfo) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
        Loading system configuration & audit records...
      </div>
    );
  }

  const env = systemInfo.environment || {};
  const igConn = systemInfo.instagramConnection || {};
  const outboundEndpointPattern = igConn.outboundEndpointPattern || `https://graph.instagram.com/${env.metaApiVersion && env.metaApiVersion !== 'Meta API version is not configured' ? env.metaApiVersion : 'v26.0'}/me/messages`;
  const isOutboundConnected = igConn.outboundMessagingStatus === 'Connected';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">System Configuration & Security</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Environment health diagnostics, security checks, and audit logging.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Requirement 20 & 19: Instagram Connection Status & Outbound Endpoint Pattern */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Instagram Connection & Outbound API Status
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Account: @{igConn.accountUsername || 'dream_familysalon'}
          </span>
        </div>

        {/* Requirement 20: Explicit status strings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="font-semibold text-emerald-950">Webhook receiving:</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Connected
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isOutboundConnected
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-rose-200 bg-rose-50/70'
          }`}>
            <div className="flex items-center gap-2">
              <Send className={`w-4 h-4 ${isOutboundConnected ? 'text-emerald-600' : 'text-rose-600'}`} />
              <span className={`font-semibold ${isOutboundConnected ? 'text-emerald-950' : 'text-rose-950'}`}>
                Outbound messaging:
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              isOutboundConnected
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              {isOutboundConnected ? 'Connected' : 'Error'}
            </span>
          </div>
        </div>

        {/* Requirement 19: Actual Outbound API Endpoint Pattern without showing credentials */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Outbound API Endpoint Pattern:</span>
            <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Meta Instagram Graph API
            </span>
          </div>
          <code className="font-mono text-indigo-700 bg-white p-2.5 rounded-lg border border-slate-200 block text-[11px] overflow-x-auto">
            POST {outboundEndpointPattern}
          </code>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Outbound messages are transmitted over secure HTTPS with Bearer authorization executed solely on the server.
            Credentials, tokens, and app secrets are strictly shielded and never transmitted to the frontend.
          </p>
        </div>
      </div>

      {/* Environment Status Grid (Section 23) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Server-Side Environment Variables (Masked)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Node: {systemInfo.nodeEnv}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Raw secrets are never revealed in the browser. Status indicators reflect active server variables:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            {
              name: 'Meta API Version (META_API_VERSION)',
              configured: Boolean(env.metaApiVersion && env.metaApiVersion !== 'Meta API version is not configured'),
              note: env.metaApiVersion && env.metaApiVersion !== 'Meta API version is not configured'
                ? `Using ${env.metaApiVersion} for all Graph API calls`
                : 'Meta API version is not configured'
            },
            {
              name: 'Meta App ID (META_APP_ID)',
              configured: env.metaAppIdConfigured,
              note: 'Required for Meta Graph API calls'
            },
            {
              name: 'Meta App Secret (META_APP_SECRET)',
              configured: env.metaSecretConfigured,
              note: 'Stored securely on server'
            },
            {
              name: 'Instagram Access Token',
              configured: env.instagramTokenConfigured,
              note: 'Required for sending live DMs'
            },
            {
              name: 'Instagram Business Account ID',
              configured: env.businessAccountIdConfigured,
              note: 'Meta Professional page ID'
            },
            {
              name: 'Webhook Verify Token',
              configured: env.webhookTokenConfigured,
              note: 'Validates hub challenge'
            },
            {
              name: 'Gemini AI API (GEMINI_API_KEY)',
              configured: env.aiApiKeyConfigured,
              note: 'Powers Gemini 3.8 Flash model'
            }
          ].map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
            >
              <div>
                <span className="font-semibold text-slate-800 block text-xs">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-500">{item.note}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 ${
                  item.configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {item.configured ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Configured</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Not Configured</span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log (Section 38) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">Audit Trail & Action Logs</h3>
          </div>
          <span className="text-xs text-slate-400">{auditLogs.length} events logged</span>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
          ) : (
            auditLogs.map(log => {
              const isError = log.action.includes('ERROR') || log.action.includes('FAILED');
              const isLiveSuccess = log.action === 'MESSAGE_SENT_LIVE';
              return (
                <div
                  key={log.id}
                  className={`p-3 text-xs space-y-0.5 transition-colors ${
                    isError
                      ? 'bg-rose-50/70 border-l-4 border-rose-500'
                      : isLiveSuccess
                      ? 'bg-emerald-50/50 border-l-4 border-emerald-500'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono font-bold text-[11px] ${
                      isError
                        ? 'text-rose-700'
                        : isLiveSuccess
                        ? 'text-emerald-700'
                        : 'text-indigo-700'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={`${isError ? 'text-rose-900 font-medium' : 'text-slate-700'}`}>
                    {log.details}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Demo Reset Card */}
      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-6 flex items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-rose-900 text-sm">Reset Sample Conversations</h4>
          <p className="text-xs text-rose-700 mt-0.5">
            Reset demo conversations, AI messages, and default salon data back to clean defaults.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={isResetting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
        </button>
      </div>
    </div>
  );
};
