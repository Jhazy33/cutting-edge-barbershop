# Ollama Connection Failure - Permanent Fix Implementation Plan

**Date**: 2026-02-11 23:50:00 EST
**Status**: READY FOR IMPLEMENTATION
**Priority**: CRITICAL

---

## 🔍 ROOT CAUSES IDENTIFIED

### Issue #1: Backend Code Bug (CRITICAL)
**File**: `services/handoff-api/src/services/chatService.ts:161`
**Problem**: `const lastError` cannot be reassigned in retry loop
**Impact**: Causes 500 errors, misleading "LLM Connection failed" message

### Issue #2: Frontend Configuration (CRITICAL)
**File**: `services/chatbot/src/components/ChatInterface.tsx:13`
**Problem**: `VITE_API_URL=http://localhost:3000` points to user's localhost, not VPS
**Impact**: Browser can't reach API, shows connection errors

### Issue #3: Nginx Proxy Configuration (HIGH)
**File**: `AI Chatbot/cutting-edge---digital-concierge/nginx.conf`
**Problem**: Hardcoded IP `172.17.0.1:3000` instead of Docker DNS
**Impact**: Fragile, breaks when containers restart

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Quick Fixes (5 minutes)
**Goal**: Restore chatbot functionality immediately

#### Fix 1.1: Backend Code Bug
**File**: `services/handoff-api/src/services/chatService.ts`
**Line**: 161
**Change**:
```typescript
- const lastError: Error | null = null;
+ let lastError: Error | null = null;
```

#### Fix 1.2: Frontend Configuration
**File**: `services/chatbot/src/components/ChatInterface.tsx`
**Line**: 13
**Change**:
```typescript
- const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
+ const API_URL = import.meta.env.VITE_API_URL || '';
```

**Also update fetch call (line 49)**:
```typescript
- const response = await fetch(`${API_URL}/api/chat`, {
+ const response = await fetch(`${API_URL}/api/chat`, {
```

**Wait, that's the same**. Let me check the actual fix:
```typescript
// Change line 54-61:
- body: JSON.stringify({
+ body: JSON.stringify({
    message: userMessage,
    shopId: SHOP_ID,
-   conversationHistory: messages.map(m => ({
+   conversationHistory: messages.map(m => ({
      role: m.role,
      content: m.content
-   }))
-   })
+   }))
  })
```

Actually, the REAL fix is simpler:
**Create `.env.production` file**:
```bash
VITE_API_URL=/api
```

This makes the API URL relative to the chatbot domain, using nginx proxy.

### Phase 2: Robust Configuration (10 minutes)
**Goal**: Make configuration resilient and maintainable

