import React, { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useChat } from './context/ChatContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';

export function App() {
  const { user, loading } = useAuth();
  const { activeChatId, setActiveChatId } = useChat();

  // Request browser notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center ai-shell text-cyan-200">
        <div className="ai-orb w-16 h-16 rounded-full animate-pulse mb-5" />
        <h1 className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-200">Waking NLPChat AI</h1>
        <p className="mt-2 text-[11px] text-slate-500">Preparing your intelligent workspace</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden ai-shell ai-grid p-0 md:p-3">
      {/* Desktop chat container */}
      <div className="flex-1 flex overflow-hidden w-full h-full md:rounded-2xl md:border md:border-white/10 md:ai-glow">
        {/* Sidebar: Visible on desktop, or on mobile when no active chat is selected */}
        <div className={`w-full md:w-auto h-full ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
          <Sidebar />
        </div>

        {/* Chat Area: Visible on desktop, or on mobile when active chat is selected */}
        <div className={`flex-1 h-full ${activeChatId ? 'flex' : 'hidden md:flex'}`}>
          <ChatArea onBackToSidebar={() => setActiveChatId(null)} />
        </div>
      </div>
    </div>
  );
}

export default App;
