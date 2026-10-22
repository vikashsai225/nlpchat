import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { SearchBar } from './SearchBar';
import { ChatList } from './ChatList';
import { NewChatModal } from './NewChatModal';
import { NewGroupModal } from './NewGroupModal';
import { UserProfileDrawer } from './UserProfileDrawer';
import { SettingsModal } from '../modals/SettingsModal';
import { PersonalDictionaryModal } from '../modals/PersonalDictionaryModal';
import { StarredMessagesDrawer } from '../chat/StarredMessagesDrawer';
import { OpenAiSettingsModal } from '../modals/OpenAiSettingsModal';
import {
  MessageSquarePlus,
  Users,
  Settings,
  Star,
  Moon,
  Sun,
  WifiOff,
  Sparkles
} from 'lucide-react';

export function Sidebar({ className = '' }) {
  const { user } = useAuth();
  const { chats, activeChatId, setActiveChatId, isOnline } = useChat();
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

  return (
    <aside
      className={`w-full md:w-80 lg:w-96 flex flex-col h-full bg-[#0f1425]/95 border-r border-white/10 shrink-0 select-none ${className}`}
    >
      {/* Top Header */}
      <div className="h-[4.5rem] px-4 bg-[#11172a] border-b border-white/10 flex items-center justify-between shrink-0">
        {/* User avatar and profile trigger */}
        <button
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-2.5 p-1 -ml-1 rounded-full hover:opacity-85 transition-opacity"
          title="View profile"
        >
          <img
            src={user?.avatar_url}
            alt={user?.display_name}
            className="w-10 h-10 rounded-full object-cover bg-slate-800 border border-cyan-300/30 ring-2 ring-violet-400/10"
          />
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-100 truncate max-w-[100px]">
              {user?.display_name}
            </div>
            <div className="text-[10px] text-cyan-300 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />AI workspace online</div>
          </div>
        </button>

        {/* Actions bar */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* New Direct Chat */}
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            title="Start new conversation"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          {/* New Group */}
          <button
            onClick={() => setIsNewGroupOpen(true)}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            title="Create group"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Starred Messages */}
          <button
            onClick={() => setIsStarredOpen(true)}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            title="Starred messages"
          >
            <Star className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* AI Settings */}
          <button
            onClick={() => setIsAiSettingsOpen(true)}
            className="p-2 hover:bg-cyan-300/10 hover:text-cyan-200 rounded-xl transition-colors"
            title="OpenAI Normalizer Settings"
          >
            <Sparkles className="w-4 h-4 text-wa-teal" />
          </button>

          {/* Settings & Privacy */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            title="Settings & Privacy"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Offline Status Alert Banner */}
      {!isOnline && (
        <div className="px-3 py-1.5 bg-amber-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 shrink-0">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode: messages will be sent automatically once reconnected</span>
        </div>
      )}

      {/* Search Input */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Quick Contacts Bar */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-white/5 bg-white/[0.02]">
        <button
          onClick={() => setIsNewChatOpen(true)}
          className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
        >
          <Users className="w-3.5 h-3.5" />
          <span>👥 View Contacts ({chats?.length || 0} active)</span>
        </button>
      </div>

      {/* Chat List */}
      <ChatList
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        searchQuery={searchQuery}
        onOpenNewChat={() => setIsNewChatOpen(true)}
      />

      {/* Modals & Drawers */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <NewGroupModal isOpen={isNewGroupOpen} onClose={() => setIsNewGroupOpen(false)} />
      <UserProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenDictionary={() => setIsDictionaryOpen(true)}
      />
      <PersonalDictionaryModal isOpen={isDictionaryOpen} onClose={() => setIsDictionaryOpen(false)} />
      <StarredMessagesDrawer isOpen={isStarredOpen} onClose={() => setIsStarredOpen(false)} />
      <OpenAiSettingsModal isOpen={isAiSettingsOpen} onClose={() => setIsAiSettingsOpen(false)} />
    </aside>
  );
}
