import React from 'react';
import { ChatListItem } from './ChatListItem';

export function ChatList({ chats, activeChatId, onSelectChat, searchQuery }) {
  const filtered = searchQuery
    ? chats.filter((c) =>
        (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_message_text || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-gray-400 dark:text-wa-dark-muted">
        {searchQuery ? (
          <span>No chats found matching "{searchQuery}"</span>
        ) : (
          <span>No chats yet. Click the + button above to start a conversation!</span>
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
