import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  BookOpen,
  SlidersHorizontal,
  Instagram,
  Settings,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
  Activity,
  Layers,
  Phone,
  Smartphone
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  unreadTotal: number;
  isOpen: boolean;
  onClose: () => void;
  metaApiVersion?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  unreadTotal,
  isOpen,
  onClose,
  metaApiVersion
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Instagram Inbox', icon: Instagram, badge: unreadTotal > 0 ? unreadTotal : undefined },
    { id: 'whatsapp-chats', label: 'WhatsApp Inbox', icon: Phone },
    { id: 'knowledge', label: 'Business Knowledge', icon: BookOpen },
    { id: 'ai', label: 'Instagram AI Settings', icon: Bot },
    { id: 'whatsapp-connect', label: 'WhatsApp Connection', icon: Smartphone },
    { id: 'whatsapp-settings', label: 'WhatsApp AI Settings', icon: MessageSquare },
    { id: 'rules', label: 'Reply Rules', icon: SlidersHorizontal },
    { id: 'instagram', label: 'Instagram Setup', icon: Instagram },
    { id: 'meta-setup', label: 'Meta Webhooks', icon: Layers },
    { id: 'settings', label: 'Settings & Logs', icon: Settings },
    { id: 'guide', label: 'Setup Guide', icon: HelpCircle }
  ];

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-50 lg:z-10 h-screen lg:h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-3 mb-2 border-b border-slate-100 lg:hidden flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">Navigation</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 bg-slate-100 rounded"
            >
              Close
            </button>
          </div>

          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>

          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-50 to-indigo-50 text-indigo-700 font-semibold shadow-xs border border-indigo-100/60'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info & compliance links */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 space-y-2">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="font-medium text-slate-600 truncate" title={metaApiVersion || 'Meta API version is not configured'}>
              {metaApiVersion && metaApiVersion !== 'Meta API version is not configured'
                ? `Meta API: ${metaApiVersion}`
                : 'Meta API version is not configured'}
            </span>
            <span className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
              metaApiVersion && metaApiVersion !== 'Meta API version is not configured'
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                metaApiVersion && metaApiVersion !== 'Meta API version is not configured'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`} />
              {metaApiVersion && metaApiVersion !== 'Meta API version is not configured' ? 'Ready' : 'Not Configured'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
            <button
              onClick={() => handleSelect('privacy')}
              className="hover:text-indigo-600 transition-colors"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelect('terms')}
              className="hover:text-indigo-600 transition-colors"
            >
              Terms
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelect('meta-setup')}
              className="hover:text-indigo-600 transition-colors"
            >
              Meta Endpoints
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
