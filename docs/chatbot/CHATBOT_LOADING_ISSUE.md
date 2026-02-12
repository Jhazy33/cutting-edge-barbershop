# Chatbot Loading Issue - Root Cause & Implementation Plan

**Date**: 2026-02-11
**Status**: 🔴 CRITICAL - Chatbot Not Loading from Netlify Website
**Issue**: Clicking "Chat Mode" button on main site doesn't load the chatbot

---

## 🔍 Root Cause Analysis

### Architecture Discovery

**Main Website (Netlify Deployment)**:
- URL: https://cuttingedge.cihconsultingllc.com
- Platform: Netlify (static site hosting)
- Status: ✅ Working (HTTP 200, Vercel CDN)
- File: `FloatingConcierge.tsx` component (line 121)
- Chat Button Links: `https://chat.cuttingedge.cihconsultingllc.com`

**Chatbot (VPS Deployment)**:
- URL: https://chat.cuttingedge.cihconsultingllc.com
- Platform: VPS (109.199.118.38)
- Container: cutting-edge_chatbot_1 (port 3001)
- Configuration: Refactored to use local handoff-api (port 3000)
- Status: ⚠️ Unknown (VPS inaccessible - SSH timeouts)

### The Problem

**User Flow**:
1. User visits: https://cuttingedge.cihconsultingllc.com (Netlify) ✅
2. User clicks "Chat Mode" button
3. Browser navigates to: https://chat.cuttingedge.cihconsultingllc.com
4. **ISSUE**: Chatbot page doesn't load or shows error

### Possible Causes

**Most Likely (70% probability)**:
- nginx on VPS not configured to route chat.cuttingedge subdomain
- Chatbot container not running or crashed
- Chatbot container running OLD code (external API dependencies that timeout)

**Secondary (20% probability)**:
- DNS not configured for chat.cuttingedge.cihconsultingllc.com
- SSL certificate invalid or missing
- Firewall blocking port 3001

**Tertiary (10% probability)**:
- Cloudflare configuration issue
- Browser caching old version
- Network routing issue

---

## 🎯 Implementation Plan

### Phase 1: Investigation & Diagnosis (WHEN VPS ACCESSIBLE)

**Step 1.1: Verify nginx Configuration**
```bash
# SSH to VPS
ssh contabo-vps

# Check if chat subdomain exists in nginx config
cat /etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf

# If not exists, create it
sudo nano /etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf
```

**Expected nginx Config**:
```nginx
server {
    listen 443 ssl;
    server_name chat.cuttingedge.cihconsultingllc.com;

    ssl_certificate /etc/letsencrypt/live/chat.cuttingedge.cihconsultingllc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.cuttingedge.cihconsultingllc.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;  # Route to chatbot container
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }
}

# Test configuration
sudo nginx -t
sudo systemctl reload nginx
```

**Step 1.2: Verify DNS Configuration**
```bash
# Check DNS A record
dig chat.cuttingedge.cihconsultingllc.com +short

# Should point to: 109.199.118.38 (VPS IP)
# If not, need to update DNS at registrar
```

**Step 1.3: Check Chatbot Container Status**
```bash
# Check if container is running
docker ps | grep chatbot

# Check container logs
docker logs cutting-edge_chatbot_1 --tail 50

# Test chatbot locally
curl -I http://localhost:3001

# If container crashed, restart it
docker restart cutting-edge_chatbot_1
```

**Step 1.4: Verify Chatbot Code**
```bash
# Check if chatbot has the NEW refactored code
ssh contabo-vps "docker exec cutting-edge_chatbot_1 cat /app/index.html | grep VITE_API_URL"

# Expected: Should show VITE_API_URL=http://handoff-api:3000 (local API)
# If shows https://api.cihconsultingllc.com (old external), need to redeploy
```

---

### Phase 2: Fix & Deploy (AFTER VPS ACCESSIBLE)

**Scenario A: nginx Missing Configuration**

**Action**: Create nginx config for chat subdomain

**File**: `/etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf`

```nginx
server {
    listen 443 ssl http2;
    server_name chat.cuttingedge.cihconsultingllc.com;

    # SSL certificates (need to obtain)
    ssl_certificate /etc/letsencrypt/live/chat.cuttingedge.cihconsultingllc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.cuttingedge.cihconsultingllc.com/privkey.pem;

    # Redirect HTTP to HTTPS
    if ($scheme = "http") {
        return 301 https://$host$request_uri;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # CORS
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    }
}

# Logging
access_log /var/log/nginx/chat.cuttingedge.cihconsultingllc.com-access.log;
error_log /var/log/nginx/chat.cuttingedge.cihconsultingllc.com-error.log;
```

