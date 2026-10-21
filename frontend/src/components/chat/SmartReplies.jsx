import React from 'react';
import { Sparkles } from 'lucide-react';

export function SmartReplies({ replies, onSelectReply }) {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
      <Sparkles className="w-3.5 h-3.5 text-wa-teal shrink-0" />
      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-wa-dark-muted shrink-0">
        Suggestions:
      </span>
      {replies.map((reply, idx) => (
        <button
          key={idx}
          onClick={() => onSelectReply(reply)}
          className="shrink-0 px-3 py-1 bg-white dark:bg-wa-dark-bubble border border-wa-teal/40 hover:border-wa-teal text-gray-800 dark:text-wa-dark-text hover:bg-emerald-50/50 dark:hover:bg-wa-teal/10 rounded-full text-xs font-medium transition-all shadow-2xs hover:shadow-xs"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
