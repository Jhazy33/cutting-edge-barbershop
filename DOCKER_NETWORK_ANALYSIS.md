# Docker Network Architecture Analysis

**Date**: 2026-02-11
**Issue**: Chatbot connection failures to Ollama LLM service
**Status**: CONNECTED - Ollama reachable, chatbot has nginx configuration issue

---

## Network Topology Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS HOST (109.199.118.38)                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DOCKER NETWORKS (7 total)                    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  [1] bridge (172.17.0.0/16)                                │   │
│  │      └─ EMPTY (no containers attached)                     │   │
│  │                                                            │   │
│  │  [2] cutting-edge_default (172.18.0.0/16)                  │   │
│  │      ├─ cutting-edge_chatbot_1        → 172.18.0.5         │   │
│  │      ├─ cutting-edge-handoff-api     → 172.18.0.6         │   │
│  │      ├─ cutting-edge_barber-shop_1   → 172.18.0.2         │   │
│  │      ├─ cutting-edge-voice-backend-1 → 172.18.0.3         │   │
│  │      ├─ cutting-edge_voice-app_1     → 172.18.0.4         │   │
│  │      └─ cutting-edge_dashboard_1     → 172.18.0.7         │   │
│  │                                                            │   │
│  │  [3] fabricaio_fabricaio_net (172.20.0.0/16)              │   │
│  │      ├─ 63d7d8f23bef_fabric_ollama   → 172.20.0.4        │   │
│  │      ├─ fabric_db                     → 172.20.0.3         │   │
│  │      ├─ fabric_ingestion              → 172.20.0.2         │   │
│  │      ├─ fabric_redis                  → 172.20.0.5         │   │
│  │      ├─ fabric_web                    → 172.20.0.6         │   │
│  │      └─ cutting-edge-handoff-api     → 172.20.0.7 ⭐      │   │
│  │                                                            │   │
│  │  [4] supabase_default (172.22.0.0/16)                    │   │
│  │      ├─ supabase-* (11 containers)                        │   │
│  │      └─ cutting-edge-handoff-api     → 172.22.0.12 ⭐     │   │
│  │                                                            │   │
│  │  [5] nexxt_whatsgoingon_nexxt-network                     │   │
│  │      └─ nexxt_whatsgoingon-* (10 containers)              │   │
│  │                                                            │   │
│  │  [6] b0t_b0t-network                                       │   │
│  │      └─ b0t                                                 │   │
│  │                                                            │   │
│  │  [7] host (no network isolation)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Container Connection Paths

### Path 1: Chatbot → Handoff-API
```
cutting-edge_chatbot_1 (172.18.0.5)
    ↓ [nginx proxy_pass]
    http://172.17.0.1:3000/api/  ❌ WRONG (bridge network is empty!)
    ↓ SHOULD BE:
    http://cutting-edge-handoff-api:3000/api/
    or
    http://172.18.0.6:3000/api/
```

### Path 2: Handoff-API → Ollama
```
cutting-edge-handoff-api (multi-homed)
    ↓ [on fabricaio_fabricaio_net: 172.20.0.7]
    http://63d7d8f23bef_fabric_ollama:11434 ✅ WORKS!
    http://172.20.0.4:11434 ✅ WORKS!
    http://ollama:11434 ✅ WORKS!
```

## Environment Variable Conflicts

### handoff-api .env file (/root/cutting-edge/cutting-edge-handoff-api/.env)
```bash
OLLAMA_URL=http://172.17.0.1:11434  ❌ WRONG (points to empty bridge)
```

### handoff-api container environment (docker-compose override)
```bash
OLLAMA_URL=http://63d7d8f23bef_fabric_ollama:11434  ✅ CORRECT
```

### Runtime environment (verified via `docker exec`)
```bash
OLLAMA_URL=http://63d7d8f23bef_fabric_ollama:11434  ✅ WORKING
```

## Current Architecture Problems

