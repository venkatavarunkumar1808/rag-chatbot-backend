const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

class NewsIngestor {
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  async fetchFromRSS(feedUrls) {
    const allArticles = [];
    
    for (const feedUrl of feedUrls) {
      try {
        console.log(`Fetching RSS from: ${feedUrl}`);
        const feed = await this.parser.parseURL(feedUrl);
        
        const articles = feed.items.map(item => ({
          title: item.title || 'No title',
          content: this.cleanText(item.contentSnippet || item.content || item.description || ''),
          link: item.link || '',
          pubDate: item.pubDate || new Date().toISOString(),
          source: feed.title || 'RSS Feed'
        }));
        
        allArticles.push(...articles);
        console.log(`✅ Fetched ${articles.length} articles from ${feed.title}`);
      } catch (error) {
        console.error(`❌ Error fetching ${feedUrl}:`, error.message);
      }
    }
    
    return allArticles;
  }

  async scrapeArticle(url) {
    try {
      const { data } = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(data);
      
      // Extract title
      const title = $('h1').first().text().trim() || 
                    $('title').text().trim() ||
                    'No title';
      
      // Extract content (try multiple selectors)
      const paragraphs = [];
      $('article p, .article-body p, .story-body p, p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) { // Filter out short paragraphs
          paragraphs.push(text);
        }
      });
      
      const content = this.cleanText(paragraphs.join('\n'));
      
      return { 
        title, 
        content, 
        link: url,
        pubDate: new Date().toISOString(),
        source: 'Scraped'
      };
    } catch (error) {
      console.error(`❌ Scraping error for ${url}:`, error.message);
      return null;
    }
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')           // Remove extra whitespace
      .replace(/\n+/g, '\n')          // Remove extra newlines
      .replace(/<[^>]*>/g, '')        // Remove HTML tags
      .trim()
      .substring(0, 5000);            // Limit length
  }
}

module.exports = NewsIngestor;