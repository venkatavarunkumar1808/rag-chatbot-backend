const Redis = require('ioredis');

class SessionManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    
    this.ttl = 3600; // 1 hour TTL for sessions

    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  async saveMessage(sessionId, message) {
    const key = `session:${sessionId}`;
    await this.redis.rpush(key, JSON.stringify(message));
    await this.redis.expire(key, this.ttl);
  }

  async getHistory(sessionId) {
    const key = `session:${sessionId}`;
    const messages = await this.redis.lrange(key, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }

  async clearSession(sessionId) {
    const key = `session:${sessionId}`;
    await this.redis.del(key);
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async close() {
    await this.redis.quit();
  }
}

module.exports = SessionManager;