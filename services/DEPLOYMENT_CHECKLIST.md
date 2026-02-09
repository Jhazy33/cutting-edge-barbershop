# RAG Integration - Deployment Checklist

## Pre-Deployment Checks

### 1. Prerequisites
- [ ] PostgreSQL running with pgvector extension
- [ ] Ollama running with llama2 and nomic-embed-text models
- [ ] Node.js and npm installed
- [ ] Database tables created (knowledge_base_rag, conversation_memory)

### 2. Environment Variables

**Handoff API** (`/services/handoff-api/.env`)
```bash
# Check these are set:
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
PORT=3000
NODE_ENV=development
```

**Chatbot** (`/services/chatbot/.env`)
```bash
# Check these are set:
VITE_API_URL=http://localhost:3000
VITE_OLLAMA_API=http://localhost:11434
```

### 3. Dependencies Installation
```bash
# Handoff API
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api"
npm install

# Chatbot
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/chatbot"
npm install
```

### 4. Database Setup

**Check pgvector extension:**
```bash
psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Check tables exist:**
```bash
psql -U postgres -d postgres -c "\dt knowledge_base_rag"
psql -U postgres -d postgres -c "\dt conversation_memory"
```

**Create tables if missing:**
```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api"
npm run ingest
```

### 5. Ollama Models

**Check models installed:**
```bash
ollama list
```

**Pull models if missing:**
```bash
ollama pull llama2
ollama pull nomic-embed-text
```

**Test Ollama:**
```bash
curl http://localhost:11434/api/tags
```

---

## Startup Procedure

### 1. Start Handoff API

```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api"
npm run dev
```

**Expected output:**
```
🚀 Starting Cutting Edge Handoff API on port 3000...
✅ Server running at http://localhost:3000
📚 Endpoints:
   POST /api/knowledge/search - Search knowledge base
   POST /api/knowledge/learn - Add new knowledge
   GET  /api/health - Health check
```

**Verify health:**
```bash
curl http://localhost:3000/api/health
```

### 2. Start Chatbot

```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/chatbot"
npm run dev
```

**Expected output:**
```
VITE v6.2.0 ready in XXX ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

### 3. Add Sample Knowledge

```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services"
./test_api.sh
```

**Or manually add:**
```bash
curl -X POST http://localhost:3000/api/knowledge/learn \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 1,
    "content": "Haircuts cost $30 for adults, $20 for kids",
    "category": "pricing",
    "source": "manual"
  }'
```

---

## Testing Checklist

### 1. API Health Check
- [ ] `GET /api/health` returns 200
- [ ] Response includes status: "ok"
- [ ] Response includes timestamp

### 2. Knowledge Search
- [ ] `POST /api/knowledge/search` works
- [ ] Returns relevant results
- [ ] Similarity scores present
- [ ] Categories correct

### 3. Knowledge Learn
- [ ] `POST /api/knowledge/learn` works
- [ ] Returns ID
- [ ] Data inserted in database

### 4. Chatbot Interface
- [ ] Loads at http://localhost:3001
- [ ] Welcome message displays
- [ ] Suggested questions clickable
- [ ] Input field accepts text

### 5. End-to-End Flow
- [ ] Type "How much is a haircut?"
- [ ] Loading indicator shows
- [ ] Response streams in real-time
- [ ] Sources display at bottom
- [ ] Similarity scores shown

### 6. Test Queries

**Pricing Query:**
```
Query: "How much does a haircut cost?"
Expected: Returns pricing info with sources
Status: [ ] PASS / [ ] FAIL
```

**Hours Query:**
```
Query: "What are your hours?"
Expected: Returns operating hours with sources
Status: [ ] PASS / [ ] FAIL
```

**Services Query:**
```
Query: "Do you do beard trims?"
Expected: Returns service info with sources
Status: [ ] PASS / [ ] FAIL
```

**Unknown Query:**
```
Query: "What's the weather?"
Expected: Graceful fallback, no sources
Status: [ ] PASS / [ ] FAIL
```

