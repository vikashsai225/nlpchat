import React from 'react';
import { Users, Check, CheckCheck } from 'lucide-react';

export function ChatListItem({ chat, isActive, onClick }) {
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isOnline = Boolean(!chat.is_group && chat.recipient?.is_online);

  return (
    <div
      onClick={onClick}
        className={`flex items-center px-3.5 py-3.5 cursor-pointer transition-colors relative border-b border-white/[0.06] select-none ${
        isActive
          ? 'bg-cyan-300/[0.09] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-cyan-300'
          : 'hover:bg-white/[0.05] bg-transparent'
      }`}
    >
      {/* Avatar with optional online dot */}
      <div className="relative shrink-0 mr-3.5">
        <img
          src={chat.avatar}
          alt={chat.title}
          className="w-12 h-12 rounded-2xl object-cover bg-slate-800 ring-1 ring-white/10"
        />
        {isOnline ? (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-wa-green border-2 border-white dark:border-wa-dark-panel rounded-full" />
        ) : null}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h2 className="text-sm font-semibold text-slate-100 truncate flex items-center gap-1.5">
            {chat.is_group ? <Users className="w-3.5 h-3.5 text-wa-teal shrink-0" /> : null}
            <span className="truncate">{chat.title}</span>
          </h2>
          <span className="text-[11px] text-gray-400 dark:text-wa-dark-muted shrink-0 ml-2">
            {formatTime(chat.last_message_at || chat.updated_at)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 truncate pr-2">
            {chat.last_message_text || (
              <span className="italic text-gray-400 dark:text-wa-dark-muted/70">
                {chat.is_group ? 'Group created' : 'Start conversation'}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
