# Ollama API DNS Fix Report

**Generated**: 2026-02-11
**Status**: CRITICAL - DNS Misconfiguration Identified
**Priority**: P0 - Chatbot functionality broken

---

## Executive Summary

The `ai.cihconsultingllc.com` domain is currently pointing to **Cloudflare IPs** instead of the VPS where Ollama is running. This prevents the chatbot from reaching the Ollama API, breaking AI functionality.

**Impact**: Chatbot cannot generate responses
**Root Cause**: DNS misconfiguration in Cloudflare
**Fix Time**: 5-30 minutes (DNS propagation)

---

## Current State Analysis

### DNS Resolution (BROKEN)

```bash
$ dig +short ai.cihconsultingllc.com
104.21.39.233  # Cloudflare IP
172.67.171.212 # Cloudflare IP

$ nslookup ai.cihconsultingllc.com
Name:    ai.cihconsultingllc.com
Address: 172.67.171.212  # Cloudflare IP
Address: 104.21.39.233   # Cloudflare IP
```

**Problem**: Requests go to Cloudflare, which doesn't know about the VPS Ollama service.

### VPS Configuration (WORKING)

```bash
# Ollama is running and accessible via public IP
$ curl http://109.199.118.38:11434/api/tags
# Returns: {"models":[...]}  ✅ WORKING

# Ollama container status
Container: fabric_ollama
Port: 11434 (exposed publicly)
Models: llama3.2, gemma:2b, gemma2:2b
```

**The service works!** The problem is purely DNS.

### Chatbot Configuration

**File**: `services/chatbot/src/components/ChatInterface.tsx`

```typescript
const OLLAMA_API = import.meta.env.VITE_OLLAMA_API || 'https://ai.cihconsultingllc.com';
```

The chatbot expects `https://ai.cihconsultingllc.com/api/chat` to reach Ollama, but DNS sends it to Cloudflare.

---

## Solution Options

### ✅ RECOMMENDED: Fix Cloudflare DNS (Option A)

**Pros**:
- Proper DNS setup
- Allows HTTPS with SSL
- Clean, professional solution
- No code changes needed

**Cons**:
- Requires Cloudflare dashboard access
- 5-30 min DNS propagation

**Steps**:

1. **Log into Cloudflare Dashboard**
   - URL: https://dash.cloudflare.com
   - Email: your Cloudflare account email

2. **Select Domain**
   - Click on: `cihconsultingllc.com`

3. **Find DNS Record**
   - Go to: DNS > Records
   - Look for: `ai` or `ai.cihconsultingllc.com`
   - Type: A or CNAME

4. **Update DNS Record**
   - Click Edit (pencil icon)
   - Update settings:
     ```
     Type: A
     Name: ai
     IPv4 address: 109.199.118.38
     Proxy status: DNS only (⚪️ gray cloud - NOT orange 🔶️)
     TTL: Auto
     ```
   - Click **Save**

5. **Verify DNS Change**
   ```bash
   # Watch DNS propagate
   watch -n 5 dig +short ai.cihconsultingllc.com

   # Should show after 5-30 min:
   109.199.118.38
   ```

6. **Test Chatbot**
   - Visit: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
   - Send message: "Hello"
   - Should get AI response

**Why DNS Only (Gray Cloud)**:
- Orange cloud = Cloudflare proxy (blocks custom ports)
- Gray cloud = Direct DNS (allows any port)
- Ollama runs on port 11434 (not standard HTTP/HTTPS)
- Need direct connection to VPS

---

### ⚠️ ALTERNATIVE: Use Direct IP (Option B)

**Pros**:
- Works immediately
- No DNS changes needed

**Cons**:
- No SSL/TLS (HTTP only)
- Browser security warnings
- Not production-ready
- Requires code change

**Implementation**:

Update `services/chatbot/.env`:
```bash
VITE_OLLAMA_API=http://109.199.118.38:11434
```

**Not recommended** for production use.

---

### 🔄 ALTERNATIVE: Use Existing Domain (Option C)

**Pros**:
- Uses already working domain
- No DNS changes needed

**Cons**:
- Requires Nginx reverse proxy setup
- More complex configuration
- Additional infrastructure

**Implementation**:

