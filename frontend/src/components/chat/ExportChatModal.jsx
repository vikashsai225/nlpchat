import React from 'react';
import { X, Download, FileText, Printer } from 'lucide-react';
import { exportChatAsTxt, exportChatAsPdf } from '../../utils/exportHelper';

export function ExportChatModal({ isOpen, onClose, chat, messages }) {
  if (!isOpen || !chat) return null;

  const handleDownloadTxt = () => {
    exportChatAsTxt(chat.title || 'chat', messages);
    onClose();
  };

  const handleDownloadPdf = () => {
    exportChatAsPdf(chat.title || 'chat', messages);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-wa-dark-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-wa-teal dark:bg-wa-dark-header text-white">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <h2 className="text-base font-semibold">Export Conversation</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-wa-dark-muted">
            Export the complete chat history with timestamps and normalized natural English messages ({messages.length} messages).
          </p>

          <div className="space-y-2.5">
            <button
              onClick={handleDownloadTxt}
              className="w-full p-3 bg-gray-50 dark:bg-wa-dark-header hover:bg-gray-100 dark:hover:bg-wa-dark-border/60 rounded-xl border border-gray-200 dark:border-wa-dark-border flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-wa-teal shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-wa-dark-text">Download as Plain Text (.TXT)</div>
                <div className="text-[11px] text-gray-500 dark:text-wa-dark-muted">Lightweight transcript format</div>
              </div>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="w-full p-3 bg-gray-50 dark:bg-wa-dark-header hover:bg-gray-100 dark:hover:bg-wa-dark-border/60 rounded-xl border border-gray-200 dark:border-wa-dark-border flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg text-blue-600 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-wa-dark-text">Print / Save as PDF</div>
                <div className="text-[11px] text-gray-500 dark:text-wa-dark-muted">Formatted chat transcript</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
