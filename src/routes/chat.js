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
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session: ' + error.message });
  }
});

// Send message
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    // Validate input
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 5000 characters' });
    }
    
    // Get history
    const history = await sessions.getHistory(sessionId);
    
    // Save user message
    await sessions.saveMessage(sessionId, {
      role: 'user',
      content: message.trim(),
      timestamp: Date.now()
    });
    
    // Query RAG
    const result = await rag.query(message, history);
    
    // Save bot response
    await sessions.saveMessage(sessionId, {
      role: 'assistant',
      content: result.answer,
      sources: result.sources || [],
      timestamp: Date.now()
    });
    
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('API key')) {
      statusCode = 503;
      errorMessage = 'API key is not configured. Please contact administrator.';
    } else if (error.message.includes('Invalid')) {
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timeout. Please try again.';
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Get session history
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const history = await sessions.getHistory(sessionId);
    res.json({ history, count: history.length });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history: ' + error.message });
  }
});

// Clear session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    await sessions.clearSession(sessionId);
    res.json({ message: 'Session cleared successfully', sessionId });
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({ error: 'Failed to clear session: ' + error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const redisHealthy = await sessions.checkConnection();
    res.json({ 
      status: redisHealthy ? 'healthy' : 'degraded',
      redis: redisHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;