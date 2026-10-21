import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { GroupSummaryModal } from './GroupSummaryModal';
import { ExportChatModal } from './ExportChatModal';
import { OpenAiSettingsModal } from '../modals/OpenAiSettingsModal';
import { WallpaperModal } from '../modals/WallpaperModal';
import { Search, X, MessageSquare, Sparkles } from 'lucide-react';

export function ChatArea({ onBackToSidebar }) {
  const { activeChat, messages } = useChat();

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('nlpchat_wallpaper') || 'classic');

  const handleSelectWallpaper = (newWp) => {
    setWallpaper(newWp);
    localStorage.setItem('nlpchat_wallpaper', newWp);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#0b1020]/90 p-8 text-center select-none relative overflow-hidden">
        <div className="absolute -top-28 -right-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-36 -left-20 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-cyan-300 to-violet-500 flex items-center justify-center text-slate-950 mb-6 shadow-[0_0_60px_rgba(103,232,249,0.22)] rotate-3">
          <div className="absolute inset-2 rounded-[1.5rem] border border-white/40" />
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="relative flex items-center gap-2 text-[10px] font-bold tracking-[0.24em] uppercase text-cyan-300 mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Neural communication layer
        </div>
        <h2 className="relative text-3xl font-bold text-white mb-2 tracking-tight">
          Your conversations, upgraded.
        </h2>
        <p className="relative text-sm leading-6 text-slate-400 max-w-md mb-6">
          Pick a conversation to translate intent, sharpen tone, and turn everyday messages into clear communication.
        </p>
        <div className="relative grid grid-cols-3 gap-2 max-w-lg w-full">
          {['Any language', 'Tone aware', 'Instant clarity'].map((item, index) => (
            <div key={item} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">0{index + 1}</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-200">{item}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b1020] overflow-hidden relative">
      {/* Chat Header */}
      <ChatHeader
        chat={activeChat}
        onBack={onBackToSidebar}
        onOpenSummary={() => setIsSummaryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onOpenWallpaper={() => setIsWallpaperOpen(true)}
      />

      {/* In-Chat Message Search Bar */}
      {showSearch ? (
        <div className="px-4 py-2 bg-white dark:bg-wa-dark-panel border-b border-gray-200 dark:border-wa-dark-border flex items-center gap-2 animate-slide-up">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within this conversation..."
            className="w-full text-xs bg-transparent text-gray-900 dark:text-wa-dark-text focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* Message History */}
      <MessageList
        messages={messages}
        isGroup={Boolean(activeChat.is_group)}
        searchQuery={searchQuery}
        wallpaper={wallpaper}
      />

      {/* Message Composer with Invisible Preview & Smart Replies */}
      <MessageInput />

      {/* Modals */}
      <GroupSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        chat={activeChat}
      />

      <ExportChatModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        chat={activeChat}
        messages={messages}
      />

      <OpenAiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
      />

      <WallpaperModal
        isOpen={isWallpaperOpen}
        onClose={() => setIsWallpaperOpen(false)}
        currentWallpaper={wallpaper}
        onSelectWallpaper={handleSelectWallpaper}
      />
    </div>
  );
}
