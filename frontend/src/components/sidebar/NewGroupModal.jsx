import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { api } from '../../utils/api';
import { useChat } from '../../context/ChatContext';

export function NewGroupModal({ isOpen, onClose }) {
  const { setActiveChatId, loadChats } = useChat();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      setName('');
      setDescription('');
      setSelectedIds([]);
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      const data = await api.get('/users/contacts');
      setContacts(data.contacts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/chats/group', {
        name: name.trim(),
        description: description.trim(),
        participantIds: selectedIds
      });
      await loadChats();
      setActiveChatId(res.chat.id);
      onClose();
    } catch (err) {
      console.error('Create group failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-wa-dark-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-wa-teal dark:bg-wa-dark-header text-white">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5" />
            <h2 className="text-base font-semibold">New Group</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Apollo Team"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topic or team goal"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-wa-dark-text mb-2">
              Select Members ({selectedIds.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-wa-dark-border/40 border border-gray-200 dark:border-wa-dark-border rounded-lg">
              {contacts.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-wa-dark-header cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={c.avatar_url} alt={c.display_name} className="w-8 h-8 rounded-full bg-gray-200" />
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-wa-dark-text">
                          {c.display_name}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-wa-dark-muted">@{c.username}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-wa-teal border-wa-teal text-white'
                          : 'border-gray-300 dark:border-wa-dark-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating Group...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}
