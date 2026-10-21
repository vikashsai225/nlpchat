import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, BookA, Sparkles } from 'lucide-react';
import { api } from '../../utils/api';

export function PersonalDictionaryModal({ isOpen, onClose }) {
  const [entries, setEntries] = useState([]);
  const [slangTerm, setSlangTerm] = useState('');
  const [normalizedMeaning, setNormalizedMeaning] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEntries();
    }
  }, [isOpen]);

  const loadEntries = async () => {
    try {
      const data = await api.get('/dictionary');
      setEntries(data.entries || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!slangTerm.trim() || !normalizedMeaning.trim()) return;
    setLoading(true);
    try {
      await api.post('/dictionary', {
        slang_term: slangTerm.trim(),
        normalized_meaning: normalizedMeaning.trim()
      });
      setSlangTerm('');
      setNormalizedMeaning('');
      await loadEntries();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/dictionary/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-wa-dark-border animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-wa-teal dark:bg-wa-dark-header text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <BookA className="w-5 h-5" />
            <h2 className="text-base font-semibold">Personal Slang Dictionary</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          <p className="text-xs text-gray-500 dark:text-wa-dark-muted">
            Add custom slang, acronyms, or local idioms that you frequently use. The normalizer will translate them according to your preferred definitions.
          </p>

          {/* Add Form */}
          <form onSubmit={handleAdd} className="p-3.5 bg-gray-50 dark:bg-wa-dark-header rounded-xl border border-gray-200 dark:border-wa-dark-border space-y-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-wa-dark-text flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-wa-teal" />
              Add New Mapping
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={slangTerm}
                onChange={(e) => setSlangTerm(e.target.value)}
                placeholder="Slang / Term (e.g. bt)"
                className="px-3 py-2 bg-white dark:bg-wa-dark-panel border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
              />
              <input
                type="text"
                required
                value={normalizedMeaning}
                onChange={(e) => setNormalizedMeaning(e.target.value)}
                placeholder="Meaning (e.g. stressful situation)"
                className="px-3 py-2 bg-white dark:bg-wa-dark-panel border border-gray-300 dark:border-wa-dark-border rounded-lg text-sm text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !slangTerm.trim() || !normalizedMeaning.trim()}
              className="w-full py-2 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Save to My Dictionary
            </button>
          </form>

          {/* Entries List */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-wa-dark-muted mb-2">
              Active Custom Terms ({entries.length})
            </div>
            {entries.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                No custom terms defined yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-wa-dark-border/40 border border-gray-200 dark:border-wa-dark-border rounded-xl overflow-hidden">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-wa-dark-panel hover:bg-gray-50 dark:hover:bg-wa-dark-header/60 transition-colors"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-wa-teal mr-2">
                        {entry.slang_term}
                      </span>
                      <span className="text-xs text-gray-700 dark:text-wa-dark-text">
                        → {entry.normalized_meaning}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete term"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