### P1 - CRITICAL: Chatbot nginx misconfiguration
**Problem**: Chatbot container tries to proxy API requests to `http://172.17.0.1:3000/api/`
**Why it fails**: The bridge network (172.17.0.0/16) has NO containers attached
**Impact**: All chatbot API calls fail with "Connection refused" (111)

**Current chatbot nginx config**:
```nginx
location /api/ {
    proxy_pass http://172.17.0.1:3000/api/;  ❌ WRONG
}
```

**Evidence from logs**:
```
2026/02/11 19:29:12 [error] 106#106: *11 connect() failed (111: Connection refused)
while connecting to upstream, client: 172.18.0.1, server: localhost,
request: "POST /api/chat HTTP/1.1", upstream: "http://172.17.0.1:3000/api/chat"
```

### P2 - Minor: .env file inconsistency
**Problem**: .env file has `OLLAMA_URL=http://172.17.0.1:11434` but docker-compose overrides it
**Why it matters**: Confusing for debugging, though runtime works correctly
**Impact**: Low (docker-compose environment takes precedence)

### P3 - Minor: Multi-network complexity
**Problem**: handoff-api attached to 3 networks (unnecessary complexity)
**Impact**: Harder to debug, though currently functional

## What's Working (Don't Break This!)

### Handoff-API → Ollama Connection ✅
```
Verified working connection methods:
1. Container name: http://63d7d8f23bef_fabric_ollama:11434
2. Network alias: http://ollama:11434
3. Direct IP: http://172.20.0.4:11434

Test result from handoff-api container:
{"models":[{"name":"nomic-embed-text:latest",...}]}
```

**Why this works**:
- Both containers on fabricaio_fabricaio_net (172.20.0.0/16)
- Ollama has network alias "ollama" in fabricaio_net
- Docker DNS resolves container names automatically

### Ollama Service Health ✅
```
Running models:
- nomic-embed-text:latest (embeddings)
- llama3.2:3b (chat)
- gemma:2b (chat)

Recent successful requests:
- 200 responses to /api/chat
- 200 responses to /api/embeddings
- 19 second response time (acceptable)
```

## Recommended Network Architecture

### Option 1: Minimal Fix (Quickest)
**Fix chatbot nginx only** - Keep current structure, fix the broken proxy

```nginx
# In chatbot container nginx config
location /api/ {
    proxy_pass http://cutting-edge-handoff-api:3000/api/;  # Use Docker DNS
    # OR
    proxy_pass http://172.18.0.6:3000/api/;  # Use network IP
}
```

**Pros**:
- Single file change
- No service restarts needed
- No network reconfiguration
- Low risk

**Cons**:
- Leaves architectural issues unaddressed
- Still has 3-network attachment for handoff-api

### Option 2: Clean Architecture (Recommended)
**Simplify to 2 networks** - Align networks with application boundaries

```
[1] cutting-edge_default (172.18.0.0/16)
    ├─ cutting-edge_chatbot_1
    ├─ cutting-edge-handoff-api (MOVED FROM multi-homed)
    ├─ cutting-edge_barber-shop_1
    ├─ cutting-edge-voice-backend-1
    ├─ cutting-edge_voice-app_1
    └─ cutting-edge_dashboard_1

[2] fabricaio_fabricaio_net (172.20.0.0/16)
    ├─ 63d7d8f23bef_fabric_ollama
    ├─ fabric_db
    ├─ fabric_ingestion
    ├─ fabric_redis
    └─ fabric_web
```

**Handoff-API becomes single-homed** on cutting-edge_default

**But how does it reach Ollama?**

Add external network bridge:
```yaml
# In cutting-edge/handoff-api/docker-compose.yml
networks:
  cutting-edge_default:
    external: true

services:
  handoff-api:
    networks:
      - cutting-edge_default
    extra_hosts:
      - "ollama:host-gateway"  # Docker special DNS for host
```

**OR** use host networking for handoff-api:
```yaml
services:
  handoff-api:
    network_mode: host  # Shares host network namespace
```

