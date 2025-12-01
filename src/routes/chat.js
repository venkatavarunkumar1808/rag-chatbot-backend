const express = require('express');
const router = express.Router();
const RAGPipeline = require('../services/ragPipeline');
const SessionManager = require('../config/redis');

const rag = new RAGPipeline();
const sessions = new SessionManager();

// Create new session
router.post('/session/new', (req, res) => {
  try {
    const sessionId = sessions.generateSessionId();
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }
    
    // Get history
    const history = await sessions.getHistory(sessionId);
    
    // Save user message
    await sessions.saveMessage(sessionId, {
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    
    // Query RAG
    const result = await rag.query(message, history);
    
    // Save bot response
    await sessions.saveMessage(sessionId, {
      role: 'assistant',
      content: result.answer,
      sources: result.sources,
      timestamp: Date.now()
    });
    
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session history
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const history = await sessions.getHistory(req.params.sessionId);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    await sessions.clearSession(req.params.sessionId);
    res.json({ message: 'Session cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

module.exports = router;