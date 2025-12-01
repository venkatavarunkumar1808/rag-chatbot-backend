require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Validate required environment variables
const requiredEnvVars = ['JINA_API_KEY', 'GEMINI_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v] || process.env[v].includes('your_'));
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing or invalid environment variables: ${missingVars.join(', ')}`);
  console.warn('Please update .env file with valid API keys');
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'RAG Chatbot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      newSession: 'POST /api/session/new',
      chat: 'POST /api/chat',
      history: 'GET /api/session/:sessionId/history',
      clearSession: 'DELETE /api/session/:sessionId'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Global error handling
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 API: http://${HOST}:${PORT}`);
  console.log(`🌍 Frontend CORS: Enabled for localhost:3000, 3001, 3003`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});