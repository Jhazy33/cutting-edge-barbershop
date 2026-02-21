# Chatbot Testing Quick Start

## Quick Test Commands

### 1. Test Backend Directly (Fastest)

```bash
# Start all services
cd /Users/jhazy/AI_Projects/Cutting\ Edge
docker-compose -f docker-compose.chatbot.yml up -d

# Wait 10 seconds for services to start
sleep 10

# Test health endpoint
curl http://localhost:3000/api/health

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What services do you offer?",
    "shopId": 1,
    "conversationHistory": []
  }'
```

**Expected Output**:
```json
{
  "success": true,
  "response": "We offer various services including...",
  "sources": [...],
  "timestamp": "2026-02-11T..."
}
```

### 2. Test Frontend (Browser)

```bash
# Start chatbot dev server
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/chatbot
npm run dev

# Open browser
# http://localhost:5173

# Test messages to send:
- "What services do you offer?"
- "How much does a haircut cost?"
- "Where are you located?"
- "What are your hours?"
```

### 3. Test Docker Integration

```bash
# Build and start all services
cd /Users/jhazy/AI_Projects/Cutting\ Edge
docker-compose -f docker-compose.chatbot.yml up --build

# Open new terminal, check logs
docker-compose -f docker-compose.chatbot.yml logs -f

# Open browser to chatbot
# http://localhost:3001
```

### 4. View Service Logs

```bash
# All services
docker-compose -f docker-compose.chatbot.yml logs

# Specific service
docker logs cutting-edge-handoff-api
docker logs cutting-edge-chatbot
docker logs cutting-edge-ollama
docker logs cutting-edge-postgres

# Follow logs
docker logs -f cutting-edge-handoff-api
```

### 5. Check Service Status

```bash
# All containers
docker ps | grep cutting-edge

# Service health
curl http://localhost:3000/api/health
curl http://localhost:3001
curl http://localhost:11434/api/tags
```

### 6. Cleanup

```bash
# Stop all services
docker-compose -f docker-compose.chatbot.yml down

# Remove volumes (WARNING: deletes database data)
docker-compose -f docker-compose.chatbot.yml down -v

# Restart services
docker-compose -f docker-compose.chatbot.yml restart
```

---

## Common Issues & Fixes

### Issue: Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### Issue: Ollama Connection Failed

```bash
# Check Ollama container status
docker ps | grep ollama

# Restart Ollama
docker restart cutting-edge-ollama

# Pull model if missing
docker exec -it cutting-edge-ollama ollama pull gemma:2b
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL container
docker ps | grep postgres

# Check database logs
docker logs cutting-edge-postgres

# Connect to database
docker exec -it cutting-edge-postgres psql -U postgres -d nexxt_db

# Check tables
\dt
SELECT COUNT(*) FROM knowledge_base;
```

### Issue: Frontend Can't Connect

```bash
# Check API is running
curl http://localhost:3000/api/health

# Check CORS configuration
# services/handoff-api/src/index.ts line 39-43

# Check browser console for errors
# Open DevTools > Console
```

---

## Success Indicators

### Backend Success:
- Health check returns 200 OK
- Chat endpoint returns response < 10 seconds
- No errors in logs
- Sources array populated (if relevant context found)

### Frontend Success:
- Page loads without errors
- Messages send successfully
- Loading states appear
- Responses display with sources
- No console errors

### Integration Success:
- All containers running (docker ps)
- Services can communicate
- No network errors in logs
- End-to-end chat works

---

## Next Steps After Testing

If tests pass:
1. Deploy to VPS
2. Update PM2 configuration
3. Test production environment
4. Monitor for 24 hours

If tests fail:
1. Check logs above
2. Review error messages
3. Fix issues
4. Re-test

---

**Full Documentation**: See `CHATBOT_LOCAL_API_REFACTOR_COMPLETE.md`
