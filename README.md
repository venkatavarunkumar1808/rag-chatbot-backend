# RAG Chatbot Backend

A Retrieval-Augmented Generation (RAG) chatbot backend for news websites, built with Node.js, Express, Redis, Qdrant, Jina Embeddings, and Google Gemini API.

## Features

- **RAG Pipeline**: Ingests news articles, creates embeddings, stores in vector database, and generates responses using retrieved context.
- **Session Management**: Redis-based session handling with TTL for chat history.
- **News Ingestion**: Fetches articles from RSS feeds and scrapes content.
- **REST API**: Endpoints for chat, session management, and history retrieval.

## Tech Stack

- **Backend**: Node.js, Express
- **Embeddings**: Jina AI Embeddings (free tier)
- **Vector Store**: Qdrant
- **LLM**: Google Gemini API (free trial)
- **Cache & Sessions**: Redis (in-memory)
- **News Parsing**: RSS-Parser, Cheerio

## Prerequisites

- Node.js (v16 or higher)
- Docker (for Redis and Qdrant)
- API Keys:
  - Jina AI API Key: https://jina.ai/embeddings
  - Google Gemini API Key: https://aistudio.google.com/apikey

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd rag-chatbot-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env` and fill in your API keys:
   ```env
   JINA_API_KEY=your_jina_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Running Services

### Start Redis
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Start Qdrant
```bash
docker run -d -p 6333:6333 qdrant/qdrant
```

## Usage

### Ingest News Articles
```bash
npm run ingest
```
This will fetch ~50 articles from RSS feeds, create embeddings, and store them in Qdrant.

### Start the Server
```bash
npm run dev  # Development mode with nodemon
# or
npm start    # Production mode
```

The API will be available at `http://localhost:5000`.

## API Endpoints

### Create New Session
```http
POST /api/session/new
```
Response: `{ "sessionId": "session_1234567890_abc123" }`

### Send Chat Message
```http
POST /api/chat
Content-Type: application/json

{
  "sessionId": "session_1234567890_abc123",
  "message": "What are the latest tech news?"
}
```
Response:
```json
{
  "answer": "Based on recent articles...",
  "sources": [
    {
      "title": "Article Title",
      "link": "https://...",
      "score": 0.85
    }
  ]
}
```

### Get Session History
```http
GET /api/session/{sessionId}/history
```
Response:
```json
{
  "history": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": 1234567890
    },
    {
      "role": "assistant",
      "content": "Hi there!",
      "sources": [...],
      "timestamp": 1234567891
    }
  ]
}
```

### Clear Session
```http
DELETE /api/session/{sessionId}
```
Response: `{ "message": "Session cleared successfully" }`

### Health Check
```http
GET /api/health
```
Response: `{ "status": "ok", "timestamp": 1234567890 }`

## Caching Strategy

- **Session History**: Stored in Redis with 1-hour TTL
- **Vector Search**: No additional caching (Qdrant handles indexing)
- **API Responses**: Not cached (real-time generation)

### TTL Configuration
- Session TTL: 3600 seconds (1 hour)
- Can be adjusted in `src/config/redis.js`

## Testing the API

```bash
# Create session
curl -X POST http://localhost:5000/api/session/new

# Send message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your_session_id", "message": "What are the latest tech news?"}'

# Get history
curl http://localhost:5000/api/session/your_session_id/history

# Clear session
curl -X DELETE http://localhost:5000/api/session/your_session_id
```

## Project Structure

```
rag-chatbot-backend/
├── src/
│   ├── config/
│   │   └── redis.js
│   ├── services/
│   │   ├── embeddings.js
│   │   ├── vectorStore.js
│   │   ├── newsIngestor.js
│   │   └── ragPipeline.js
│   ├── routes/
│   │   └── chat.js
│   ├── scripts/
│   │   └── ingestNews.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Deployment

This backend can be deployed to services like:
- Render.com
- Railway
- Heroku
- AWS/GCP/Azure

For production, ensure:
- Environment variables are set
- Redis and Qdrant are accessible
- CORS is configured for your frontend domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License