1. Add Nginx route on VPS:
   ```nginx
   location /ollama/ {
       proxy_pass http://localhost:11434/;
   }
   ```

2. Update chatbot config:
   ```typescript
   const OLLAMA_API = 'https://cuttingedge.cihconsultingllc.com/ollama';
   ```

---

### 🔄 ALTERNATIVE: Use cloudflared Tunnel (Option D)

**Pros**:
- Bypasses Cloudflare DNS
- HTTPS built-in
- Works immediately

**Cons**:
- Requires tunnel management
- Additional service to run
- Temporary solution

**Implementation**:

```bash
# Start tunnel for Ollama
ssh contabo-vps "cloudflared tunnel --url http://localhost:11434"

# Update chatbot with temporary URL
VITE_OLLAMA_API=https://temporary-url.trycloudflare.com
```

---

## Verification Steps

After applying DNS fix:

### 1. Check DNS Propagation
```bash
dig +short ai.cihconsultingllc.com
# Expected output: 109.199.118.38
```

### 2. Test Ollama API
```bash
curl https://ai.cihconsultingllc.com/api/tags
# Expected: JSON with models list
```

### 3. Test Chatbot
- Visit: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
- Send: "Hello, what services do you offer?"
- Expected: AI response with service information

### 4. Monitor VPS Logs
```bash
ssh contabo-vps "pm2 logs web --lines 20"
```

---

## Timeline Estimates

| Task | Time | Notes |
|------|------|-------|
| Cloudflare DNS update | 2 min | Quick dashboard change |
| DNS propagation | 5-30 min | Depends on TTL |
| Chatbot testing | 5 min | Verify functionality |
| **Total** | **12-37 min** | Most time waiting for DNS |

---

## Security Considerations

### Current Exposure
- Ollama port 11434 is **publicly exposed** on the VPS
- No authentication (anyone can access)
- This is intentional for the chatbot

### Recommendations

1. **Keep API Key Security**
   - Chatbot uses: `X-Ollama-Key: CE_AGENT_2026_SECRET`
   - Ollama should validate this header
   - Add authentication middleware if needed

2. **Firewall Rules**
   - Consider restricting port 11434 to known IPs
   - Or use Cloudflare Access for authentication

3. **Monitor Usage**
   - Check logs for abuse
   - Monitor API call patterns

---

## Next Steps (Priority Order)

1. ✅ **IMMEDIATE**: Fix Cloudflare DNS (Option A)
2. ⏳ **SHORT**: Add Ollama authentication middleware
3. ⏳ **MEDIUM**: Set up monitoring for Ollama API
4. ⏳ **LONG**: Consider API gateway for rate limiting

---

## Contact Information

**VPS Details**:
- IP: 109.199.118.38
- SSH: `ssh contabo-vps`
- Ollama Port: 11434

**Domains**:
- Chatbot: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
- Target DNS: ai.cihconsultingllc.com

**Current Status**:
- Ollama service: ✅ Running
- Port 11434: ✅ Open
- API endpoint: ✅ Responding
- DNS: ❌ Broken (points to Cloudflare)

---

## Quick Reference Commands

```bash
# Test DNS resolution
dig +short ai.cihconsultingllc.com

# Test Ollama via IP
curl http://109.199.118.38:11434/api/tags

# Test Ollama via domain (after DNS fix)
curl https://ai.cihconsultingllc.com/api/tags

# Check Ollama container
ssh contabo-vps "docker ps | grep ollama"

# View Ollama logs
ssh contabo-vps "docker logs fabric_ollama --tail 50"

# Restart Ollama if needed
ssh contabo-vps "docker restart fabric_ollama"
```

---

## Summary

**The fix is simple**: Update Cloudflare DNS to point `ai.cihconsultingllc.com` to `109.199.118.38` with DNS-only (gray cloud) proxy.

Everything else is working. This is purely a DNS misconfiguration issue.

**Estimated time to fix**: 12-37 minutes (mostly waiting for DNS propagation)

---

*Generated by Claude Code - DNS & Infrastructure Specialist*
*Documentation: /Users/jhazy/AI_Projects/Cutting Edge/OLLAMA_DNS_FIX_REPORT.md*
