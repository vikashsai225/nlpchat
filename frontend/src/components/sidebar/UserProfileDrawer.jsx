import React, { useState } from 'react';
import { X, Check, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

export function UserProfileDrawer({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', {
        display_name: displayName,
        bio
      });
      updateUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 sm:w-96 bg-white dark:bg-wa-dark-panel z-50 shadow-2xl border-r border-gray-200 dark:border-wa-dark-border flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-wa-teal dark:bg-wa-dark-header p-5 text-white flex items-center justify-between">
        <h2 className="text-base font-semibold">Profile</h2>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <img
            src={user?.avatar_url}
            alt={user?.display_name}
            className="w-24 h-24 rounded-full border-4 border-wa-teal/20 shadow-md bg-gray-100 dark:bg-wa-dark-header"
          />
          <div className="mt-2 text-xs text-gray-500 dark:text-wa-dark-muted font-mono">@{user?.username}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-wa-dark-muted">{user?.phone}</div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-wa-teal mb-1.5 uppercase tracking-wider">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-wa-teal mb-1.5 uppercase tracking-wider">
            About
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : saving ? (
            'Saving...'
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
