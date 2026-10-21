const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateSocket } = require('../middleware/auth');

// Track online socket count per user id
const onlineUsers = new Map();

function setupChatSocket(io) {
  // Use JWT authentication middleware for socket connections
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user.id;

    // Increment socket count
    const currentSockets = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, currentSockets + 1);

    // Update user online status in database
    const nowIso = new Date().toISOString();
    try {
      db.run('UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?', [nowIso, userId]);
    } catch (err) {
      console.warn('Status update error:', err.message);
    }

    // Join user's individual room for direct notifications
    socket.join(`user_${userId}`);

    // Broadcast online status to all
    io.emit('user_status_changed', {
      userId,
      isOnline: true,
      lastSeen: nowIso
    });

    // Join a specific chat room
    socket.on('join_chat', (chatId) => {
      if (chatId) {
        socket.join(`chat_${chatId}`);
      }
    });

    // Leave a specific chat room
    socket.on('leave_chat', (chatId) => {
      if (chatId) {
        socket.leave(`chat_${chatId}`);
      }
    });

    // Real-time typing indicators
    socket.on('typing_start', ({ chatId }) => {
      if (!chatId) return;
      socket.to(`chat_${chatId}`).emit('user_typing', {
        chatId,
        userId: user.id,
        displayName: user.display_name
      });
    });

    socket.on('typing_stop', ({ chatId }) => {
      if (!chatId) return;
      socket.to(`chat_${chatId}`).emit('user_stop_typing', {
        chatId,
        userId: user.id
      });
    });

    // Mark messages in a chat as read
    socket.on('mark_read', ({ chatId }) => {
      if (!chatId) return;
      const readAt = new Date().toISOString();
      try {
        db.run(
          `UPDATE messages SET status = 'read' WHERE chat_id = ? AND sender_id != ? AND status != 'read'`,
          [chatId, userId]
        );
        db.run(
          `UPDATE chat_participants SET last_read_at = ? WHERE chat_id = ? AND user_id = ?`,
          [readAt, chatId, userId]
        );

        io.to(`chat_${chatId}`).emit('messages_read', {
          chatId,
          readerId: userId,
          readAt
        });
      } catch (err) {
        console.warn('Mark read error:', err.message);
      }
    });

    // Real-time message dispatch (approved normalized message)
    socket.on('send_message', async (data, callback) => {
      try {
        const {
          clientId,
          chatId,
          rawContent,
          approvedContent,
          language,
          tone,
          confidence,
          is_question,
          urgency,
          possible_scam,
          allowViewOriginal,
          isEditedBySender
        } = data;

        if (!chatId || !approvedContent || !approvedContent.trim()) {
          if (callback) callback({ error: 'Missing chat ID or content' });
          return;
        }

        // Deduplication
        if (clientId) {
          const existing = db.get('SELECT * FROM messages WHERE client_id = ?', [clientId]);
          if (existing) {
            if (callback) callback({ message: existing, duplicate: true });
            return;
          }
        }

        const messageId = uuidv4();
        const now = new Date().toISOString();

        // Calculate auto-delete expiration
        const chat = db.get('SELECT auto_delete_hours FROM chats WHERE id = ?', [chatId]);
        const sender = db.get('SELECT auto_delete_hours, allow_view_original FROM users WHERE id = ?', [userId]);

        const deleteHours = (chat && chat.auto_delete_hours > 0) ? chat.auto_delete_hours : (sender?.auto_delete_hours || 0);
        let expiresAt = null;
        if (deleteHours > 0) {
          const expDate = new Date(Date.now() + deleteHours * 60 * 60 * 1000);
          expiresAt = expDate.toISOString();
        }

        // Privacy flag
        let canViewOriginal = 1;
        if (allowViewOriginal !== undefined) {
          canViewOriginal = allowViewOriginal ? 1 : 0;
        } else if (sender?.allow_view_original === 'nobody') {
          canViewOriginal = 0;
        }

        // Insert message
        db.run(
          `INSERT INTO messages (
            id, client_id, chat_id, sender_id, raw_content, normalized_content,
            language, tone, confidence, is_question, urgency, possible_scam,
            status, allow_view_original, is_edited_by_sender, expires_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered', ?, ?, ?, ?)`,
          [
            messageId,
            clientId || uuidv4(),
            chatId,
            userId,
            rawContent || approvedContent,
            approvedContent.trim(),
            language || 'English',
            tone || 'Natural',
            typeof confidence === 'number' ? confidence : 1.0,
            is_question ? 1 : 0,
            urgency || 'normal',
            possible_scam ? 1 : 0,
            canViewOriginal,
            isEditedBySender ? 1 : 0,
            expiresAt,
            now
          ]
        );

        // Update chat
        db.run(
          `UPDATE chats SET last_message_text = ?, last_message_at = ?, updated_at = ? WHERE id = ?`,
          [approvedContent.trim(), now, now, chatId]
        );

        const savedMessage = db.get(
          `SELECT m.*, u.display_name AS sender_name, u.avatar_url AS sender_avatar
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.id = ?`,
          [messageId]
        );

        // Send confirmation back to sender with raw content
        if (callback) {
          callback({ message: savedMessage });
        }

        // Broadcast to all participants in this chat
        // When broadcasting to other participants, ensure raw content is protected if privacy is enabled
        const receiverMessage = { ...savedMessage };
        if (!canViewOriginal || sender?.allow_view_original === 'nobody') {
          delete receiverMessage.raw_content;
        }

        // Broadcast to chat room
        socket.to(`chat_${chatId}`).emit('new_message', receiverMessage);

        // Notify participants who might not have chat actively open
        const participants = db.query(
          'SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?',
          [chatId, userId]
        );

        for (const p of participants) {
          io.to(`user_${p.user_id}`).emit('chat_updated', {
            chatId,
            lastMessage: approvedContent.trim(),
            lastMessageAt: now,
            senderName: user.display_name
          });
        }
      } catch (err) {
        console.error('Socket send_message error:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const remainingSockets = (onlineUsers.get(userId) || 1) - 1;
      if (remainingSockets <= 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date().toISOString();
        try {
          db.run('UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?', [lastSeen, userId]);
        } catch (err) {
          // Ignore
        }
        io.emit('user_status_changed', {
          userId,
          isOnline: false,
          lastSeen
        });
      } else {
        onlineUsers.set(userId, remainingSockets);
      }
    });
  });
}

module.exports = {
  setupChatSocket
};
