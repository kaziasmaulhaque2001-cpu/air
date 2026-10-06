import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Power,
  Sparkles,
  MapPin,
  Calendar,
  Phone,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { ReplyRule, ActionType } from '../types';
import { api } from '../api/client';

interface ReplyRulesPageProps {
  rules: ReplyRule[];
  onRefreshRules: () => void;
}

export const ReplyRulesPage: React.FC<ReplyRulesPageProps> = ({
  rules,
  onRefreshRules
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReplyRule | null>(null);

  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact'>('contains');
  const [actionType, setActionType] = useState<ActionType>('knowledge');
  const [customResponse, setCustomResponse] = useState('');
  const [priority, setPriority] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setKeyword('');
    setMatchType('contains');
    setActionType('knowledge');
    setCustomResponse('');
    setPriority(rules.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: ReplyRule) => {
    setEditingRule(rule);
    setKeyword(rule.keyword);
    setMatchType(rule.matchType);
    setActionType(rule.actionType);
    setCustomResponse(rule.customResponse || '');
    setPriority(rule.priority);
    setIsModalOpen(true);
  };

  const handleToggleEnable = async (rule: ReplyRule) => {
    try {
      await api.updateReplyRule(rule.id, { isEnabled: !rule.isEnabled });
      onRefreshRules();
    } catch (err: any) {
      alert(err.message || 'Error updating rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reply rule?')) return;
    try {
      await api.deleteReplyRule(id);
      onRefreshRules();
    } catch (err: any) {
      alert(err.message || 'Error deleting rule');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsSaving(true);
    try {
      if (editingRule) {
        await api.updateReplyRule(editingRule.id, {
          keyword: keyword.trim().toLowerCase(),
          matchType,
          actionType,
          customResponse,
          priority
        });
      } else {
        await api.addReplyRule({
          keyword: keyword.trim().toLowerCase(),
          matchType,
          actionType,
          customResponse,
          isEnabled: true,
          priority
        });
      }
      setIsModalOpen(false);
      onRefreshRules();
    } catch (err: any) {
      alert(err.message || 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'location': return <MapPin className="w-4 h-4 text-rose-500" />;
      case 'appointment': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'contact': return <Phone className="w-4 h-4 text-blue-500" />;
      case 'custom_response': return <MessageSquare className="w-4 h-4 text-amber-500" />;
      default: return <BookOpen className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Keyword Reply Rules</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trigger deterministic actions or targeted AI responses when a customer DM contains specific keywords.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No reply rules configured yet. Click "Add New Rule" above.
            </div>
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
                    {getActionIcon(rule.actionType)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {rule.keyword}
                      </span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {rule.matchType}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        rule.isEnabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rule.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>Action:</strong>{' '}
                      {rule.actionType === 'knowledge' && 'Answer using verified Business Knowledge pricing'}
                      {rule.actionType === 'location' && 'Send business location & directions'}
                      {rule.actionType === 'appointment' && 'Prompt customer for preferred date and time'}
                      {rule.actionType === 'contact' && 'Send business phone & hours'}
                      {rule.actionType === 'custom_response' && `Custom template: "${rule.customResponse}"`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleEnable(rule)}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      rule.isEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={rule.isEnabled ? 'Disable rule' : 'Enable rule'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{rule.isEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Dialog for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingRule ? 'Edit Reply Rule' : 'Create New Reply Rule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Keyword:
                </label>
                <input
                  type="text"
                  required
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. price, appointment, haircut, location"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Match Type:
                  </label>
                  <select
                    value={matchType}
                    onChange={e => setMatchType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="contains">Contains (e.g. "what is the price")</option>
                    <option value="exact">Exact (e.g. "price" only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Action Type:
                  </label>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="knowledge">Business Knowledge Grounding</option>
                    <option value="location">Send Business Location</option>
                    <option value="appointment">Ask for Appointment Slot</option>
                    <option value="contact">Send Contact Details</option>
                    <option value="custom_response">Custom Template Response</option>
                  </select>
                </div>
              </div>

              {actionType === 'custom_response' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Response Text:
                  </label>
                  <textarea
                    rows={3}
                    value={customResponse}
                    onChange={e => setCustomResponse(e.target.value)}
                    placeholder="Enter the exact reply to send..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSaving ? 'Saving...' : editingRule ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
