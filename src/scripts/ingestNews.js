require('dotenv').config();
const NewsIngestor = require('../services/newsIngestor');
const EmbeddingService = require('../services/embeddings');
const VectorStore = require('../services/vectorStore');

async function ingestNews() {
  console.log('🚀 Starting news ingestion...\n');
  
  const ingestor = new NewsIngestor();
  const embeddings = new EmbeddingService();
  const vectorStore = new VectorStore();
  
  try {
    // Initialize vector store
    await vectorStore.initialize();
    
    // RSS feeds to fetch from
    const rssFeeds = [
      'https://www.reuters.com/rssFeed/worldNews',
      'https://www.reuters.com/rssFeed/technologyNews',
      'https://www.reuters.com/rssFeed/businessNews',
      'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
      'https://feeds.bbci.co.uk/news/world/rss.xml'
    ];
    
    // Fetch articles
    console.log('📰 Fetching articles from RSS feeds...\n');
    const articles = await ingestor.fetchFromRSS(rssFeeds);
    
    // Limit to 50 articles
    const selectedArticles = articles.slice(0, 50);
    console.log(`\n✅ Selected ${selectedArticles.length} articles for ingestion\n`);
    
    // Create embeddings
    console.log('🔄 Creating embeddings...\n');
    const texts = selectedArticles.map(a => `${a.title}\n${a.content}`);
    const embeddingVectors = await embeddings.batchEmbed(texts);
    
    // Store in vector database
    console.log('\n💾 Storing in vector database...\n');
    await vectorStore.upsertDocuments(selectedArticles, embeddingVectors);
    
    // Verify
    const count = await vectorStore.getCount();
    console.log(`\n✅ Ingestion complete! Total documents: ${count}`);
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

ingestNews();