import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { api } from '../../utils/api';
import { useChat } from '../../context/ChatContext';

export function NewChatModal({ isOpen, onClose }) {
  const { setActiveChatId, loadChats } = useChat();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async (query = '') => {
    setLoading(true);
    try {
      const endpoint = query ? `/users/search?q=${encodeURIComponent(query)}` : '/users/contacts';
      const data = await api.get(endpoint);
      setContacts(data.contacts || data.users || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    loadContacts(val);
  };

  const handleStartChat = async (recipientId) => {
    try {
      const res = await api.post('/chats/direct', { recipientId });
      await loadChats();
      setActiveChatId(res.chatId);
      onClose();
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-wa-dark-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-wa-teal dark:bg-wa-dark-header text-white">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-base font-semibold">New Contact</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-wa-dark-border">
          <div className="flex items-center bg-gray-100 dark:bg-wa-dark-header rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Add by name, username, or phone..."
              className="w-full bg-transparent text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-wa-dark-border/40">
          {loading ? (
            <div className="p-6 text-center text-xs text-gray-400">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No contacts found</div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                onClick={() => handleStartChat(c.id)}
                className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-wa-dark-header cursor-pointer transition-colors"
              >
                <img
                  src={c.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.username}`}
                  alt={c.display_name}
                  className="w-10 h-10 rounded-full bg-gray-200 mr-3 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-wa-dark-text truncate">
                    {c.display_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-wa-dark-muted truncate">
                    {c.phone || `@${c.username}`} {c.bio ? `• ${c.bio}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