---

## Troubleshooting

### API Won't Start

**Check port in use:**
```bash
lsof -i :3000
```

**Kill process if needed:**
```bash
kill -9 <PID>
```

**Check database connection:**
```bash
psql -h localhost -U postgres -d postgres -c "SELECT 1;"
```

### Chatbot Won't Start

**Check port in use:**
```bash
lsof -i :3001
```

**Clear cache:**
```bash
rm -rf node_modules/.vite
```

**Rebuild:**
```bash
npm run build
```

### No Sources Retrieved

**Check database has data:**
```bash
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM knowledge_base_rag;"
```

**Check embeddings exist:**
```bash
psql -U postgres -d postgres -c "SELECT id, content, embedding IS NOT NULL FROM knowledge_base_rag LIMIT 5;"
```

**Test embedding generation:**
```bash
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test"
}'
```

### Ollama Not Responding

**Check Ollama running:**
```bash
ps aux | grep ollama
```

**Start Ollama if stopped:**
```bash
ollama serve
```

**Test API:**
```bash
curl http://localhost:11434/api/tags
```

**Pull models if needed:**
```bash
ollama pull llama2
ollama pull nomic-embed-text
```

---

## Production Deployment

### 1. Build for Production

**Chatbot:**
```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/chatbot"
npm run build
```

**Handoff API:**
```bash
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api"
npm run build
```

### 2. Update Environment

**Production API URL:**
```bash
# In chatbot .env
VITE_API_URL=https://api.cuttingedge.com
VITE_OLLAMA_API=https://ollama.cuttingedge.com
```

**CORS Origins:**
```bash
# Update in handoff-api/src/index.ts
origin: ['https://cuttingedge.cihconsultingllc.com']
```

### 3. Deploy Services

**Option A: Docker**
```bash
docker-compose up -d
```

**Option B: PM2**
```bash
pm2 start "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api/dist/index.js" --name handoff-api
pm2 start "/Users/jhazy/AI_Projects/Cutting Edge/services/chatbot" --name chatbot
```

**Option C: Systemd**
```bash
sudo systemctl start handoff-api
sudo systemctl start chatbot
```

### 4. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name chat-ce.cihconsultingllc.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api-ce.cihconsultingllc.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 5. SSL Configuration

```bash
sudo certbot --nginx -d chat-ce.cihconsultingllc.com
sudo certbot --nginx -d api-ce.cihconsultingllc.com
```

---

## Monitoring

### Health Checks

```bash
# API Health
watch -n 5 'curl -s http://localhost:3000/api/health | jq'

# Service Status
pm2 status
# or
systemctl status handoff-api chatbot
```

### Logs

```bash
# API Logs
pm2 logs handoff-api
# or
journalctl -u handoff-api -f

# Chatbot Logs
pm2 logs chatbot
# or
journalctl -u chatbot -f
```

### Database Performance

```bash
# Check slow queries
psql -U postgres -d postgres -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Rollback Plan

If deployment fails:

1. **Stop services**
```bash
pm2 stop all
# or
systemctl stop handoff-api chatbot
```

2. **Revert to previous version**
```bash
git checkout <previous-commit>
npm install
npm run build
```

3. **Restart services**
```bash
pm2 restart all
# or
systemctl start handoff-api chatbot
```

4. **Verify rollback**
```bash
curl http://localhost:3000/api/health
curl http://localhost:3001
```

---

## Success Criteria

Deployment successful if:
- [ ] All services running
- [ ] Health checks passing
- [ ] Database queries working
- [ ] Chatbot accessible via browser
- [ ] RAG retrieval functional
- [ ] Sources displaying correctly
- [ ] No errors in logs
- [ ] Performance acceptable (<2s responses)

---

## Support Contacts

**Development**: Claude Code (AI Assistant)
**Deployment**: System Administrator
**Database**: DBA Team
**Infrastructure**: DevOps Team

---

**Last Updated**: 2026-02-09
**Version**: 1.0.0
**Status**: Ready for Deployment
