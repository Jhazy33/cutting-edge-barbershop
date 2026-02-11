# RAG Integration - Quick Start Guide

## Overview

This integration adds RAG (Retrieval-Augmented Generation) to the Cutting Edge chatbot, allowing it to retrieve relevant knowledge from the vector database before generating responses.

## Architecture

```
User Query
    ↓
ChatInterface (retrieveContext)
    ↓
POST /api/knowledge/search
    ↓
Vector Search (pgvector)
    ↓
Retrieved Context
    ↓
Enhanced System Prompt
    ↓
Ollama LLM
    ↓
Streaming Response + Sources
```

## Services

### 1. Handoff API (Port 3000)
- **Location**: `/services/handoff-api`
- **Endpoints**:
  - `POST /api/knowledge/search` - Search knowledge base
  - `POST /api/knowledge/learn` - Add new knowledge
  - `GET /api/health` - Health check
- **Tech**: Hono + PostgreSQL + pgvector

### 2. Chatbot (Port 3001)
- **Location**: `/services/chatbot`
- **Features**:
  - RAG context retrieval before LLM call
  - Streaming responses from Ollama
  - Source display with similarity scores
- **Tech**: React + Vite + Ollama

## Setup Instructions

### 1. Configure Environment Variables

**Handoff API** (`/services/handoff-api/.env`):
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text

# API
PORT=3000
NODE_ENV=development
```

**Chatbot** (`/services/chatbot/.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_OLLAMA_API=http://localhost:11434
```

### 2. Start Services

**Terminal 1 - Handoff API:**
```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api"
npm run dev
```

**Terminal 2 - Chatbot:**
```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/chatbot"
npm run dev
```

### 3. Access Chatbot

Open browser: `http://localhost:3001`

## Testing

### Test Queries

1. **Pricing Query**: "How much does a haircut cost?"
   - Expected: Returns pricing information with sources

2. **Hours Query**: "What are your hours?"
   - Expected: Returns operating hours with sources

3. **Staff Query**: "Who are the barbers?"
   - Expected: Returns staff information with sources

4. **Services Query**: "Do you do beard trims?"
   - Expected: Returns service information with sources

### API Testing

**Test Knowledge Search:**
```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "haircut prices",
    "shopId": 1,
    "limit": 3,
    "threshold": 0.7
  }'
```

**Test Add Knowledge:**
```bash
curl -X POST http://localhost:3000/api/knowledge/learn \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 1,
    "content": "Haircuts cost $30 for adults and $20 for kids",
    "category": "pricing",
    "source": "manual"
  }'
```

**Test Health:**
```bash
curl http://localhost:3000/api/health
```

## Features

### RAG Context Retrieval
- Queries vector database before LLM call
- Retrieves top 3 relevant knowledge entries
- Filters by similarity threshold (0.7)
- Shows sources in chat UI

### Enhanced System Prompt
- Base prompt: Barbershop assistant
- Dynamic context: Retrieved knowledge
- Instructions: Use provided information accurately

### Source Display
- Shows content preview
- Displays category badge
- Shows similarity score
- Grouped by response

## Troubleshooting

### Issue: API Not Connecting
- Check if handoff-api is running on port 3000
- Verify `.env` file exists in handoff-api
- Check browser console for CORS errors

### Issue: No Sources Retrieved
- Verify database has knowledge data
- Check `knowledge_base_rag` table has embeddings
- Try lowering threshold in query
- Check Ollama embedding service is running

### Issue: Ollama Not Responding
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check model is pulled: `ollama pull llama2`
- Check embed model: `ollama pull nomic-embed-text`

### Issue: Database Connection Failed
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure pgvector extension is installed
- Test connection: `psql -h localhost -U postgres`

## Performance Optimization

The system includes:
- **Embedding Cache**: Repeated queries use cached embeddings
- **Batch Processing**: Process multiple embeddings efficiently
- **Vector Indexes**: HNSW indexes for fast approximate search
- **Connection Pooling**: Reuse database connections

## Monitoring

Check logs for:
- `✅ Cache hit for embedding` - Using cached embeddings
- `⚠️ Slow query` - Query taking >100ms
- Performance metrics recorded automatically

## Deployment

For production deployment:
1. Update environment variables with production URLs
2. Build chatbot: `npm run build`
3. Start API with PM2 or systemd
4. Configure nginx reverse proxy
5. Enable CORS for production domain
