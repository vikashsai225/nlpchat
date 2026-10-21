import React, { useState } from 'react';
import { X, Settings, Shield, Clock, Languages, Sliders, Moon, Sun, BookA, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../utils/api';

export function SettingsModal({ isOpen, onClose, onOpenDictionary }) {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [defaultTone, setDefaultTone] = useState(user?.default_tone || 'Natural');
  const [receiveLang, setReceiveLang] = useState(user?.preferred_receive_language || 'English');
  const [allowViewOriginal, setAllowViewOriginal] = useState(user?.allow_view_original || 'contacts');
  const [autoDeleteHours, setAutoDeleteHours] = useState(user?.auto_delete_hours || 0);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', {
        default_tone: defaultTone,
        preferred_receive_language: receiveLang,
        allow_view_original: allowViewOriginal,
        auto_delete_hours: autoDeleteHours
      });
      updateUser(res.user);
      onClose();
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-wa-dark-border animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-wa-teal dark:bg-wa-dark-header text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5" />
            <h2 className="text-base font-semibold">Settings & Privacy</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Appearance */}
          <div>
            <div className="text-xs font-bold text-wa-teal uppercase tracking-wider mb-3 flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Appearance
            </div>
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-wa-dark-header rounded-xl border border-gray-200 dark:border-wa-dark-border">
              <span className="text-sm font-medium text-gray-800 dark:text-wa-dark-text">Theme</span>
              <button
                onClick={toggleTheme}
                className="px-3.5 py-1.5 bg-white dark:bg-wa-dark-panel rounded-lg border border-gray-200 dark:border-wa-dark-border text-xs font-semibold text-gray-800 dark:text-wa-dark-text shadow-sm hover:border-wa-teal transition-all"
              >
                {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>
          </div>

          {/* Default Normalization Tone */}
          <div>
            <div className="text-xs font-bold text-wa-teal uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Default Conversion Tone
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Natural', 'Friendly', 'Formal', 'Concise'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDefaultTone(t)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    defaultTone === t
                      ? 'bg-wa-teal text-white border-wa-teal shadow-sm'
                      : 'bg-gray-50 dark:bg-wa-dark-header text-gray-700 dark:text-wa-dark-text border-gray-200 dark:border-wa-dark-border hover:border-wa-teal'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Receive Language */}
          <div>
            <div className="text-xs font-bold text-wa-teal uppercase tracking-wider mb-3 flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Receive Language Preference
            </div>
            <select
              value={receiveLang}
              onChange={(e) => setReceiveLang(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-wa-dark-header border border-gray-200 dark:border-wa-dark-border rounded-xl text-sm text-gray-800 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
            >
              <option value="English">English (Recommended)</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Hindi">Hindi</option>
              <option value="Arabic">Arabic</option>
            </select>
          </div>

          {/* Privacy Controls (View Original) */}
          <div>
            <div className="text-xs font-bold text-wa-teal uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Original Message Privacy
            </div>
            <div className="space-y-2">
              {[
                { id: 'contacts', title: 'My Contacts Only', desc: 'Recipients in your chat list can click to see raw text' },
                { id: 'everyone', title: 'Everyone', desc: 'Any recipient can view the original text' },
                { id: 'nobody', title: 'Nobody (Maximum Privacy)', desc: 'Only deliver normalized English; never reveal raw text' }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                    allowViewOriginal === opt.id
                      ? 'border-wa-teal bg-emerald-50/50 dark:bg-wa-teal/10'
                      : 'border-gray-200 dark:border-wa-dark-border bg-gray-50 dark:bg-wa-dark-header'
                  }`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={opt.id}
                    checked={allowViewOriginal === opt.id}
                    onChange={(e) => setAllowViewOriginal(e.target.value)}
                    className="mt-0.5 text-wa-teal focus:ring-wa-teal mr-3"
                  />
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-wa-dark-text">{opt.title}</div>
                    <div className="text-[11px] text-gray-500 dark:text-wa-dark-muted">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Auto-Delete / Disappearing Messages */}
          <div>
            <div className="text-xs font-bold text-wa-teal uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Disappearing Messages (Auto-Delete)
            </div>
            <select
              value={autoDeleteHours}
              onChange={(e) => setAutoDeleteHours(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-wa-dark-header border border-gray-200 dark:border-wa-dark-border rounded-xl text-sm text-gray-800 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
            >
              <option value={0}>Off (Keep messages permanently)</option>
              <option value={24}>24 Hours</option>
              <option value={168}>7 Days</option>
              <option value={2160}>90 Days</option>
            </select>
          </div>

          {/* Personal Slang Dictionary Shortcut */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDictionary();
              }}
              className="w-full py-2.5 px-4 bg-gray-100 dark:bg-wa-dark-header hover:bg-gray-200 dark:hover:bg-wa-dark-border rounded-xl text-xs font-semibold text-gray-800 dark:text-wa-dark-text flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-wa-dark-border"
            >
              <BookA className="w-4 h-4 text-wa-teal" />
              Open Personal Slang Dictionary
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-wa-dark-header border-t border-gray-200 dark:border-wa-dark-border flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={logout}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-wa-dark-muted hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