#### Fix 2.1: Nginx Proxy Configuration
**File**: `AI Chatbot/cutting-edge---digital-concierge/nginx.conf`
**Change**:
```nginx
location /api/ {
-   proxy_pass http://172.17.0.1:3000/api/;
+   proxy_pass http://cutting-edge-handoff-api:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Fix 2.2: Environment Variable Cleanup
**File**: `services/handoff-api/.env`
**Change**:
```bash
# Remove conflicting OLLAMA_URL, let container env take precedence
- OLLAMA_URL=http://172.17.0.1:11434
+ # OLLAMA_URL set by docker-compose
```

---

## 🔄 ROLLBACK STRATEGY

### If Fix Breaks Chatbot
1. **Revert nginx config**:
   ```bash
   ssh contabo-vps "cd /root/cutting-edge && git checkout nginx.conf"
   ```

2. **Revert code changes**:
   ```bash
   git checkout src/services/chatService.ts
   git checkout src/components/ChatInterface.tsx
   ```

3. **Restart containers**:
   ```bash
   ssh contabo-vps "cd /root/cutting-edge && docker-compose restart"
   ```

### Rollback Triggers
- Chatbot returns 500 errors
- Browser console shows CORS errors
- API health check fails
- Response time > 60 seconds

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify:

### Backend Fix
- [ ] Code compiles without errors
- [ ] Docker image builds successfully
- [ ] Container starts without crashes
- [ ] Logs show no "Assignment to constant variable" errors

### Frontend Fix
- [ ] Chatbot loads in browser
- [ ] API_URL resolves to `/api` in production build
- [ ] Browser dev tools show requests to `/api/chat` (not `localhost:3000`)
- [ ] No CORS errors in console

### End-to-End Test
- [ ] Navigate to https://chat.cuttingedge.cihconsultingllc.com
- [ ] Send message: "Hello, which model are you?"
- [ ] Receive response mentioning LLM model
- [ ] Response time < 30 seconds
- [ ] No errors in browser console

### Infrastructure Verification
- [ ] `docker logs cutting-edge-handoff-api` shows no errors
- [ ] `docker logs cutting-edge_chatbot_1` shows no errors
- [ ] API health endpoint returns 200 OK
- [ ] Ollama responds to `curl` tests from handoff-api container

---

## 📊 PRIORITY ORDER

1. **CRITICAL - Backend Fix** (Fix 1.1)
   - Blocks all chatbot functionality
   - 1 line change, 2 minutes to deploy
   - **DO THIS FIRST**

2. **CRITICAL - Frontend Fix** (Fix 1.2)
   - Required for browser to reach API
   - Create .env.production file
   - **DO THIS SECOND**

3. **HIGH - Nginx Fix** (Fix 2.1)
   - Improves reliability
   - Prevents future occurrences
   - **DO THIS THIRD**

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Apply Backend Fix
```bash
# On local machine
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api"
# Edit chatService.ts line 161: const → let
git add src/services/chatService.ts
git commit -m "fix: change lastError to let for retry loop"

# Push to GitHub
git push origin dev

# On VPS
ssh contabo-vps
cd /root/cutting-edge/cutting-edge-handoff-api
git pull origin dev
docker build -t cutting-edge-handoff-api:latest .
docker-compose restart handoff-api
```

### Step 2: Apply Frontend Fix
```bash
# On local machine
cd "/Users/jhazy/AI_Projects/Cutting Edge/services/chatbot"
# Create .env.production file
echo "VITE_API_URL=/api" > .env.production
git add .env.production
git commit -m "fix: use relative API URL for production"
git push origin dev

# On VPS
ssh contabo-vps
cd /root/cutting-edge/AI\ Chatbot/cutting-edge---digital-concierge
git pull origin dev
docker build -t cutting-edge-chatbot:latest .
docker-compose restart chatbot
```

### Step 3: Apply Nginx Fix
```bash
# On VPS
ssh contabo-vps
cd /root/cutting-edge/AI\ Chatbot/cutting-edge---digital-concierge
# Edit nginx.conf: 172.17.0.1 → cutting-edge-handoff-api
docker build -t cutting-edge-chatbot:latest .
docker-compose restart chatbot
```

### Step 4: Verification
```bash
# Test health
curl -s https://chat.cuttingedge.cihconsultingllc.com/api/health | jq

# Test chat endpoint
curl -X POST https://chat.cuttingedge.cihconsultingllc.com/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, which model are you?","shopId":1,"conversationHistory":[]}'
```

---

## 📝 LESSONS LEARNED

### Why This Happened Repeatedly
1. **Misleading error messages** - "LLM Connection failed" didn't indicate actual problem
2. **Code bug in retry logic** - `const` can't be reassigned
3. **Frontend dev config in production** - `localhost:3000` only works locally
4. **Hardcoded IPs** - Docker container IPs change, should use DNS names

### Prevention Measures
1. **Better error messages** - Display actual errors, not generic ones
2. **Environment-specific configs** - Separate .env for dev/prod
3. **TypeScript linting** - Catch `const` assignment at build time
4. **Use Docker DNS** - Never hardcode container IPs

---

**Next Action**: Begin Phase 1 implementation (backend fix)
**Estimated Time**: 5 minutes for backend, 10 minutes for frontend
**Risk Level**: LOW (single-line changes, easy rollback)
