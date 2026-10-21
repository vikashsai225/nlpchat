import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import { playNotificationSound } from '../utils/sound';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { user, token } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { [chatId]: [displayName] }
  const [starredMessages, setStarredMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  // Track online/offline browser state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Flush offline queue
      flushOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load all user chats
  const loadChats = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingChats(true);
      const data = await api.get('/chats');
      setChats(data.chats || []);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadChats();
    } else {
      setChats([]);
      setActiveChatId(null);
      setMessages([]);
    }
  }, [token, loadChats]);

  // Load messages for the active chat
  const loadMessages = useCallback(async (chatId) => {
    if (!chatId || !token) return;
    try {
      setLoadingMessages(true);
      const data = await api.get(`/messages/${chatId}`);
      setMessages(data.messages || []);
      // Mark read via socket
      const socket = getSocket(token);
      if (socket && socket.connected) {
        socket.emit('mark_read', { chatId });
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
      const socket = getSocket(token);
      if (socket) {
        socket.emit('join_chat', activeChatId);
      }
    }
  }, [activeChatId, loadMessages, token]);

  // Load Starred Messages
  const loadStarredMessages = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get('/messages/user/starred');
      setStarredMessages(data.starred || []);
    } catch (err) {
      console.error('Failed to load starred messages:', err);
    }
  }, [token]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // If message belongs to active chat, append it
      if (activeChatIdRef.current === msg.chat_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.client_id && m.client_id === msg.client_id))) {
            return prev;
          }
          return [...prev, msg];
        });
        // Play notification chime and mark as read
        if (msg.sender_id !== user?.id) {
          playNotificationSound();
          socket.emit('mark_read', { chatId: msg.chat_id });
        }
      } else {
        // Incoming message in background chat
        if (msg.sender_id !== user?.id) {
          playNotificationSound();
        }
      }

      // Update chats list last message
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === msg.chat_id) {
            return {
              ...c,
              last_message_text: msg.normalized_content,
              last_message_at: msg.created_at
            };
          }
          return c;
        })
      );
    };

    const handleChatUpdated = ({ chatId, lastMessage, lastMessageAt }) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              last_message_text: lastMessage,
              last_message_at: lastMessageAt
            };
          }
          return c;
        })
      );
    };

    const handleUserTyping = ({ chatId, userId, displayName }) => {
      if (userId === user?.id) return;
      setTypingUsers((prev) => ({
        ...prev,
        [chatId]: Array.from(new Set([...(prev[chatId] || []), displayName]))
      }));
    };

    const handleUserStopTyping = ({ chatId, userId }) => {
      setTypingUsers((prev) => {
        const current = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: current.filter((name) => name !== userId)
        };
      });
    };

    const handleMessagesRead = ({ chatId, readerId }) => {
      if (activeChatIdRef.current === chatId) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === user?.id ? { ...m, status: 'read' } : m))
        );
      }
    };

    const handleUserStatusChanged = ({ userId, isOnline: online, lastSeen }) => {
      setChats((prev) =>
        prev.map((c) => {
          if (!c.is_group && c.recipient && c.recipient.id === userId) {
            return {
              ...c,
              recipient: {
                ...c.recipient,
                is_online: online ? 1 : 0,
                last_seen: lastSeen
              }
            };
          }
          return c;
        })
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('chat_updated', handleChatUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('chat_updated', handleChatUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [token, user]);

  // Request invisible normalization preview
  const normalizeText = async (rawText, targetTone = 'Natural') => {
    if (!rawText || !rawText.trim()) return null;
    try {
      const data = await api.post('/messages/normalize', {
        rawText,
        targetTone
      });
      return data;
    } catch (err) {
      // Invisible fallback preview
      return {
        language: 'English',
        normalized: rawText.trim(),
        tone: targetTone,
        confidence: 0.9,
        is_question: rawText.includes('?'),
        urgency: 'normal',
        possible_scam: false,
        smart_replies: []
      };
    }
  };

  // Send approved normalized message directly
  const sendApprovedMessage = async (messageData) => {
    if (!activeChatId) return;

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      id: clientId,
      client_id: clientId,
      chat_id: activeChatId,
      sender_id: user.id,
      sender_name: user.display_name,
      sender_avatar: user.avatar_url,
      raw_content: messageData.rawContent,
      normalized_content: messageData.approvedContent,
      language: messageData.language || 'English',
      tone: messageData.tone || 'Natural',
      confidence: messageData.confidence || 1.0,
      is_question: messageData.is_question ? 1 : 0,
      urgency: messageData.urgency || 'normal',
      possible_scam: messageData.possible_scam ? 1 : 0,
      allow_view_original: messageData.allowViewOriginal !== false ? 1 : 0,
      is_edited_by_sender: messageData.isEditedBySender ? 1 : 0,
      status: isOnline ? 'sent' : 'pending',
      created_at: new Date().toISOString()
    };

    // Optimistically show approved message in UI
    setMessages((prev) => [...prev, optimisticMessage]);

    // Update chats list last message
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              last_message_text: messageData.approvedContent,
              last_message_at: optimisticMessage.created_at
            }
          : c
      )
    );

    const payload = {
      clientId,
      chatId: activeChatId,
      rawContent: messageData.rawContent,
      approvedContent: messageData.approvedContent,
      language: messageData.language,
      tone: messageData.tone,
      confidence: messageData.confidence,
      is_question: messageData.is_question,
      urgency: messageData.urgency,
      possible_scam: messageData.possible_scam,
      allowViewOriginal: messageData.allowViewOriginal !== false,
      isEditedBySender: messageData.isEditedBySender
    };

    // If offline, store in offlineQueue
    if (!navigator.onLine) {
      setOfflineQueue((prev) => [...prev, payload]);
      return;
    }

    // Send via Socket.io for instantaneous delivery or fallback to REST API
    const socket = getSocket(token);
    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        if (res && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m.client_id === clientId ? { ...res.message, is_starred: m.is_starred } : m))
          );
        }
      });
    } else {
      try {
        const res = await api.post('/messages/send', payload);
        if (res && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m.client_id === clientId ? { ...res.message, is_starred: m.is_starred } : m))
          );
        }
      } catch (err) {
        console.error('Failed to send message via REST:', err);
      }
    }
  };

  // Flush offline queue when reconnected
  const flushOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    const queueToFlush = [...offlineQueue];
    setOfflineQueue([]);

    for (const item of queueToFlush) {
      try {
        await api.post('/messages/send', item);
        setMessages((prev) =>
          prev.map((m) => (m.client_id === item.clientId ? { ...m, status: 'sent' } : m))
        );
      } catch (e) {
        console.error('Error flushing message:', e);
      }
    }
  };

  // Typing indicators
  const sendTypingStart = () => {
    const socket = getSocket(token);
    if (socket && activeChatId) {
      socket.emit('typing_start', { chatId: activeChatId });
    }
  };

  const sendTypingStop = () => {
    const socket = getSocket(token);
    if (socket && activeChatId) {
      socket.emit('typing_stop', { chatId: activeChatId });
    }
  };

  // Toggle star / bookmark
  const toggleStarMessage = async (messageId) => {
    try {
      const res = await api.post(`/messages/${messageId}/star`);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_starred: res.is_starred ? 1 : 0 } : m))
      );
      loadStarredMessages();
    } catch (err) {
      console.error('Failed to star message:', err);
    }
  };

  // Request original raw message if permitted
  const viewOriginalMessage = async (messageId) => {
    try {
      const data = await api.post(`/messages/${messageId}/view-original`);
      return data.raw_content;
    } catch (err) {
      throw err;
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        setActiveChatId,
        activeChat,
        messages,
        loadingChats,
        loadingMessages,
        loadChats,
        loadMessages,
        normalizeText,
        sendApprovedMessage,
        sendTypingStart,
        sendTypingStop,
        typingUsers: typingUsers[activeChatId] || [],
        toggleStarMessage,
        viewOriginalMessage,
        starredMessages,
        loadStarredMessages,
        isOnline
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
