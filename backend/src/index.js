const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./db');

const { setupChatSocket } = require('./sockets/chatSocket');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const dictionaryRoutes = require('./routes/dictionary');
const userRoutes = require('./routes/users');
const summaryRoutes = require('./routes/summary');
const aiRoutes = require('./routes/aiConfig');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Setup Realtime WebSocket handlers
setupChatSocket(io);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'NLPChat Backend',
    timestamp: new Date().toISOString(),
    aiProviderActive: Boolean(config.GEMINI_API_KEY || config.OPENAI_API_KEY || config.ANTHROPIC_API_KEY),
    sqliteConnected: true
  });
});

// Serve frontend static build if dist exists
const fs = require('fs');
const distPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Background cleaner for expiring messages (Auto-delete / Disappearing messages)
const cleanerTimer = setInterval(() => {
  try {
    const nowIso = new Date().toISOString();
    const result = db.run("DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?", [nowIso]);
    if (result.changes > 0) {
      console.log(`[Auto-Delete] Purged ${result.changes} expired disappearing messages.`);
    }
  } catch (err) {
    // Non-fatal
  }
}, 5 * 60 * 1000); // Check every 5 minutes
cleanerTimer.unref();

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server if executed directly
if (require.main === module) {
  server.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 NLPChat Backend Server running on port ${config.PORT}`);
    console.log(`🔒 Environment: ${config.NODE_ENV}`);
    console.log(`🤖 AI Provider: ${config.GEMINI_API_KEY ? 'Gemini Active' : config.OPENAI_API_KEY ? 'OpenAI Active' : 'Local Fallback Engine Active (Offline Ready)'}`);
    console.log(`💬 Socket.IO Real-time messaging ready`);
    console.log(`====================================================`);
  });
}

module.exports = { app, server };
