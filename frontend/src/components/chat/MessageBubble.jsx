import React, { useState } from 'react';
import { Star, ShieldAlert, AlertTriangle, Eye, EyeOff, Edit2, Copy, Check, Smile } from 'lucide-react';
import { MessageTicks } from './MessageTicks';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'];

export function MessageBubble({ message, isGroup }) {
  const { user } = useAuth();
  const { toggleStarMessage, viewOriginalMessage } = useChat();

  const isSent = message.sender_id === user?.id;
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalContent, setOriginalContent] = useState(message.raw_content || null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [originalError, setOriginalError] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleToggleOriginal = async () => {
    if (showOriginal) {
      setShowOriginal(false);
      return;
    }

    if (originalContent) {
      setShowOriginal(true);
      return;
    }

    setLoadingOriginal(true);
    setOriginalError(null);
    try {
      const raw = await viewOriginalMessage(message.id);
      setOriginalContent(raw);
      setShowOriginal(true);
    } catch (err) {
      setOriginalError(err.message || 'Original kept private');
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleAddReaction = (emoji) => {
    setReactions((prev) => {
      if (prev.includes(emoji)) {
        return prev.filter((r) => r !== emoji);
      }
      return [...prev, emoji];
    });
    setShowReactionPicker(false);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.normalized_content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex w-full my-1.5 ${isSent ? 'justify-end' : 'justify-start'} group px-2 sm:px-4 relative select-none`}>
      {/* Floating Hover Action & Reaction Pill */}
      <div
        className={`absolute -top-7 ${
          isSent ? 'right-6' : 'left-6'
        } opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 flex items-center gap-1 bg-white dark:bg-wa-dark-panel border border-gray-200 dark:border-wa-dark-border shadow-md rounded-full px-2 py-1 backdrop-blur-md`}
      >
        {/* Quick Reactions */}
        <div className="flex items-center gap-1 mr-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddReaction(emoji)}
              className="text-xs hover:scale-130 transition-transform p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-wa-dark-header"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="w-[1px] h-3.5 bg-gray-200 dark:bg-wa-dark-border" />

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopyText}
          className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full transition-colors"
          title="Copy English message"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Star Button */}
        <button
          type="button"
          onClick={() => toggleStarMessage(message.id)}
          className={`p-1 transition-colors rounded-full ${
            message.is_starred ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'
          }`}
          title="Star message"
        >
          <Star className={`w-3.5 h-3.5 ${message.is_starred ? 'fill-amber-500' : ''}`} />
        </button>
      </div>

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl px-3.5 py-2 shadow-xs transition-all duration-200 hover:shadow-md ${
          isSent
            ? 'bg-wa-light-sent dark:bg-wa-dark-sent text-gray-900 dark:text-wa-dark-text rounded-tr-xs border border-wa-teal/15 dark:border-wa-teal/10'
            : 'bg-wa-light-bubble dark:bg-wa-dark-bubble text-gray-900 dark:text-wa-dark-text rounded-tl-xs border border-gray-200/40 dark:border-wa-dark-border/40'
        }`}
      >
        {/* Group Sender Name */}
        {isGroup && !isSent ? (
          <div className="text-[11px] font-bold text-wa-teal mb-0.5 truncate">
            {message.sender_name || 'Participant'}
          </div>
        ) : null}

        {/* Urgent or Scam indicator badge */}
        {message.possible_scam ? (
          <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-semibold rounded-md">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Safety Alert
          </div>
        ) : null}

        {message.urgency === 'urgent' ? (
          <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[10px] font-semibold rounded-md">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Urgent
          </div>
        ) : null}

        {/* Normalized Message Content (Primary display) */}
        <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap select-text font-normal">
          {message.normalized_content}
        </div>

        {/* Revealed Original Message Drawer/Box */}
        {showOriginal ? (
          <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs bg-black/5 dark:bg-white/5 rounded-xl p-2.5 animate-slide-up">
            <div className="flex items-center justify-between text-[10px] font-medium text-gray-500 dark:text-wa-dark-muted mb-1">
              <span>Original input ({message.language || 'Hinglish'}):</span>
              {message.is_edited_by_sender ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <Edit2 className="w-2.5 h-2.5" /> Sender edited
                </span>
              ) : null}
            </div>
            <div className="font-mono text-[12px] text-gray-800 dark:text-gray-200 select-text bg-white/60 dark:bg-black/20 p-1.5 rounded-lg border border-black/5 dark:border-white/5">
              {originalContent}
            </div>
          </div>
        ) : null}

        {/* Active Emoji Reaction Badges */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactions.map((r, idx) => (
              <span
                key={idx}
                onClick={() => handleAddReaction(r)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/90 dark:bg-wa-dark-panel border border-gray-200 dark:border-wa-dark-border rounded-full text-[11px] shadow-2xs cursor-pointer hover:scale-110 transition-transform"
              >
                <span>{r}</span>
                <span className="text-[10px] font-bold text-gray-500 dark:text-wa-dark-muted">1</span>
              </span>
            ))}
          </div>
        )}

        {/* Footer Meta: Metadata chips, View Original trigger, Time, and Status Ticks */}
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-500 dark:text-wa-dark-muted select-none">
          {/* Subtle View Original Toggle */}
          {Boolean(isSent || message.allow_view_original) ? (
            <button
              onClick={handleToggleOriginal}
              className="text-[10px] hover:underline text-gray-500 dark:text-wa-dark-muted hover:text-wa-teal dark:hover:text-wa-teal mr-1 flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              title="Toggle original raw text"
            >
              {loadingOriginal ? (
                <span>loading...</span>
              ) : showOriginal ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Hide raw</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Original</span>
                </>
              )}
            </button>
          ) : null}

          {originalError ? (
            <span className="text-[10px] text-gray-400 italic mr-1">{originalError}</span>
          ) : null}

          {/* Star Icon if starred */}
          {message.is_starred ? (
            <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-0.5" />
          ) : null}

          {/* Time Stamp */}
          <span className="text-[10px] ml-0.5">{formatTime(message.created_at)}</span>

          {/* Sent/Delivered/Read Ticks (For messages sent by user) */}
          {Boolean(isSent) ? <MessageTicks status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}
