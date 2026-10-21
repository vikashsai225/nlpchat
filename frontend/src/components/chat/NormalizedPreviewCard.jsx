import React, { useState, useEffect } from 'react';
import { Send, X, AlertTriangle, ShieldAlert, Sparkles, Check, Edit3, Eye, EyeOff } from 'lucide-react';

export function NormalizedPreviewCard({
  rawText,
  previewData,
  selectedTone,
  onToneChange,
  onApproveAndSend,
  onCancel,
  allowViewOriginal,
  setAllowViewOriginal
}) {
  const [editedText, setEditedText] = useState('');
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (previewData && previewData.normalized) {
      setEditedText(previewData.normalized);
      setIsEdited(false);
    }
  }, [previewData]);

  if (!previewData || !previewData.normalized) {
    return null;
  }

  const handleTextChange = (e) => {
    setEditedText(e.target.value);
    setIsEdited(true);
  };

  const handleSend = () => {
    if (!editedText.trim()) return;
    onApproveAndSend({
      rawContent: rawText,
      approvedContent: editedText.trim(),
      language: previewData.language,
      tone: selectedTone,
      confidence: previewData.confidence,
      is_question: previewData.is_question,
      urgency: previewData.urgency,
      possible_scam: previewData.possible_scam,
      allowViewOriginal,
      isEditedBySender: isEdited
    });
  };

  return (
    <div className="mx-3 mb-2 p-3.5 bg-white dark:bg-wa-dark-panel rounded-2xl shadow-xl border border-wa-teal/40 dark:border-wa-teal/30 animate-slide-up backdrop-blur-md">
      {/* Header bar with Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-wa-dark-border/60">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Detected Language Chip */}
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-wa-dark-header text-gray-700 dark:text-wa-dark-text rounded-md text-[11px] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-wa-teal inline-block" />
            {previewData.language}
          </span>

          {/* Confidence Chip */}
          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md text-[11px] font-medium">
            100% Match
          </span>

          {/* Tone Chip */}
          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-md text-[11px] font-medium">
            {selectedTone}
          </span>
        </div>

        {/* Tone Selector Pills */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-wa-dark-header p-0.5 rounded-lg">
          {['Natural', 'Friendly', 'Formal', 'Concise'].map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => onToneChange(tone)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                selectedTone === tone
                  ? 'bg-wa-teal text-white shadow-xs'
                  : 'text-gray-600 dark:text-wa-dark-muted hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings (if any) */}
      {previewData.possible_scam && (
        <div className="mt-2.5 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Notice: This message contains sensitive or financial request terminology.</span>
        </div>
      )}

      {previewData.urgency === 'urgent' && (
        <div className="mt-2.5 p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>High Urgency Detected</span>
        </div>
      )}

      {/* Editable Normalized Message Body */}
      <div className="mt-3 relative">
        <div className="text-[11px] font-medium text-gray-400 dark:text-wa-dark-muted mb-1 flex items-center justify-between">
          <span>Editable English Preview (Receiver will see this directly):</span>
          {isEdited && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Custom edited
            </span>
          )}
        </div>
        <textarea
          rows={2}
          value={editedText}
          onChange={handleTextChange}
          className="w-full p-2.5 bg-gray-50 dark:bg-wa-dark-header border border-gray-200 dark:border-wa-dark-border rounded-xl text-sm font-normal text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal focus:ring-1 focus:ring-wa-teal resize-none"
        />
      </div>

      {/* Action Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-wa-dark-border/60">
        {/* Privacy Toggle */}
        <button
          type="button"
          onClick={() => setAllowViewOriginal(!allowViewOriginal)}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-wa-dark-muted hover:text-gray-800 dark:hover:text-wa-dark-text cursor-pointer transition-colors"
          title="Toggle whether receiver can click View Original"
        >
          {allowViewOriginal ? (
            <>
              <Eye className="w-3.5 h-3.5 text-wa-teal" />
              <span>Recipient can view original</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-gray-400" />
              <span>Original kept private</span>
            </>
          )}
        </button>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-wa-dark-muted hover:text-gray-800 dark:hover:text-white rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-1.5 bg-wa-teal hover:bg-wa-teal-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 hover:shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            Send Approved
          </button>
        </div>
      </div>
    </div>
  );
}
