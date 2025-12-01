const axios = require('axios');
const EmbeddingService = require('./embeddings');
const VectorStore = require('./vectorStore');

class RAGPipeline {
  constructor() {
    this.embeddings = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.maxContextLength = 500;
    this.maxHistoryLength = 5;
    this.topK = 5;
  }

  validateInput(userQuery) {
    if (!userQuery || typeof userQuery !== 'string') {
      throw new Error('Invalid query: must be a non-empty string');
    }
    if (userQuery.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }
    if (userQuery.length > 5000) {
      throw new Error('Query exceeds maximum length of 5000 characters');
    }
    return userQuery.trim();
  }

  async query(userQuery, sessionHistory = []) {
    try {
      // Validate input
      const validatedQuery = this.validateInput(userQuery);

      // 1. Embed the query
      const queryEmbedding = await this.embeddings.createEmbedding(validatedQuery);
      
      // 2. Retrieve top-k relevant documents
      const results = await this.vectorStore.search(queryEmbedding, this.topK);
      
      if (!results || results.length === 0) {
        return {
          answer: 'Sorry, I could not find relevant articles to answer your question. Please try a different query.',
          sources: []
        };
      }
      
      // 3. Format context from retrieved documents
      const context = results
        .map((r, i) => {
          const content = r.payload.content ? r.payload.content.substring(0, this.maxContextLength) : 'No content';
          return `[Document ${i+1}]\nTitle: ${r.payload.title || 'N/A'}\nContent: ${content}...\nSource: ${r.payload.link || 'N/A'}`;
        })
        .join('\n\n');
      
      // 4. Build prompt with context and history
      const relevantHistory = Array.isArray(sessionHistory) 
        ? sessionHistory.slice(-this.maxHistoryLength) 
        : [];
      
      const historyText = relevantHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      const prompt = `You are a helpful news assistant. Use the following context to answer the question.

Context from news articles:
${context}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}
User Question: ${validatedQuery}

Answer based on the context provided. If the answer isn't in the context, say so. Keep your answer concise and relevant.`;

      // 5. Generate response with Gemini
      if (!this.geminiApiKey || this.geminiApiKey.includes('your_')) {
        throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in .env');
      }

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        },
        { timeout: 30000 }
      );
      
      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new Error('Invalid response from Gemini API');
      }
      
      const answer = response.data.candidates[0].content.parts[0].text;
      
      return {
        answer,
        sources: results.map(r => ({
          title: r.payload.title || 'Unknown',
          link: r.payload.link || '#',
          score: r.score || 0
        }))
      };
    } catch (error) {
      console.error('RAG Pipeline error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = RAGPipeline;