**Steps**:
1. Create the file
2. Obtain SSL certificate: `sudo certbot certonly -d chat.cuttingedge.cihconsultingllc.com`
3. Test nginx config: `sudo nginx -t`
4. Reload nginx: `sudo systemctl reload nginx`
5. Test URL: `curl -I https://chat.cuttingedge.cihconsultingllc.com`

**Scenario B: Chatbot Container Running Old Code**

**Action**: Rebuild chatbot container with NEW refactored code

**File to Update**: `/root/NeXXT_WhatsGoingOn/services/chatbot/src/components/ChatInterface.tsx`

**Current Code Check** (from earlier analysis):
- ✅ Uses single API endpoint: `http://localhost:3000/api/chat`
- ✅ No external API dependencies (removed https://api.cihconsultingllc.com)
- ✅ Simplified architecture (25% less code)

**Deployment Steps**:
```bash
# SSH to VPS
ssh contabo-vps

# Navigate to project
cd /root/NeXXT_WhatsGoingOn

# Stop old chatbot container
docker stop cutting-edge_chatbot_1

# Remove old container
docker rm cutting-edge_chatbot_1

# Build new chatbot image
cd services/chatbot
docker build -t cutting-edge-chatbot:new .

# Run new container
docker run -d \
  --name cutting-edge_chatbot_1 \
  -p 3001:80 \
  --network cutting-edge-network \
  --restart unless-stopped \
  cutting-edge-chatbot:new

# Verify it's running
docker ps | grep chatbot

# Test locally on VPS
curl -I http://localhost:3001

# Check logs
docker logs cutting-edge_chatbot_1 --tail 20
```

**Scenario C: DNS Not Configured**

**Action**: Add DNS A record for chat subdomain

**Steps**:
1. Login to DNS registrar (where cihconsultingllc.com is managed)
2. Add A record: `chat.cuttingedge.cihconsultingllc.com` → `109.199.118.38`
3. Set TTL: 300 (5 minutes)
4. Wait for DNS propagation (use dig to verify)

**Verification**:
```bash
# After DNS changes, verify
dig chat.cuttingedge.cihconsultingllc.com

# Should return: 109.199.118.38
```

---

### Phase 3: Verification & Testing

**Step 3.1: End-to-End Browser Test**

**Test Procedure**:
1. Open main site: https://cuttingedge.cihconsultingllc.com
2. Click "Chat Mode" button (bottom right)
3. Verify chatbot page loads: https://chat.cuttingedge.cihconsultingllc.com
4. Check browser console for errors
5. Test sending a message
6. Verify AI response works

**Expected Results**:
- ✅ Chatbot page loads without errors
- ✅ Chat interface displays
- ✅ Can send message
- ✅ AI responds (using local handoff-api)
- ✅ Sources displayed (if relevant)
- ✅ Response time < 3 seconds

**Step 3.2: Verify nginx Logs**
```bash
# Check nginx access logs
sudo tail -50 /var/log/nginx/chat.cuttingedge.cihconsultingllc.com-access.log

# Check nginx error logs
sudo tail -50 /var/log/nginx/chat.cuttingedge.cihconsultingllc.com-error.log

# Check chatbot logs
docker logs cutting-edge_chatbot_1 --tail 50
```

**Step 3.3: Performance Testing**
```bash
# Test response time
time curl https://chat.cuttingedge.cihconsultingllc.com

# Load test (optional)
ab -n 100 -c 10 https://chat.cuttingedge.cihconsultingllc.com/
```

---

## 📋 Implementation Checklist

### Pre-Deployment (Before VPS Access)

**DNS**:
- [ ] Verify chat.cuttingedge.cihconsultingllc.com DNS record exists
- [ ] If missing, plan to add A record pointing to VPS
- [ ] Check current TTL settings

**nginx**:
- [ ] Check if nginx config exists for chat subdomain
- [ ] Verify SSL certificate exists for chat subdomain
- [ ] Plan to create config if missing

**Chatbot**:
- [ ] Verify ChatInterface.tsx has new refactored code (using local API)
- [ ] Verify docker-compose.chatbot.yml is up to date
- [ ] Plan to rebuild container if needed

### Deployment (When VPS Accessible)

**Immediate Priority**:
1. [ ] Regain SSH access (use Contabo VNC console if needed)
2. [ ] Run emergency diagnostics (from EMERGENCY_RESPONSE_VPS.md)
3. [ ] Verify system stability (memory >4GB, load <3.0)
4. [ ] Apply fix based on diagnostics (Ollama/leak/new issue)

**nginx Configuration**:
5. [ ] Create chat.cuttingedge.cihconsultingllc.com nginx config
6. [ ] Obtain SSL certificate for chat subdomain
7. [ ] Test nginx config: `sudo nginx -t`
8. [ ] Reload nginx: `sudo systemctl reload nginx`
9. [ ] Verify nginx is listening on port 443

**Chatbot Deployment**:
10. [ ] Verify chatbot has new code (uses local API)
11. [ ] Stop old cutting-edge_chatbot_1 container
12. [ ] Rebuild chatbot image with new code
13. [ ] Start new container on port 3001
14. [ ] Verify container is running: `docker ps | grep chatbot`
15. [ ] Test locally: `curl -I http://localhost:3001`
16. [ ] Check logs for errors: `docker logs cutting-edge_chatbot_1`

**DNS Verification**:
17. [ ] Add A record if missing (chat.cuttingedge → 109.199.118.38)
18. [ ] Verify DNS propagation: `dig chat.cuttingedge.cihconsultingllc.com`
19. [ ] Test from multiple locations

### Verification (After Deployment)

**Functionality Tests**:
20. [ ] Chatbot page loads (https://chat.cuttingedge.cihconsultingllc.com)
21. [ ] No console errors in browser
22. [ ] Chat interface displays correctly
23. [ ] Can send message
24. [ ] AI responds (using handoff-api on port 3000)
25. [ ] Response time < 3 seconds
26. [ ] Sources displayed when relevant
27. [ ] No WebSocket errors
28. [ ] No CORS errors

**Infrastructure Tests**:
29. [ ] nginx config is active
30. [ ] SSL certificate valid (not expired)
31. [ ] DNS resolves to VPS IP
32. [ ] Chatbot container running and healthy
33. [ ] handoff-api accessible (port 3000)
34. [ ] PM2 handoff-api process stable

**Performance Tests**:
35. [ ] Chatbot page loads < 2 seconds
36. [ ] Message send < 1 second
37. [ ] AI response < 3 seconds (first message)
38. [ ] AI response < 2 seconds (subsequent)
39. [ ] No memory leaks (monitor for 24 hours)

**Security Tests**:
40. [ ] HTTPS enforced (no HTTP access)
41. [ ] CORS headers present
42. [ ] Rate limiting configured
43. [ ] No sensitive data in logs
44. [ ] API keys not exposed

---

## 🔧 Technical Details

### Files to Modify/Create

**1. nginx Configuration** (on VPS)
- Path: `/etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf`
- Purpose: Route chat.cuttingedge subdomain to chatbot container
- Status: CREATE (if doesn't exist) or UPDATE (if exists)

**2. Chatbot Code** (already refactored)
- Path: `/root/NeXXT_WhatsGoingOn/services/chatbot/src/components/ChatInterface.tsx`
- Purpose: Use local handoff-api instead of external APIs
- Status: Already updated (from CHATBOT_LOCAL_API_REFACTOR_COMPLETE.md)

**3. Docker Configuration** (already updated)
- Path: `/root/NeXXT_WhatsGoingOn/docker-compose.chatbot.yml`
- Purpose: Run chatbot with local API
- Status: Already updated (includes handoff-api, postgres, ollama)

### Services Involved

**Main Site** (Netlify):
- Deployment: Static files on Netlify CDN
- URL: https://cuttingedge.cihconsultingllc.com
- Component: FloatingConcierge.tsx
- Chat Button: Links to https://chat.cuttingedge.cihconsultingllc.com
- Status: Working ✅

**Chatbot** (VPS):
- Deployment: Docker container on VPS
- URL: https://chat.cuttingedge.cihconsultingllc.com (should route here)
- Container: cutting-edge_chatbot_1 (port 3001)
- Backend: handoff-api (PM2, port 3000)
- Status: Unknown ⚠️ (VPS inaccessible)

---

## 🚨 Emergency Actions (If VPS Remains Inaccessible)

**Option 1: Contabo VNC Console**
1. Login to Contabo customer panel
2. Navigate to VPS: 109.199.118.38
3. Launch VNC console
4. Access terminal and run diagnostics

**Option 2: Hard Reboot VPS**
1. In Contabo panel, click "Restart"
2. Wait 3-5 minutes
3. Try SSH access
4. If still fails, use VNC console

**Option 3: Contact Contabo Support**
- Submit ticket: VPS unresponsive, SSH timeouts
- Request: Server health check from their end
- Reference: IP 109.199.118.38, customer ID

**Diagnostics to Run** (from EMERGENCY_RESPONSE_VPS.md):
```bash
{
echo "=== MEMORY ==="
free -h
echo ""
echo "=== LOAD ==="
cat /proc/loadavg
echo ""
echo "=== TOP 10 ==="
ps aux --sort=-%mem | head -10
echo ""
echo "=== DOCKER ==="
docker ps | grep -E 'chatbot|handoff|postgres'
echo ""
echo "=== NGINX ==="
systemctl status nginx --no-pager
}
```

---

## 📊 Success Metrics

### Must Have (Minimum Viable)

**Main Site**:
- [x] Loads without errors
- [x] "Chat Mode" button visible and clickable
- [x] Links to correct URL: https://chat.cuttingedge.cihconsultingllc.com

**Chatbot**:
- [ ] Page loads when clicking button
- [ ] Displays chat interface
- [ ] Can send messages
- [ ] AI responds
- [ ] Response time < 5 seconds
- [ ] No console errors

**Infrastructure**:
- [ ] DNS configured (A record exists)
- [ ] SSL certificate valid
- [ ] nginx routing correctly
- [ ] Chatbot container running
- [ ] handoff-api accessible

### Nice to Have

- Chatbot page loads < 2 seconds
- Message send < 500ms
- AI response < 2 seconds
- Streaming responses (future)
- Conversation history (future)
- Mobile responsive
- Graceful error handling

---

## 🎯 Next Actions

### Immediate (This Hour)

1. **⚠️ WAIT for VPS access** - Do NOT deploy until VPS is stable
2. **Review emergency docs**:
   - EMERGENCY_RESPONSE_VPS.md (quick commands)
   - SSH_TIMEOUT_DIAGNOSTIC_REPORT.md (diagnostics)
3. **Prepare implementation**:
   - Review this implementation plan
   - Gather all necessary commands
   - Prepare nginx config template

### Once VPS is Accessible

**Day 1 - Access & Diagnose** (Priority: CRITICAL):
1. Regain SSH access (VNC or hard reboot)
2. Run emergency diagnostic block
3. Check system health (memory, load, disk)
4. Verify nginx configuration
5. Check DNS records
6. Check chatbot container status
7. Check chatbot code version
8. Apply appropriate fix (Ollama/leak/nginx/chatbot)

**Day 1 - Deploy & Test** (Priority: HIGH):
1. Create/update nginx config for chat subdomain
2. Obtain SSL certificate if needed
3. Stop old chatbot container
4. Rebuild chatbot with new code
5. Start new chatbot container
6. Test DNS resolution
7. Test chatbot URL from browser
8. Test full chat flow (send message, get response)
9. Verify logs are clean
10. Document all changes

**Day 2-3 - Monitor & Validate** (Priority: MEDIUM):
1. Monitor chatbot logs for 24 hours
2. Test from multiple devices/browsers
3. Check memory usage trends
4. Verify no memory leaks
5. Test performance under load
6. Make adjustments based on findings
7. Update documentation
8. Commit and push changes to git

---

## 📝 Documentation Updates

**Files to Create/Update**:
1. **CHATBOT_LOADING_ISSUE.md** (this file) - Root cause and fix
2. **PROJECT_STATUS.md** - Add chatbot loading issue
3. **NETLIFY_VPS_DEPLOYMENT_PLAN.md** - Comprehensive deployment guide
4. **CHATBOT_VPS_FIX_CHECKLIST.md** - Verification checklist

**Commits Needed**:
- All implementation files
- nginx configuration
- Chatbot deployment verification
- Documentation updates

---

## 🔍 Troubleshooting Guide

### If Chatbot Page Doesn't Load

**Test 1: DNS Resolution**
```bash
# Check if DNS resolves
dig chat.cuttingedge.cihconsultingllc.com

# Check if it resolves to VPS IP
nslookup chat.cuttingedge.cihconsultingllc.com

# Expected: Both should return 109.199.118.38
```

**Test 2: Direct VPS Test**
```bash
# Bypass DNS, test VPS directly
curl -I http://109.199.118.38:3001

# Expected: HTTP 200 if chatbot container is running
```

**Test 3: nginx Configuration Check**
```bash
# Check nginx status
ssh contabo-vps "nginx -t && systemctl status nginx"

# Check nginx config
ssh contabo-vps "cat /etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf"

# Test nginx reload
ssh contabo-vps "sudo nginx -t && sudo systemctl reload nginx"
```

**Test 4: Container Check**
```bash
# List all containers
ssh contabo-vps "docker ps"

# Check chatbot container specifically
ssh contabo-vps "docker ps | grep -i chatbot"

# Check chatbot logs
ssh contabo-vps "docker logs cutting-edge_chatbot_1 --tail 50"

# Restart container if needed
ssh contabo-vps "docker restart cutting-edge_chatbot_1"
```

### If Chatbot Loads but Doesn't Work

**Test 1: Check Browser Console**
- Open DevTools (F12)
- Look for errors in Console tab
- Look for failed network requests in Network tab
- Check if API calls are failing

**Test 2: Check API Response**
```bash
# Test handoff-api directly
ssh contabo-vps "curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\",\"shopId\":1,\"conversationHistory\":[]}'"

# Expected: JSON response with AI answer
# If fails: API is down, need to restart PM2 handoff-api
```

**Test 3: Check Ollama Status** (if using Ollama)
```bash
# Check if Ollama is needed
ssh contabo-vps "systemctl status ollama"

# If disabled and chatbot needs it: Re-enable with limits
```

---

## 🚀 Quick Start Commands

### When VPS is Accessible

**Full Diagnostic Block**:
```bash
ssh contabo-vps "
echo '=== SYSTEM HEALTH ==='
free -h
uptime
cat /proc/loadavg
echo ''
echo '=== CHATBOT STATUS ==='
docker ps | grep chatbot
docker logs cutting-edge_chatbot_1 --tail 20
echo ''
echo '=== NGINX STATUS ==='
systemctl status nginx --no-pager
nginx -t 2>&1 | tail -5
"
```

**Quick Chatbot Test**:
```bash
# Test chatbot URL
curl -I https://chat.cuttingedge.cihconsultingllc.com

# Test chatbot API
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
      \"message\": \"What services do you offer?\",
      \"shopId\": 1,
      \"conversationHistory\": []
    }'
```

**Restart Services**:
```bash
# Restart chatbot container
ssh contabo-vps "docker restart cutting-edge_chatbot_1"

# Restart handoff-api
ssh contabo-vps "pm2 restart handoff-api"

# Reload nginx
ssh contabo-vps "sudo systemctl reload nginx"
```

---

## 📊 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **nginx config missing** | High | High | Create config, obtain SSL, test thoroughly |
| **DNS not configured** | High | High | Add A record, verify propagation |
| **Chatbot has old code** | Medium | High | Rebuild container with new code |
| **VPS inaccessible** | Critical | Critical | Use VNC console, emergency diagnostics |
| **SSL certificate missing** | Medium | High | Obtain with certbot |
| **Memory exhaustion** | Low (40%) | Monitoring + prevention (from previous fixes) |

---

## 🎓 Conclusion

**Root Cause**: Chatbot page on Netlify (https://cuttingedge.cihconsultingllc.com) links to https://chat.cuttingedge.cihconsultingllc.com, but this VPS URL is likely not configured properly in nginx or DNS.

**Immediate Blocker**: VPS inaccessible (SSH timeouts) - cannot verify or deploy fix.

**Required Actions** (in order):
1. Wait for VPS to become accessible
2. Run emergency diagnostics
3. Verify nginx configuration for chat subdomain
4. Verify DNS records for chat subdomain
5. Rebuild chatbot container with new code if needed
6. Test end-to-end flow from main site to chatbot
7. Document all changes
8. Commit to git and push

**Success Criteria**:
- Chatbot page loads when clicking button from main site
- Chat interface displays correctly
- User can send messages
- AI responds with relevant information
- Response time < 5 seconds
- No console errors
- nginx logs show successful requests

**Estimated Time to Fix**: 2-4 hours after VPS becomes accessible

---

**Generated**: 2026-02-11
**Agent**: Claude Code (Master Analysis & Planning)
**Priority**: CRITICAL - Chatbot Not Loading, Main Site Affected
**Next Action**: Await VPS accessibility, then execute Phase 1-3 of implementation plan

---

*This plan is ready to execute once VPS is accessible. All commands, configurations, and verification steps are documented.*