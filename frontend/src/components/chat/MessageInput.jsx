import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Zap, Edit3, Check, Smile, Volume2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { NormalizedPreviewCard } from './NormalizedPreviewCard';
import { SmartReplies } from './SmartReplies';
import { playSendSound } from '../../utils/sound';

const POPULAR_EMOJIS = [
  '😀', '😂', '🥰', '😎', '🤔', '🔥', '❤️', '👍', '🙏', '🎉',
  '✨', '☕', '🍕', '💪', '🚀', '💯', '👋', '🥳', '🙌', '👀'
];

export function MessageInput() {
  const { user } = useAuth();
  const { normalizeText, sendApprovedMessage, sendTypingStart, sendTypingStop, messages } = useChat();

  const [rawText, setRawText] = useState('');
  const [selectedTone, setSelectedTone] = useState(user?.default_tone || 'Natural');
  const [allowViewOriginal, setAllowViewOriginal] = useState(user?.allow_view_original !== 'nobody');
  const [previewData, setPreviewData] = useState(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const typingTimeoutRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Extract smart replies from the latest received message if available
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const showSmartReplies = lastMessage && lastMessage.sender_id !== user?.id && !rawText;

  // Voice to text hook
  const { isListening, isSupported, toggleListening } = useSpeechToText((transcript) => {
    setRawText(transcript);
    triggerLivePreview(transcript, selectedTone);
  });

  // Handle typing input and debounce preview
  const handleInputChange = (e) => {
    const val = e.target.value;
    setRawText(val);

    // Typing socket event
    sendTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 1500);

    // Instant debounce for live normalization
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        triggerLivePreview(val, selectedTone);
      }, 250);
    } else {
      setPreviewData(null);
      setIsEditingPreview(false);
    }
  };

  const triggerLivePreview = async (text, tone) => {
    if (!text || !text.trim()) return null;
    setIsNormalizing(true);
    try {
      const result = await normalizeText(text.trim(), tone);
      if (result) {
        setPreviewData(result);
        return result;
      }
    } catch (err) {
      // Silent fallback
    } finally {
      setIsNormalizing(false);
    }
    return null;
  };

  const handleToneChange = (newTone) => {
    setSelectedTone(newTone);
    if (rawText.trim()) {
      triggerLivePreview(rawText, newTone);
    }
  };

  const handleInsertEmoji = (emoji) => {
    setRawText((prev) => prev + emoji);
    triggerLivePreview(rawText + emoji, selectedTone);
  };

  // Direct send normalized English message
  const handleSend = async () => {
    const textToSend = rawText.trim();
    if (!textToSend || isSending) return;

    setIsSending(true);

    try {
      let payload = previewData;
      if (!payload || !payload.normalized) {
        payload = await triggerLivePreview(textToSend, selectedTone);
      }

      const finalApprovedText = payload?.normalized || textToSend;
      const finalLanguage = payload?.language || 'English';
      const finalTone = selectedTone || 'Natural';
      const finalConfidence = payload?.confidence || 1.0;
      const finalIsQuestion = Boolean(payload?.is_question);
      const finalUrgency = payload?.urgency || 'normal';
      const finalPossibleScam = Boolean(payload?.possible_scam);

      playSendSound();

      sendApprovedMessage({
        rawContent: textToSend,
        approvedContent: finalApprovedText,
        language: finalLanguage,
        tone: finalTone,
        confidence: finalConfidence,
        is_question: finalIsQuestion,
        urgency: finalUrgency,
        possible_scam: finalPossibleScam,
        allowViewOriginal,
        isEditedBySender: isEditingPreview
      });

      // Clear input and state immediately
      setRawText('');
      setPreviewData(null);
      setIsEditingPreview(false);
      setShowEmojiPicker(false);
      sendTypingStop();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSmartReplyClick = (replyText) => {
    setRawText(replyText);
    triggerLivePreview(replyText, selectedTone);
  };

  const toneConfig = {
    Natural: { label: 'Natural 🌿', color: 'hover:text-emerald-600' },
    Friendly: { label: 'Friendly 😊', color: 'hover:text-amber-600' },
    Formal: { label: 'Formal 👔', color: 'hover:text-blue-600' },
    Concise: { label: 'Concise ⚡', color: 'hover:text-purple-600' }
  };

  return (
    <div className="relative border-t border-white/10 bg-[#11172a]/95 backdrop-blur-md">
      {/* Smart Reply suggestions */}
      {showSmartReplies ? (
        <SmartReplies
          replies={lastMessage?.smart_replies || ['Sounds good!', 'Sure, will do!', 'Let me check.']}
          onSelectReply={handleSmartReplyClick}
        />
      ) : null}

      {/* Full Editable Preview Card */}
      {previewData && isEditingPreview ? (
        <NormalizedPreviewCard
          rawText={rawText}
          previewData={previewData}
          selectedTone={selectedTone}
          onToneChange={handleToneChange}
          onApproveAndSend={({ approvedContent, ...rest }) => {
            playSendSound();
            sendApprovedMessage({
              rawContent: rawText.trim(),
              approvedContent,
              ...rest
            });
            setRawText('');
            setPreviewData(null);
            setIsEditingPreview(false);
          }}
          onCancel={() => setIsEditingPreview(false)}
          allowViewOriginal={allowViewOriginal}
          setAllowViewOriginal={setAllowViewOriginal}
        />
      ) : null}

      {/* Realtime Live Normalization Banner */}
      {previewData && !isEditingPreview && rawText.trim() ? (
        <div className="mx-3 my-1.5 px-3.5 py-2 bg-[#161d34] rounded-xl border border-cyan-300/25 shadow-xs flex items-center justify-between gap-2 animate-slide-up select-none">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">
              <Zap className="w-3 h-3 text-wa-teal fill-wa-teal" />
              AI Normalizer
            </span>
            <div className="text-xs text-gray-800 dark:text-wa-dark-text truncate">
              <span className="text-gray-400 dark:text-wa-dark-muted font-normal mr-1">Sends as:</span>
              <span className="font-semibold text-wa-teal">{previewData.normalized}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tone Selector Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-wa-dark-header p-0.5 rounded-lg border border-black/5 dark:border-white/5">
              {['Natural', 'Friendly', 'Formal', 'Concise'].map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => handleToneChange(tone)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    selectedTone === tone
                      ? 'bg-wa-teal text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-wa-dark-muted'
                  }`}
                >
                  {toneConfig[tone]?.label || tone}
                </button>
              ))}
            </div>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => setIsEditingPreview(true)}
              className="px-2 py-1 bg-gray-100 dark:bg-wa-dark-header hover:bg-gray-200 dark:hover:bg-wa-dark-border text-gray-700 dark:text-wa-dark-text rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Edit translation before sending"
            >
              <Edit3 className="w-3 h-3 text-gray-500" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Voice Waveform Activity Indicator */}
      {isListening ? (
        <div className="mx-3 my-1 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold">Listening in real-time... Speak in any language or slang!</span>
          </div>
          <div className="flex items-center gap-0.5 h-3">
            {[4, 12, 8, 16, 6, 14, 9, 15, 7, 13].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Emoji Picker Popover Drawer */}
      {showEmojiPicker ? (
        <div className="mx-3 my-1.5 p-2 bg-white dark:bg-wa-dark-panel rounded-xl border border-gray-200 dark:border-wa-dark-border shadow-md animate-slide-up">
          <div className="text-[10px] font-bold text-gray-400 dark:text-wa-dark-muted px-1 mb-1">
            Quick Emojis & Reactions:
          </div>
          <div className="flex flex-wrap gap-1">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="text-base p-1.5 hover:scale-130 hover:bg-gray-100 dark:hover:bg-wa-dark-header rounded-lg transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Composer Input Bar */}
      <div className="flex items-center px-3 py-3 gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            showEmojiPicker
              ? 'text-wa-teal bg-emerald-50 dark:bg-emerald-950/40'
              : 'text-gray-500 hover:text-gray-700 dark:text-wa-dark-muted dark:hover:text-white'
          }`}
          title="Insert emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Voice-to-Text Button */}
        {isSupported ? (
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-full transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-voice-pulse shadow-md'
                : 'text-gray-500 dark:text-wa-dark-muted hover:text-gray-700 dark:hover:text-white'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Voice-to-text input in any language'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        ) : null}

        {/* Text Input */}
        <div className="flex-1 relative bg-[#0b1020] rounded-2xl border border-white/10 focus-within:border-cyan-300/60 focus-within:shadow-[0_0_0_3px_rgba(103,232,249,0.08)] transition-all">
          <input
            type="text"
            value={rawText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to speech...'
                : 'Type naturally in any slang, Hinglish, or SMS... (Direct normalized delivery)'
            }
            className="w-full pl-4 pr-24 py-2.5 bg-transparent text-sm text-gray-900 dark:text-wa-dark-text placeholder-gray-400 dark:placeholder-wa-dark-muted focus:outline-none"
          />

          {/* Direct Send Indicator Badge */}
          <div
            className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[10px] text-wa-teal bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-bold select-none cursor-default"
            title="Every message is automatically converted to clear English and sent directly"
          >
            <Zap className="w-3 h-3 text-wa-teal fill-wa-teal" />
            <span className="hidden md:inline">Auto-English</span>
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!rawText.trim() || isSending}
          className="p-2.5 bg-gradient-to-br from-cyan-300 to-violet-500 hover:from-cyan-200 hover:to-violet-400 disabled:opacity-40 text-slate-950 rounded-xl transition-all shadow-xs hover:shadow-md shrink-0 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
          title="Direct Normalized Send (Delivers in clear English)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
