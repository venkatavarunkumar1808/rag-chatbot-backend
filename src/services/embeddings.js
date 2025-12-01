const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.jinaApiKey = process.env.JINA_API_KEY;
    this.apiUrl = 'https://api.jina.ai/v1/embeddings';
    this.model = 'jina-embeddings-v2-base-en';
  }

  async createEmbedding(text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          input: [text],
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.jinaApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Embedding error:', error.response?.data || error.message);
      throw error;
    }
  }

  async batchEmbed(texts, delayMs = 100) {
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
      console.log(`Embedding ${i + 1}/${texts.length}...`);
      const embedding = await this.createEmbedding(texts[i]);
      embeddings.push(embedding);
      
      // Rate limiting
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return embeddings;
  }
}

module.exports = EmbeddingService;