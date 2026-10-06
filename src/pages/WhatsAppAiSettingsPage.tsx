import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Save,
  CheckCircle2,
  ShieldAlert,
  Database,
  Send,
  Zap,
  Sliders,
  HelpCircle,
  Clock,
  Phone
} from 'lucide-react';
import { WhatsAppSettings } from '../types';
import { api } from '../api/client';

export const WhatsAppAiSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<WhatsAppSettings>({
    id: 'wa_settings_default',
    enabled: true,
    autoReply: true,
    humanTakeover: false,
    updatedAt: new Date().toISOString()
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Live tester
  const [testQuery, setTestQuery] = useState('Ladies Strex price koto?');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.getWhatsAppSettings();
        if (res.settings) {
          setSettings(res.settings);
        }
      } catch (err) {
        console.error('Failed to load WhatsApp settings', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateWhatsAppSettings(settings);
      setSettings(res.settings);
      setFeedback('WhatsApp AI settings updated successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update WhatsApp settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.simulateWhatsAppMessage({
        phoneNumber: '919876543210',
        customerName: 'Test Client',
        messageText: testQuery.trim()
      });
      setTestResult(res.outboundMessage?.messageText || res.aiResult?.replyText || 'No reply generated.');
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-slate-900">WhatsApp AI Auto-Reply Settings</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Configure how the shared Gemini AI model responds to WhatsApp queries. All responses use the latest saved Dream Family Salon business knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
          <Database className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Shared Salon Brain Linked</span>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Toggle 1: WhatsApp Channel Enabled */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Enable WhatsApp Module</span>
            </div>
            <p className="text-xs text-slate-500">
              When enabled, incoming webhook events from Meta WhatsApp Cloud API are processed.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={e => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Toggle 2: AI Auto-Reply on WhatsApp */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal-600" />
              <span>Gemini AI Auto-Reply on WhatsApp</span>
            </div>
            <p className="text-xs text-slate-500">
              Automatically respond to customers in natural Roman Banglish quoting live database prices.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoReply}
              onChange={e => setSettings(prev => ({ ...prev, autoReply: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Toggle 3: Human Takeover Mode Default */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Global Human Takeover</span>
            </div>
            <p className="text-xs text-slate-500">
              Pause all WhatsApp AI auto-replies so staff can manually answer all incoming chats.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.humanTakeover}
              onChange={e => setSettings(prev => ({ ...prev, humanTakeover: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save WhatsApp AI Settings'}</span>
        </button>
      </form>

      {/* Test Live WhatsApp Query Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Verify Dynamic WhatsApp Auto-Reply</h2>
        </div>

        <p className="text-xs text-slate-500">
          Test any customer question in Roman Banglish. Notice that prices match the live Business Knowledge database without hardcoded values.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            placeholder="e.g. Strex price? / Ladies Hair Cut price?"
            className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleTestQuery}
            disabled={testing}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testing ? 'Testing...' : 'Test WhatsApp Reply'}</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Generated AI Response:</div>
            <div className="text-slate-100 text-xs leading-relaxed">{testResult}</div>
          </div>
        )}
      </div>
    </div>
  );
};
