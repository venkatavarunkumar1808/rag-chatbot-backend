require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = 'localhost';

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3003', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'RAG Chatbot API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      newSession: 'POST /api/session/new',
      chat: 'POST /api/chat',
      history: 'GET /api/session/:sessionId/history',
      clearSession: 'DELETE /api/session/:sessionId'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 API: http://${HOST}:${PORT}`);
});