import React from 'react';
import { ArrowLeft, Sparkles, Search, Download, Users, Palette } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export function ChatHeader({
  chat,
  onBack,
  onOpenSummary,
  onOpenExport,
  onToggleSearch,
  onOpenAiSettings,
  onOpenWallpaper
}) {
  const { typingUsers } = useChat();

  const isOnline = Boolean(!chat.is_group && chat.recipient?.is_online);
  const isTyping = Boolean(typingUsers && typingUsers.length > 0);

  return (
    <div className="h-[4.5rem] px-4 bg-[#11172a] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
      {/* Left: Back button + Avatar + Title & Status */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 text-gray-600 dark:text-wa-dark-muted hover:text-gray-900 dark:hover:text-white rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={chat.avatar}
            alt={chat.title}
          className="w-10 h-10 rounded-full object-cover bg-slate-800 ring-2 ring-cyan-300/20"
          />
          {isOnline ? (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa-green border-2 border-white dark:border-wa-dark-header rounded-full" />
          ) : null}
        </div>

        {/* Name and Status */}
        <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate flex items-center gap-1.5">
            {chat.is_group ? <Users className="w-3.5 h-3.5 text-wa-teal shrink-0" /> : null}
            <span className="truncate">{chat.title}</span>
          </h2>

          <div className="text-xs truncate">
            {isTyping ? (
              <span className="text-wa-teal font-medium animate-pulse">
                {typingUsers.join(', ')} is typing...
              </span>
            ) : isOnline ? (
              <span className="text-wa-green font-medium">Online</span>
            ) : chat.is_group ? (
              <span className="text-gray-500 dark:text-wa-dark-muted">Group conversation</span>
            ) : chat.recipient?.last_seen ? (
              <span className="text-gray-400 dark:text-wa-dark-muted">
                Last seen {new Date(chat.recipient.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="text-gray-400 dark:text-wa-dark-muted">Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-wa-dark-muted">
        {/* OpenAI Engine Pill */}
        <button
          onClick={onOpenAiSettings}
          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-full transition-all flex items-center gap-1.5 text-xs font-semibold text-wa-teal shadow-2xs cursor-pointer"
          title="OpenAI Normalizer & Model Settings"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
          <span className="hidden sm:inline">OpenAI Engine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </button>

        {/* Wallpaper Picker Button */}
        <button
          onClick={onOpenWallpaper}
          className="p-2 hover:bg-gray-200/60 dark:hover:bg-wa-dark-border/60 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
          title="Chat theme & wallpaper"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Summarize Conversation */}
        <button
          onClick={onOpenSummary}
          className="p-2 hover:bg-gray-200/60 dark:hover:bg-wa-dark-border/60 hover:text-wa-teal rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Summarize chat messages"
        >
          <Sparkles className="w-4 h-4 text-wa-teal" />
          <span className="hidden md:inline text-wa-teal">Summarize</span>
        </button>

        {/* Search messages in chat */}
        <button
          onClick={onToggleSearch}
          className="p-2 hover:bg-gray-200/60 dark:hover:bg-wa-dark-border/60 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
          title="Search messages"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Export Chat */}
        <button
          onClick={onOpenExport}
          className="p-2 hover:bg-gray-200/60 dark:hover:bg-wa-dark-border/60 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors"
          title="Export chat history"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
