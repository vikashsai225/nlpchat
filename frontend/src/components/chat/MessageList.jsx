import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { useTheme } from '../../context/ThemeContext';
import { Lock } from 'lucide-react';

export function MessageList({ messages, isGroup, searchQuery, wallpaper = 'classic' }) {
  const { theme } = useTheme();
  const bottomRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatDateHeader = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter messages if search query active
  const filteredMessages = searchQuery
    ? messages.filter((m) =>
        m.normalized_content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Group messages by date
  let lastDate = '';

  const getWallpaperClass = () => {
    if (wallpaper === 'emerald') return 'bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-950';
    if (wallpaper === 'nebula') return 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950';
    if (wallpaper === 'sunset') return 'bg-gradient-to-br from-amber-950/60 via-purple-950/70 to-slate-950';
    return theme === 'dark' ? 'wa-wallpaper-dark' : 'wa-wallpaper-light';
  };

  return (
    <div
      className={`flex-1 overflow-y-auto p-2 sm:p-4 relative transition-colors duration-300 ${getWallpaperClass()}`}
    >
      {/* End-to-end natural English banner */}
      <div className="flex justify-center my-3 select-none">
        <div className="max-w-md px-3.5 py-1.5 bg-amber-50/90 dark:bg-wa-dark-header/90 border border-amber-200/60 dark:border-wa-dark-border/80 rounded-lg text-center shadow-2xs backdrop-blur-xs">
          <p className="text-[11px] text-amber-800 dark:text-wa-dark-muted flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Messages are automatically delivered in clear natural English.</span>
          </p>
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-xs text-gray-400 dark:text-wa-dark-muted select-none">
          {searchQuery ? 'No matching messages found' : 'No messages yet. Say hello!'}
        </div>
      ) : (
        filteredMessages.map((msg) => {
          const currentDate = formatDateHeader(msg.created_at);
          const showDateHeader = Boolean(currentDate && currentDate !== lastDate);
          if (showDateHeader) {
            lastDate = currentDate;
          }

          return (
            <React.Fragment key={msg.id || msg.client_id}>
              {showDateHeader ? (
                <div className="flex justify-center my-3 select-none">
                  <span className="px-3 py-1 bg-white/90 dark:bg-wa-dark-header/90 text-gray-600 dark:text-wa-dark-muted text-[11px] font-semibold rounded-lg shadow-2xs backdrop-blur-xs">
                    {currentDate}
                  </span>
                </div>
              ) : null}
              <MessageBubble message={msg} isGroup={isGroup} />
            </React.Fragment>
          );
        })
      )}

      <div ref={bottomRef} />
    </div>
  );
}
