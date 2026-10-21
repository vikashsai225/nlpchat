import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, FileText } from 'lucide-react';
import { api } from '../../utils/api';

export function GroupSummaryModal({ isOpen, onClose, chat }) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && chat) {
      loadSummary();
    }
  }, [isOpen, chat]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/summary/${chat.id}`);
      setSummaryData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    const text = `${summaryData.summary}\n\nKey Points:\n${(summaryData.key_points || []).map((p) => `• ${p}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-wa-dark-border animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-wa-teal dark:bg-wa-dark-header text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-base font-semibold">Conversation Summary</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500 dark:text-wa-dark-muted flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-wa-teal animate-spin" />
              <span>Generating concise summary...</span>
            </div>
          ) : !summaryData ? (
            <div className="text-center py-8 text-xs text-gray-400">Unable to generate summary</div>
          ) : (
            <>
              {/* Summary Overview */}
              <div className="p-4 bg-gray-50 dark:bg-wa-dark-header rounded-xl border border-gray-200 dark:border-wa-dark-border">
                <div className="text-xs font-bold text-wa-teal uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Overview ({summaryData.total_messages} messages analyzed)
                </div>
                <p className="text-sm leading-relaxed text-gray-800 dark:text-wa-dark-text">
                  {summaryData.summary}
                </p>
              </div>

              {/* Key Points */}
              {summaryData.key_points && summaryData.key_points.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 dark:text-wa-dark-muted uppercase tracking-wider mb-2.5">
                    Key Highlights & Decisions
                  </div>
                  <ul className="space-y-2">
                    {summaryData.key_points.map((point, idx) => (
                      <li
                        key={idx}
                        className="text-xs p-2.5 bg-white dark:bg-wa-dark-panel border border-gray-200 dark:border-wa-dark-border rounded-lg text-gray-700 dark:text-wa-dark-text flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-wa-teal mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-wa-dark-header border-t border-gray-200 dark:border-wa-dark-border flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Summarized using normalized English</span>
          <button
            onClick={handleCopy}
            disabled={loading || !summaryData}
            className="px-4 py-2 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Summary
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
