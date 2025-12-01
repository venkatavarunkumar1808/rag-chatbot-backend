const axios = require('axios');

class VectorStore {
  constructor() {
    this.baseUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.collectionName = 'news_articles';
  }

  async initialize() {
    try {
      // Check if collection exists
      const checkUrl = `${this.baseUrl}/collections/${this.collectionName}`;
      await axios.get(checkUrl);
      console.log('✅ Collection already exists');
    } catch (error) {
      if (error.response?.status === 404) {
        // Create collection
        await axios.put(`${this.baseUrl}/collections/${this.collectionName}`, {
          vectors: {
            size: 768, // Jina embedding dimension
            distance: 'Cosine'
          }
        });
        console.log('✅ Created new collection');
      } else {
        throw error;
      }
    }
  }

  async upsertDocuments(documents, embeddings) {
    const points = documents.map((doc, idx) => ({
      id: idx + 1,
      vector: embeddings[idx],
      payload: {
        title: doc.title,
        content: doc.content,
        link: doc.link,
        pubDate: doc.pubDate,
        source: doc.source
      }
    }));

    await axios.put(
      `${this.baseUrl}/collections/${this.collectionName}/points?wait=true`,
      { points }
    );
    
    console.log(`✅ Upserted ${points.length} documents`);
  }

  async search(queryEmbedding, topK = 5) {
    const response = await axios.post(
      `${this.baseUrl}/collections/${this.collectionName}/points/search`,
      {
        vector: queryEmbedding,
        limit: topK,
        with_payload: true
      }
    );
    return response.data.result;
  }

  async getCount() {
    const response = await axios.get(
      `${this.baseUrl}/collections/${this.collectionName}`
    );
    return response.data.result.points_count;
  }
}

module.exports = VectorStore;