import React from 'react';
import {
  Instagram,
  Bot,
  UserCheck,
  PlayCircle,
  Menu,
  Sparkles,
  LogOut,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { InstagramAccount, AiSettings, User } from '../types';

interface NavbarProps {
  account: InstagramAccount | null;
  aiSettings: AiSettings | null;
  user: User | null;
  onOpenSimulator: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  aiSettings,
  user,
  onOpenSimulator,
  onToggleSidebar,
  onLogout,
  currentTab,
  setCurrentTab
}) => {
  const isConnected = account?.status === 'connected';
  const isAiOn = aiSettings?.enabled ?? false;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & App Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 flex items-center justify-center shadow-sm text-white group-hover:scale-105 transition-transform">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  Instagram AI Auto Reply
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200/60 hidden sm:inline-block">
                  Meta Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Automated DM Assistant for Business
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Badges & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Badge: Instagram Connection */}
          <div
            onClick={() => setCurrentTab('instagram')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors transition-shadow shadow-xs hover:border-slate-300"
            style={{
              backgroundColor: isConnected ? '#ecfdf5' : '#fef2f2',
              borderColor: isConnected ? '#a7f3d0' : '#fecaca',
              color: isConnected ? '#065f46' : '#991b1b'
            }}
            title="Click to view Instagram Connection status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline font-semibold">Instagram:</span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            {account?.isSimulated && isConnected && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200/60 px-1 rounded ml-0.5">
                Dev
              </span>
            )}
          </div>

          {/* Status Badge: AI Mode */}
          <div
            onClick={() => setCurrentTab('ai')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors shadow-xs hover:border-slate-300"
            style={{
              backgroundColor: isAiOn ? '#eff6ff' : '#f8fafc',
              borderColor: isAiOn ? '#bfdbfe' : '#e2e8f0',
              color: isAiOn ? '#1e40af' : '#475569'
            }}
            title="Click to configure AI Auto Reply"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">AI Auto Reply:</span>
            <span className="font-bold">{isAiOn ? 'ON' : 'OFF'}</span>
          </div>

          {/* Quick Simulation Trigger */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all"
            title="Simulate incoming Instagram DM and test AI replies"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Test DM Simulator</span>
            <span className="md:hidden">Test</span>
          </button>

          {/* User profile / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
              {user?.name ? user.name[0].toUpperCase() : 'M'}
            </div>
            <div className="hidden xl:block text-left text-xs">
              <p className="font-semibold text-slate-800 leading-tight">
                {user?.name || 'Salon Manager'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {user?.email || 'admin@instasalon.com'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
