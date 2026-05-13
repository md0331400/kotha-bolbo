import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { SplashScreen } from '@/components/SplashScreen';
import { InstallPrompt } from '@/components/InstallPrompt';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer } from '@/components/ui';
import { AuthScreen } from '@/screens/AuthScreen';
import { ChatListScreen } from '@/screens/ChatListScreen';
import { ConversationScreen } from '@/screens/ConversationScreen';
import { FriendsScreen } from '@/screens/FriendsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { Tab } from '@/types';
import { isFirebaseConfigured } from '@/firebase/init';
import { initOneSignal, setOneSignalUserId } from '@/onesignal';

// ===== Inner App (with auth context) =====
const InnerApp = () => {
  const { user, loading: authLoading } = useAuth();
  const { setActiveConvId, activeConvId, getTotalUnread } = useChat();
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [showSplash, setShowSplash] = useState(true);

  // Initialize OneSignal after auth
  useEffect(() => {
    if (user) {
      initOneSignal().catch(console.error);
      setOneSignalUserId(user.uid).catch(console.error);
    }
  }, [user]);

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  const handleOpenChat = useCallback((convId: string) => {
    setActiveConvId(convId);
  }, [setActiveConvId]);

  const handleCloseChat = useCallback(() => {
    setActiveConvId(null);
  }, [setActiveConvId]);

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // Show loading
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="animate-spin">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  // Firebase not configured
  if (!isFirebaseConfigured()) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center" style={{ background: '#0a0e1a' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Setup Required</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
          Firebase is not configured yet. Please update <code className="text-accent">src/firebase/config.ts</code> with your Firebase project credentials.
        </p>
      </div>
    );
  }

  // Not authenticated - show auth screen
  if (!user) {
    return <AuthScreen />;
  }

  // Main app with conversation overlay
  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0e1a' }}>
      {/* Active conversation overlay */}
      {activeConvId ? (
        <ConversationScreen convId={activeConvId} onBack={handleCloseChat} />
      ) : (
        <>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chats' && <ChatListScreen onOpenChat={handleOpenChat} />}
            {activeTab === 'friends' && <FriendsScreen />}
            {activeTab === 'profile' && <ProfileScreen />}
            {activeTab === 'settings' && <SettingsScreen />}
          </div>

          {/* Bottom navigation */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={getTotalUnread()}
          />
        </>
      )}
    </div>
  );
};

// ===== Main App (with providers) =====
const App = () => {
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if running in standalone/PWA mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();
  }, []);

  // Still checking
  if (isStandalone === null) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="animate-spin">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  // Not in standalone mode - show install prompt
  if (!isStandalone) {
    return <InstallPrompt />;
  }

  // Standalone mode - show the app
  return (
    <AuthProvider>
      <ChatProvider>
        <InnerApp />
        <ToastContainer />
      </ChatProvider>
    </AuthProvider>
  );
};

export default App;
