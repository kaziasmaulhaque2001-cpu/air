import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DevSimulatorModal } from './components/DevSimulatorModal';
import { DashboardPage } from './pages/DashboardPage';
import { InboxPage } from './pages/InboxPage';
import { AiAutoReplyPage } from './pages/AiAutoReplyPage';
import { BusinessKnowledgePage } from './pages/BusinessKnowledgePage';
import { ReplyRulesPage } from './pages/ReplyRulesPage';
import { InstagramConnectionPage } from './pages/InstagramConnectionPage';
import { MetaSetupPage } from './pages/MetaSetupPage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupGuidePage } from './pages/SetupGuidePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { LoginPage } from './pages/LoginPage';
import { WhatsAppConnectionPage } from './pages/WhatsAppConnectionPage';
import { WhatsAppChatsPage } from './pages/WhatsAppChatsPage';
import { WhatsAppAiSettingsPage } from './pages/WhatsAppAiSettingsPage';
import { api } from './api/client';
import {
  InstagramAccount,
  AiSettings,
  BusinessKnowledge,
  ReplyRule,
  Conversation,
  DashboardStats,
  User
} from './types';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Core App State
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [businessKnowledge, setBusinessKnowledge] = useState<BusinessKnowledge | null>(null);
  const [replyRules, setReplyRules] = useState<ReplyRule[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [metaApiVersion, setMetaApiVersion] = useState<string>('');

  // Check URL query parameters or hash for initial routes
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/privacy-policy') {
      setCurrentTab('privacy');
    } else if (path === '/terms') {
      setCurrentTab('terms');
    }
  }, []);

  // Initial Auth Check
  useEffect(() => {
    api.getMe()
      .then(res => {
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
        } else {
          // If in dev environment, we can auto-login as demo manager or prompt login
          api.demoLogin()
            .then(demoRes => setCurrentUser(demoRes.user))
            .catch(() => setCurrentUser(null));
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setIsAuthChecking(false));
  }, []);

  // Fetch application data
  const loadAppData = async () => {
    try {
      const [igStatus, aiRes, bkRes, rulesRes, convRes] = await Promise.all([
        api.getInstagramStatus(),
        api.getAiSettings(),
        api.getBusinessKnowledge(),
        api.getReplyRules(),
        api.getConversations({ channel: 'instagram' })
      ]);

      setAccount(igStatus.account);
      setStats(igStatus.stats);
      setMetaApiVersion(igStatus.envStatus?.apiVersion || '');
      setAiSettings(aiRes.settings);
      setBusinessKnowledge(bkRes.knowledge);
      setReplyRules(rulesRes.rules);
      setConversations(convRes.conversations);

      if (!selectedConversationId && convRes.conversations.length > 0) {
        setSelectedConversationId(convRes.conversations[0].id);
      }
    } catch (err) {
      console.error('[App] Failed loading data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAppData();

      // Poll conversations and status every 8 seconds for background webhook updates
      const timer = setInterval(() => {
        api.getConversations({ channel: 'instagram' }).then(res => setConversations(res.conversations)).catch(() => {});
        api.getInstagramStatus().then(res => {
          setAccount(res.account);
          setStats(res.stats);
          if (res.envStatus?.apiVersion) {
            setMetaApiVersion(res.envStatus.apiVersion);
          }
        }).catch(() => {});
      }, 8000);

      return () => clearInterval(timer);
    }
  }, [currentUser]);

  const handleToggleAi = async () => {
    if (!aiSettings) return;
    const newEnabled = !aiSettings.enabled;
    try {
      const res = await api.updateAiSettings({ enabled: newEnabled });
      setAiSettings(res.settings);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle AI');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // If public route requested
  if (currentTab === 'privacy') {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
        <PrivacyPolicyPage onBack={() => setCurrentTab('dashboard')} />
      </div>
    );
  }

  if (currentTab === 'terms') {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
        <TermsPage onBack={() => setCurrentTab('dashboard')} />
      </div>
    );
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-semibold text-slate-600">
            Initializing Instagram AI Auto Reply system...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={user => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Navigation */}
      <Navbar
        account={account}
        aiSettings={aiSettings}
        user={currentUser}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={handleLogout}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          unreadTotal={totalUnread}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          metaApiVersion={metaApiVersion}
        />

        {/* Main Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <DashboardPage
              account={account}
              aiSettings={aiSettings}
              conversations={conversations}
              stats={stats}
              onNavigate={setCurrentTab}
              onSelectConversation={id => {
                setSelectedConversationId(id);
                setCurrentTab('inbox');
              }}
              onToggleAi={handleToggleAi}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {currentTab === 'inbox' && (
            <InboxPage
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              onRefreshConversations={() => {
                api.getConversations({ channel: 'instagram' }).then(res => setConversations(res.conversations));
              }}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {currentTab === 'whatsapp-chats' && (
            <WhatsAppChatsPage
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {currentTab === 'whatsapp-connect' && (
            <WhatsAppConnectionPage
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {currentTab === 'whatsapp-settings' && (
            <WhatsAppAiSettingsPage />
          )}

          {currentTab === 'ai' && (
            <AiAutoReplyPage
              settings={aiSettings}
              onUpdateSettings={setAiSettings}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {currentTab === 'knowledge' && (
            <BusinessKnowledgePage
              knowledge={businessKnowledge}
              onUpdateKnowledge={setBusinessKnowledge}
            />
          )}

          {currentTab === 'rules' && (
            <ReplyRulesPage
              rules={replyRules}
              onRefreshRules={() => {
                api.getReplyRules().then(res => setReplyRules(res.rules));
              }}
            />
          )}

          {currentTab === 'instagram' && (
            <InstagramConnectionPage
              account={account}
              onRefreshAccount={loadAppData}
              onNavigate={setCurrentTab}
              metaApiVersion={metaApiVersion}
            />
          )}

          {currentTab === 'meta-setup' && <MetaSetupPage />}

          {currentTab === 'settings' && <SettingsPage />}

          {currentTab === 'guide' && (
            <SetupGuidePage
              onNavigate={setCurrentTab}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Multi-Channel Development Simulator Modal */}
      <DevSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulationComplete={(convId, simChannel) => {
          setSelectedConversationId(convId);
          api.getConversations({ channel: 'instagram' }).then(res => setConversations(res.conversations));
          if (simChannel === 'whatsapp') {
            setCurrentTab('whatsapp-chats');
          } else {
            setCurrentTab('inbox');
          }
        }}
      />
    </div>
  );
}
