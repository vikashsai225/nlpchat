import React from 'react';
import { Palette, X, Check } from 'lucide-react';

export const WALLPAPERS = [
  {
    id: 'classic',
    name: 'Classic Doodle',
    desc: 'Subtle clean doodle pattern',
    previewClass: 'wa-wallpaper-light bg-amber-50'
  },
  {
    id: 'emerald',
    name: 'Emerald Glass Mesh',
    desc: 'Deep modern green gradient',
    previewClass: 'bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950'
  },
  {
    id: 'nebula',
    name: 'Midnight Nebula',
    desc: 'Modern dark violet-teal AMOLED vibe',
    previewClass: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    desc: 'Warm sunset gradient tones',
    previewClass: 'bg-gradient-to-br from-amber-800/80 via-orange-900/80 to-purple-950'
  }
];

export function WallpaperModal({ isOpen, onClose, currentWallpaper, onSelectWallpaper }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl border border-gray-200 dark:border-wa-dark-border overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-wa-teal to-wa-teal-dark px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            <h2 className="text-base font-bold">Chat Themes & Wallpapers</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-wa-dark-muted mb-2">
            Choose a wallpaper style to personalize your chat experience:
          </p>

          <div className="grid grid-cols-2 gap-3">
            {WALLPAPERS.map((wp) => {
              const isSelected = currentWallpaper === wp.id;
              return (
                <div
                  key={wp.id}
                  onClick={() => onSelectWallpaper(wp.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-wa-teal ring-2 ring-wa-teal/30 shadow-md bg-emerald-50/20'
                      : 'border-gray-200 dark:border-wa-dark-border hover:border-gray-400 bg-gray-50/50 dark:bg-wa-dark-header'
                  }`}
                >
                  <div className={`h-16 rounded-lg mb-2 shadow-inner flex items-center justify-center relative overflow-hidden ${wp.previewClass}`}>
                    {isSelected && (
                      <span className="p-1 bg-wa-teal text-white rounded-full shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-gray-900 dark:text-wa-dark-text">{wp.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-wa-dark-muted mt-0.5">{wp.desc}</div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-wa-teal text-white rounded-xl text-xs font-bold hover:bg-wa-teal-dark transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
