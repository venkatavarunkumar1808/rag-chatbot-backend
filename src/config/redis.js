const Redis = require('ioredis');

class SessionManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });
    
    this.ttl = parseInt(process.env.SESSION_TTL, 10) || 3600; // 1 hour TTL
    this.maxMessageSize = 10000;

    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis ready');
    });
  }

  validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new Error('Invalid session ID');
    }
    return sessionId;
  }

  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message: must be an object');
    }
    if (!message.role || !message.content) {
      throw new Error('Invalid message: missing role or content');
    }
    if (JSON.stringify(message).length > this.maxMessageSize) {
      throw new Error(`Message exceeds maximum size of ${this.maxMessageSize} characters`);
    }
    return message;
  }

  async saveMessage(sessionId, message) {
    try {
      const validSessionId = this.validateSessionId(sessionId);
      const validMessage = this.validateMessage(message);
      
      const key = `session:${validSessionId}`;
      await this.redis.rpush(key, JSON.stringify(validMessage));
      await this.redis.expire(key, this.ttl);
    } catch (error) {
      console.error('Error saving message:', error.message);
      throw error;
    }
  }

  async getHistory(sessionId) {
    try {
      const validSessionId = this.validateSessionId(sessionId);
      const key = `session:${validSessionId}`;
      const messages = await this.redis.lrange(key, 0, -1);
      
      return messages
        .map(msg => {
          try {
            return JSON.parse(msg);
          } catch (e) {
            console.error('Error parsing message:', e.message);
            return null;
          }
        })
        .filter(msg => msg !== null);
    } catch (error) {
      console.error('Error getting history:', error.message);
      throw error;
    }
  }

  async clearSession(sessionId) {
    try {
      const validSessionId = this.validateSessionId(sessionId);
      const key = `session:${validSessionId}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('Error clearing session:', error.message);
      throw error;
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async checkConnection() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis connection check failed:', error.message);
      return false;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
    }
  }
}

module.exports = SessionManager;