**Pros**:
- Cleaner architecture
- Easier to understand
- Follows Docker best practices
- Fewer points of failure

**Cons**:
- Requires more testing
- May need service restart
- Slightly more complex initially

### Option 3: Unified Network (Most Simple)
**Put everything on one network** - Maximum simplicity

```
[1] cutting-edge_default (or rename to "services")
    ├─ All cutting-edge containers
    ├─ All fabricaio containers
    └─ All can communicate via DNS names
```

**Pros**:
- Maximum simplicity
- All services can reach all services
- No network isolation to debug

**Cons**:
- Loss of network isolation (security concern)
- All services on same failure domain
- Not recommended for production

## Specific Configuration Changes Needed

### For Option 1 (Minimal Fix - Do This First)

**File**: `/root/cutting-edge/AI Chatbot/cutting-edge---digital-concierge/nginx.conf`

**Change**:
```diff
location /api/ {
-   proxy_pass http://172.17.0.1:3000/api/;
+   proxy_pass http://cutting-edge-handoff-api:3000/api/;
}
```

**Verify connectivity after change**:
```bash
docker exec cutting-edge_chatbot_1 wget -qO- http://cutting-edge-handoff-api:3000/api/health
```

**No restart needed** - nginx reloads config automatically.

### For Option 2 (Clean Architecture)

**Step 1**: Update handoff-api docker-compose
```yaml
# /root/NeXXT_WhatsGoingOn/services/handoff-api/docker-compose.yml
services:
  handoff-api:
    build:
      context: .
      dockerfile: Dockerfile
    image: cutting-edge-handoff-api:latest
    container_name: cutting-edge-handoff-api
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_URL=http://172.17.0.1:11434  # Via host networking
    network_mode: host  # Use host network namespace
    # OR
    # extra_hosts:
    #   - "ollama:host-gateway"  # Use Docker host gateway
    restart: unless-stopped
```

**Step 2**: Update chatbot nginx (same as Option 1)

**Step 3**: Test and verify all connections

**Step 4**: Update .env file to match:
```bash
# /root/cutting-edge/cutting-edge-handoff-api/.env
OLLAMA_URL=http://172.17.0.1:11434  # This would be correct with host networking
```

## Verification Commands

After making changes, run these:

```bash
# Test chatbot → handoff-api
docker exec cutting-edge_chatbot_1 wget -qO- http://cutting-edge-handoff-api:3000/api/health

# Test handoff-api → Ollama
docker exec cutting-edge-handoff-api wget -qO- http://63d7d8f23bef_fabric_ollama:11434/api/tags

# Test full chat flow
curl -X POST https://chat.cuttingedge.cihconsultingllc.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from testing"}'

# Check logs for errors
docker logs cutting-edge_chatbot_1 --tail 50
docker logs cutting-edge-handoff-api --tail 50
```

## Root Cause Summary

The chatbot connection issue is **NOT** an Ollama connectivity problem. It's an nginx misconfiguration:

1. Chatbot nginx proxies to `http://172.17.0.1:3000/api/`
2. The bridge network (172.17.0.0/16) is empty
3. handoff-api is actually on `172.18.0.6` and `172.20.0.7`
4. Connection refused because nothing listening on 172.17.0.1:3000

**The fix**: Update chatbot nginx config to use Docker DNS name or correct IP.

## Recommended Action Plan

1. **Do Option 1 first** (quickest fix, low risk)
   - Update chatbot nginx config
   - Test chatbot connection
   - Verify full chat flow works

2. **Then do Option 2** (if you want cleaner architecture)
   - Simplify handoff-api networking
   - Align networks with app boundaries
   - Update documentation

3. **Skip Option 3** (not recommended for production)

## Timeline Estimate

- Option 1: 5 minutes (1 file change, test, done)
- Option 2: 30 minutes (requires more testing and validation)
- Option 3: Not recommended

---

**Next Step**: Implement Option 1 and verify chatbot can connect to handoff-api.
