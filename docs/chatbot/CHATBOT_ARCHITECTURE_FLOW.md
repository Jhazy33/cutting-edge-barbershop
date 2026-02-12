# 🏗️ Chatbot Architecture & Flow Diagram

**Date**: 2026-02-12 00:30:00 EST
**Purpose**: Visual understanding of how the chatbot works from browser to AI response

---

## 🌐 COMPLETE USER FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                      │
│                   (Chrome/Safari/Firefox/Edge)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 1. User navigates to
                                      │    cuttingedge.cihconsultingllc.com
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MAIN WEBSITE                                           │
│                   cutting-edge_barber-shop_1                                │
│                      (Docker Container)                                     │
│                  Port: 80 (external)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 2. Page loads, shows "Need Help" button
                                      │    (FloatingConcierge.tsx component)
                                      │
                                      │ 3. User clicks button
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MODAL POPUP                                            │
│                   Shows two options:                                        │
│                   - Voice Mode → https://voice-ce.cihconsultingllc.com      │
│                   - Chat Mode → https://chat.cuttingedge.cihconsultingllc.com│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 4. User clicks "Chat Mode"
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BROWSER NAVIGATION                                      │
│              https://chat.cuttingedge.cihconsultingllc.com                   │
│                      (Nginx reverse proxy)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 5. Nginx routes to internal container
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CHATBOT CONTAINER                                         │
│                  cutting-edge_chatbot_1                                      │
│                      (Docker Container)                                     │
│                  Port: 3001 (internal) → 80 (external)                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  React Frontend (ChatInterface.tsx)                                │   │
│  │  - Renders chat UI                                                  │   │
│  │  - Handles user input                                               │   │
│  │  - Displays messages                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Environment Variable: VITE_API_URL=/api                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 6. User types "Hello" and clicks Send
                                      │    Frontend makes HTTP POST request
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   NGINX REVERSE PROXY                                       │
│                  (Routes /api/* to handoff-api)                              │
│                                                                              │
│  Request: POST /api/chat                                                    │
│  Body: {"message":"Hello"}                                                   │
│  Headers: Content-Type: application/json                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 7. Nginx proxies to internal container
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   HANDOFF-API CONTAINER                                      │
│                  cutting-edge-handoff-api                                     │
│                      (Docker Container)                                      │
│                  Port: 3000 (internal)                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Hono Framework (index.ts)                                          │   │
│  │  - Receives POST /api/chat request                                  │   │
│  │  - Validates input                                                   │   │
│  │  - Calls chatService.ts                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  chatService.ts (Business Logic)                                     │   │
│  │                                                                      │   │
│  │  Step 1: Check Ollama connection status                             │   │
│  │  Step 2: Search knowledge base (PostgreSQL + pgvector)              │   │
│  │  Step 3: Get relevant context from database                          │   │
│  │  Step 4: Construct prompt with context                              │   │
│  │  Step 5: Call Ollama API for LLM generation                         │   │
│  │  Step 6: Format response and return                                  │   │
│  │                                                                      │   │
│  │  Retry Logic: let lastError (FIXED - was const before)             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    │ 8. Need AI knowledge                     │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database (supabase-db)                                   │   │
│  │  - knowledge_base table                                              │   │
│  │  - pgvector extension                                                │   │
│  │  - Vector similarity search                                          │   │
│  │                                                                      │   │
│  │  SELECT * FROM search_knowledge_base('user query', 5);                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    │ 9. Need LLM generation                  │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Docker DNS Resolution                                              │   │
│  │                                                                      │   │
│  │  handoff-api container can reach:                                    │   │
│  │  - ollama (fabricaio_fabricaio_net)                                 │   │
│  │  - supabase-db (bridge network)                                     │   │
│  │                                                                      │   │
│  │  Docker network: multi-homed (connected to 3 networks)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 10. HTTP POST to Ollama
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OLLAMA CONTAINER                                      │
│                      (Separate Docker container)                            │
│                                                                              │
│  Model: llama3.2 (or latest)                                                │
│  Embeddings: nomic-embed-text                                              │
│  API Port: 11434                                                            │
│                                                                              │
│  Process:                                                                    │
│  1. Receive prompt with context                                             │
│  2. Run LLM inference (takes 15-25 seconds)                                │
│  3. Return generated text                                                   │
│                                                                              │
│  Note: Ollama runs on fabricaio_fabricaio_net network                       │
│        but handoff-api can reach it via Docker DNS                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 11. Return AI response
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   HANDOFF-API CONTAINER (Return Path)                        │
│                                                                              │
│  chatService.ts:                                                             │
│  - Receives LLM response from Ollama                                        │
│  - Formats as JSON: {response: "AI text here"}                              │
│  - Returns HTTP 200 with response body                                      │
│                                                                              │
│  Retry Logic: If Ollama fails, retry up to 3 times (using let lastError)    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 12. HTTP 200 Response
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   NGINX REVERSE PROXY (Return Path)                         │
│                                                                              │
│  Adds CORS headers:                                                          │
│  - Access-Control-Allow-Origin: *                                           │
│  - Access-Control-Allow-Methods: POST, GET, OPTIONS                         │
│  - Access-Control-Allow-Headers: Content-Type                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 13. HTTP 200 Response
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   BROWSER (ChatInterface.tsx)                                │
│                                                                              │
│  React Component:                                                            │
│  - Receives response via fetch() API                                       │
│  - Parses JSON: response.response                                           │
│  - Updates UI state with AI message                                         │
│  - Shows message in chat bubble                                             │
│  - Auto-scrolls to bottom                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 14. User sees response
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      USER SEES:                                             │
│                                                                              │
│  Chat: Hello                                                                 │
│  ────────────                                                                │
│  AI: Hello! I'm happy to assist you at Cutting Edge Barbershop...          │
│                                                                              │
│  Total time: ~20-30 seconds (most time is Ollama LLM generation)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 CRITICAL COMPONENTS

### 1. Frontend (Chatbot Container)
**File**: `ChatInterface.tsx`
**Location**: `cutting-edge_chatbot_1` container
**Port**: 3001 (internal) → 80 (external via nginx)

**Key Code**:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userInput })
});
```

**Environment Variable** (CRITICAL - FIXED YESTERDAY):
```bash
# .env.production (CORRECT)
VITE_API_URL=/api

# WRONG (this was the bug!)
# VITE_API_URL=http://localhost:3000
```

### 2. Backend API (Handoff-API Container)
**File**: `chatService.ts`
**Location**: `cutting-edge-handoff-api` container
**Port**: 3000 (internal)

**Key Code** (FIXED YESTERDAY):
```typescript
// WRONG (this was the bug!)
const lastError: Error | null = null;
for (const attempt of retries) {
  try {
    return await callOllama(prompt);
  } catch (error) {
    lastError = error; // ERROR: Can't assign to const!
  }
}

// CORRECT (fixed)
let lastError: Error | null = null;
for (const attempt of retries) {
  try {
    return await callOllama(prompt);
  } catch (error) {
    lastError = error; // OK: Can assign to let
  }
}
```

**Flow**:
1. Receive message from frontend
2. Search knowledge base (PostgreSQL)
3. Get relevant context
4. Call Ollama LLM
5. Return response

### 3. Ollama (AI Generation)
**Container**: Separate (on fabricaio_fabricaio_net)
**Port**: 11434
**Models**:
- llama3.2 (main LLM)
- nomic-embed-text (embeddings)

**API Call**:
```bash
curl http://ollama:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Hello, please help with...",
    "stream": false
  }'
```

**Response Time**: 15-25 seconds (normal for local LLM)

### 4. PostgreSQL (Knowledge Base)
**Container**: supabase-db
**Port**: 5432
**Database**: postgres
**Tables**:
- knowledge_base (documents, embeddings)
- chat_logs (conversation history)

**Vector Search**:
```sql
SELECT * FROM search_knowledge_base('user query', 5);
-- Returns top 5 relevant documents using pgvector
```

---

## 🐳 DOCKER NETWORK ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER NETWORKS                              │
└─────────────────────────────────────────────────────────────────┘

Network 1: cutting-edge_default (bridge)
┌────────────────────────────────────────────────┐
│ - cutting-edge-handoff-api (multi-homed)     │
│ - cutting-edge_chatbot_1                      │
│ - supabase-db                                 │
│ - cutting-edge_barber-shop_1                 │
└────────────────────────────────────────────────┘

Network 2: fabricaio_fabricaio_net (bridge)
┌────────────────────────────────────────────────┐
│ - ollama                                      │
│ - cutting-edge-handoff-api (multi-homed)     │
└────────────────────────────────────────────────┘

Network 3: Another network (bridge)
┌────────────────────────────────────────────────┐
│ - cutting-edge-handoff-api (multi-homed)     │
└────────────────────────────────────────────────┘

KEY INSIGHT: handoff-api is connected to ALL 3 networks
This allows it to reach:
- supabase-db (network 1)
- ollama (network 2)
- Other services (network 3)
```

**Docker DNS Resolution**:
```bash
# From handoff-api container, can reach:
curl http://ollama:11434/api/tags  # Works!
psql -h supabase-db -U postgres    # Works!
```

---

## 🔒 SECURITY & CORS

### CORS Configuration (nginx)
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # CORS headers
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "POST, GET, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
}
```

### Why This Matters:
- Frontend on https://chat.cuttingedge.cihconsultingllc.com
- API on https://chat.cuttingedge.cihconsultingllc.com/api/*
- Same domain = No CORS issues!
- But nginx still adds headers for safety

---

## ⚡ PERFORMANCE TIMELINE

```
User Action                | Time  | Component
--------------------------|-------|----------------------------------
Click "Need Help"         | 0ms   | FloatingConcierge.tsx
Modal appears             | 50ms  | React state update
Click "Chat Mode"         | 100ms | Navigation start
Navigate to chat URL      | 500ms | Browser + nginx routing
Chat interface loads      | 1.5s  | React app mount
Type "Hello"              | 2s    | User input time
Click Send                | 2.1s  | Form submission
POST to /api/chat         | 2.2s  | fetch() call
Backend receives request  | 2.3s  | Hono router
Search knowledge base     | 2.5s  | PostgreSQL vector search
Call Ollama LLM           | 3s    | HTTP request to Ollama
LLM inference processing  | 25s   | Ollama generates response
Receive LLM response      | 28s   | Backend gets result
Format & return           | 28.5s | chatService.ts
HTTP 200 response        | 29s   | nginx adds headers
Browser receives response | 29.5s | fetch() resolves
Update UI with response  | 30s   | React state update
User sees AI message     | 30s   | Render complete

TOTAL: ~30 seconds (normal for local LLM)
```

---

## 🐛 BUGS FOUND & FIXED (2026-02-11)

### Bug #1: Backend const reassignment
**Location**: `chatService.ts:161`
**Code**:
```typescript
// BEFORE (BROKEN)
const lastError: Error | null = null;
for (const attempt of retries) {
  try { return await callOllama(); }
  catch (error) { lastError = error; } // ERROR!
}

// AFTER (FIXED)
let lastError: Error | null = null;
for (const attempt of retries) {
  try { return await callOllama(); }
  catch (error) { lastError = error; } // OK!
}
```

### Bug #2: Frontend localhost reference
**Location**: `.env.production`
**Code**:
```bash
# BEFORE (BROKEN)
VITE_API_URL=http://localhost:3000

# AFTER (FIXED)
VITE_API_URL=/api
```

### Bug #3: Misleading error message
**Frontend showed**: "LLM Connection failed. Is Ollama running?"
**Actual error**: "Assignment to constant variable"
**Result**: Confusing debugging!

---

## 📊 HEALTH CHECK ENDPOINTS

### 1. Chatbot Health Check
```bash
curl https://chat.cuttingedge.cihconsultingllc.com/api/health

# Expected Response:
{
  "status": "ok",
  "service": "cutting-edge-handoff-api",
  "timestamp": "2026-02-12T00:30:00Z",
  "uptime": 12345
}
```

### 2. Container Status
```bash
ssh contabo-vps "docker ps | grep cutting-edge"

# Expected Output:
cutting-edge-handoff-api   Up 3 minutes
cutting-edge_chatbot_1      Up 45 minutes
cutting-edge_barber-shop_1  Up 4 hours
```

### 3. Ollama Status
```bash
ssh contabo-vps "curl http://localhost:11434/api/tags"

# Expected Response:
{
  "models": [
    {"name": "llama3.2", ...},
    {"name": "nomic-embed-text", ...}
  ]
}
```

---

## 🎯 SUCCESS CRITERIA

Chatbot is WORKING if:
- ✅ Navigate to chat URL without errors
- ✅ Chat interface renders properly
- ✅ Send message and get response within 30s
- ✅ No console errors in browser
- ✅ No 500 errors in Network tab
- ✅ AI responses are relevant

Chatbot is FAILING if:
- ❌ Browser crashes
- ❌ White screen or spinner forever
- ❌ "LLM Connection failed" error
- ❌ Messages don't send
- ❌ No response after 60 seconds
- ❌ Console shows red errors

---

**Last Updated**: 2026-02-12 00:30:00 EST
**Status**: All bugs fixed, system operational
**Next**: Browser-based validation testing needed
