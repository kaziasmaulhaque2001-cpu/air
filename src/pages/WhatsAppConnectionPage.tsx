import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Link,
  Copy,
  ExternalLink,
  RefreshCw,
  Save,
  Shield,
  Activity,
  Phone,
  Send,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { WhatsAppAccount, WhatsAppSettings } from '../types';
import { api } from '../api/client';

interface WhatsAppConnectionPageProps {
  onOpenSimulator?: () => void;
}

export const WhatsAppConnectionPage: React.FC<WhatsAppConnectionPageProps> = ({ onOpenSimulator }) => {
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [verifyToken, setVerifyToken] = useState<string>('');
  const [envStatus, setEnvStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Form state
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);

  // Action status
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Test simulation inline
  const [simPhone, setSimPhone] = useState('+91 98765 43210');
  const [simMsg, setSimMsg] = useState('Ladies Strex price koto?');
  const [simLoading, setSimLoading] = useState(false);
  const [simResponse, setSimResponse] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getWhatsAppStatus();
      setAccount(res.account);
      setSettings(res.settings);
      setWebhookUrl(res.webhookCallbackUrl);
      setVerifyToken(res.verifyToken);
      setEnvStatus(res.envStatus);

      if (res.account) {
        setPhoneNumberId(res.account.phoneNumberId || '');
        setBusinessAccountId(res.account.businessAccountId || '');
        setDisplayPhone(res.account.displayPhoneNumber || '');
        setVerifiedName(res.account.verifiedName || 'Dream Hair & Beauty Family Salon');
        setIsSimulated(Boolean(res.account.isSimulated));
      }
    } catch (err: any) {
      console.error('Failed to load WhatsApp status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateWhatsAppAccount({
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        displayPhoneNumber: displayPhone.trim(),
        verifiedName: verifiedName.trim(),
        isSimulated
      });
      setAccount(res.account);
      setFeedback('WhatsApp Business configuration saved successfully!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save WhatsApp credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testWhatsAppConnection({ phoneNumberId });
      if (res.valid) {
        setTestResult({
          valid: true,
          message: `Connected successfully! Display Name: ${res.verifiedName || 'Dream Family Salon'} (${res.displayPhoneNumber || phoneNumberId})`
        });
        await loadStatus();
      } else {
        setTestResult({
          valid: false,
          message: res.error || 'Could not verify WhatsApp credentials with Meta Cloud API.'
        });
      }
    } catch (err: any) {
      setTestResult({ valid: false, message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleQuickSimulate = async () => {
    if (!simMsg.trim()) return;
    setSimLoading(true);
    setSimResponse(null);
    try {
      const res = await api.simulateWhatsAppMessage({
        phoneNumber: simPhone,
        customerName: 'WhatsApp Demo Client',
        messageText: simMsg
      });
      if (res.outboundMessage?.messageText) {
        setSimResponse(res.outboundMessage.messageText);
      } else if (res.aiResult?.replyText) {
        setSimResponse(res.aiResult.replyText);
      } else {
        setSimResponse('No automated reply generated (Human takeover or auto-reply OFF).');
      }
    } catch (err: any) {
      setSimResponse(`Error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const isMetaConnected = account?.status === 'connected' && Boolean(account?.metaVerified !== false && (account?.connectionStatus === 'CONNECTED' || account?.phoneNumberId));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <MessageSquare className="w-5 h-5 text-white" />
            </span>
            <h1 className="text-xl font-bold">WhatsApp Business Module</h1>
          </div>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl">
            Connect your existing WhatsApp Business Account to the SAME shared Gemini AI Engine and live Business Knowledge database as Instagram.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Strictly Real Meta Connection Status Pill */}
          <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 backdrop-blur-xs border ${
            isMetaConnected
              ? 'bg-emerald-400/20 text-white border-emerald-300/40'
              : 'bg-rose-500/20 text-white border-rose-300/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMetaConnected ? 'bg-emerald-300 animate-pulse' : 'bg-rose-300'}`} />
            <span>{isMetaConnected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
          </span>

          <button
            onClick={loadStatus}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prominent Real Connection Status Banner */}
      <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
        isMetaConnected
          ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950'
          : 'bg-rose-50/80 border-rose-300 text-rose-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
            isMetaConnected ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {isMetaConnected ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold uppercase tracking-wide">
                STATUS: {isMetaConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isMetaConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}>
                {isMetaConnected ? 'REAL META API VERIFIED' : 'META API UNVERIFIED'}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {isMetaConnected
                ? `Live connection confirmed with Meta Graph API (${account?.displayPhoneNumber || account?.verifiedName || account?.phoneNumberId}). Inbound webhooks will be processed live.`
                : (account?.lastError || 'Live Meta Cloud API credentials are not verified. Simulator status does NOT count as a real connection.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs ${
            isMetaConnected
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Checking Meta API...' : 'Verify Meta Connection'}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid: Credentials Form & Meta Webhook Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Account Credentials */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">WhatsApp Cloud API Configuration</h2>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-medium">
              Graph API {envStatus?.apiVersion || 'v21.0'}
            </span>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Phone Number ID:
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={e => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 104829105829104"
                className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup &gt; Phone number ID.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA ID):
              </label>
              <input
                type="text"
                value={businessAccountId}
                onChange={e => setBusinessAccountId(e.target.value)}
                placeholder="e.g. 29481048104819"
                className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Phone Number:
                </label>
                <input
                  type="text"
                  value={displayPhone}
                  onChange={e => setDisplayPhone(e.target.value)}
                  placeholder="+91 6294748025"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verified Business Name:
                </label>
                <input
                  type="text"
                  value={verifiedName}
                  onChange={e => setVerifiedName(e.target.value)}
                  placeholder="Dream Family Salon"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">Local Dev Simulation Mode</div>
                <div className="text-[11px] text-slate-500">
                  Allow testing without live Meta Webhooks or valid WhatsApp access tokens.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isSimulated}
                onChange={e => setIsSimulated(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </form>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
              testResult.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Right Card: Meta Webhook URL & Callback Verification */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">Meta Webhook Configuration</h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Copy these exact values into your Meta Developer App under <strong>WhatsApp &gt; Configuration &gt; Webhook</strong>:
          </p>

          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-700 mb-1">Callback URL:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl select-all"
                />
                <button
                  onClick={() => handleCopy(webhookUrl, 'url')}
                  className="p-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  title="Copy Callback URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-700 mb-1">Verify Token:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl select-all"
                />
                <button
                  onClick={() => handleCopy(verifyToken, 'token')}
                  className="p-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  title="Copy Verify Token"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'token' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-700 mb-1">Webhook Subscription Field:</div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-700 font-bold">messages</span>
                <span className="text-[11px] text-slate-500">Subscribe in Meta App Webhook Fields</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unified Single Brain Architecture</span>
            </div>
            <p className="text-[11px] text-emerald-800/90 leading-relaxed">
              When a WhatsApp user sends a message, it is processed by the exact same Gemini model with real-time access to the updated <strong>Dream Family Salon Business Knowledge database</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Quick WhatsApp Simulator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Live WhatsApp AI Pipeline Tester</h3>
          </div>
          <span className="text-[11px] text-slate-500">Tests full dynamic database quote</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sender WhatsApp Phone:</label>
            <input
              type="text"
              value={simPhone}
              onChange={e => setSimPhone(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Incoming WhatsApp Message:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simMsg}
                onChange={e => setSimMsg(e.target.value)}
                className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl"
                placeholder="e.g. Strex price koto? / Ladies Hair Cut koto?"
              />
              <button
                type="button"
                onClick={handleQuickSimulate}
                disabled={simLoading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{simLoading ? 'Simulating...' : 'Test Reply'}</span>
              </button>
            </div>
          </div>
        </div>

        {simResponse && (
          <div className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Gemini AI Auto-Reply (WhatsApp):</div>
            <div className="text-slate-100 text-xs leading-relaxed">{simResponse}</div>
          </div>
        )}
      </div>
    </div>
  );
};
