import React from 'react';
import { ChatListItem } from './ChatListItem';
import { Users, UserPlus } from 'lucide-react';

export function ChatList({ chats, activeChatId, onSelectChat, searchQuery, onOpenNewChat }) {
  const filtered = searchQuery
    ? chats.filter((c) =>
        (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_message_text || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
          <Users className="w-6 h-6" />
        </div>
        {searchQuery ? (
          <span className="text-xs text-slate-400">No chats found matching "{searchQuery}"</span>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-200 mb-1">No chats yet</p>
            <p className="text-xs text-slate-400 mb-4 max-w-[200px]">
              Tap below to see all contacts and start messaging!
            </p>
            {onOpenNewChat && (
              <button
                onClick={onOpenNewChat}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Open Contacts</span>
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
      {filtered.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          onClick={() => onSelectChat(chat.id)}
        />
      ))}
    </div>
  );
}
