import React, { useEffect } from 'react';
import { X, Star, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export function StarredMessagesDrawer({ isOpen, onClose }) {
  const { starredMessages, loadStarredMessages, setActiveChatId, toggleStarMessage } = useChat();

  useEffect(() => {
    if (isOpen) {
      loadStarredMessages();
    }
  }, [isOpen, loadStarredMessages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-wa-dark-panel z-50 shadow-2xl border-l border-gray-200 dark:border-wa-dark-border flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-wa-teal dark:bg-wa-dark-header p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-white text-white" />
          <h2 className="text-base font-semibold">Starred Messages</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {starredMessages.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400 flex flex-col items-center gap-2">
            <Star className="w-8 h-8 text-gray-300 dark:text-wa-dark-border" />
            <span>No starred messages yet.</span>
            <span className="text-[11px] text-gray-400">Hover over any message bubble to star it.</span>
          </div>
        ) : (
          starredMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => {
                setActiveChatId(msg.chat_id);
                onClose();
              }}
              className="p-3 bg-gray-50 dark:bg-wa-dark-header hover:bg-gray-100 dark:hover:bg-wa-dark-border/60 border border-gray-200 dark:border-wa-dark-border rounded-xl cursor-pointer transition-colors relative group"
            >
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-wa-dark-muted mb-1">
                <span className="font-semibold text-wa-teal">{msg.sender_name}</span>
                <span>{new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
              <p className="text-xs text-gray-800 dark:text-wa-dark-text leading-relaxed">
                {msg.normalized_content}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                <span>In {msg.chat_name || 'Direct Chat'}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStarMessage(msg.id);
                  }}
                  className="text-amber-500 hover:text-red-500 transition-colors"
                  title="Unstar"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
