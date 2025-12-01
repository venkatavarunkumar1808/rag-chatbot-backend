const axios = require('axios');
const EmbeddingService = require('./embeddings');
const VectorStore = require('./vectorStore');

class RAGPipeline {
  constructor() {
    this.embeddings = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  async query(userQuery, sessionHistory = []) {
    try {
      // 1. Embed the query
      const queryEmbedding = await this.embeddings.createEmbedding(userQuery);
      
      // 2. Retrieve top-k relevant documents
      const results = await this.vectorStore.search(queryEmbedding, 5);
      
      // 3. Format context from retrieved documents
      const context = results.map((r, i) => 
        `[Document ${i+1}]
Title: ${r.payload.title}
Content: ${r.payload.content.substring(0, 500)}...
Source: ${r.payload.link}
`
      ).join('\n');
      
      // 4. Build prompt with context and history
      const historyText = sessionHistory.slice(-5).map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');
      
      const prompt = `You are a helpful news assistant. Use the following context to answer the question.

Context from news articles:
${context}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}
User Question: ${userQuery}

Answer based on the context provided. If the answer isn't in the context, say so. Keep your answer concise and relevant.`;

      // 5. Generate response with Gemini
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
        }
      );
      
      const answer = response.data.candidates[0].content.parts[0].text;
      
      return {
        answer,
        sources: results.map(r => ({
          title: r.payload.title,
          link: r.payload.link,
          score: r.score
        }))
      };
    } catch (error) {
      console.error('RAG Pipeline error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = RAGPipeline;