import React from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder = "Search or start new chat" }) {
  return (
    <div className="px-3 py-3 bg-[#0f1425] border-b border-white/[0.06]">
      <div className="relative flex items-center bg-[#080b16] rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-cyan-300/60 transition-all">
        <Search className="w-4 h-4 text-slate-500 shrink-0 mr-2.5" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-wa-dark-text ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
