# Chatbot VPS Deployment - Verification Checklist

**Date**: 2026-02-11
**Purpose**: Verify chatbot deployment and fix loading issue

---

## Pre-Deployment Checks (Before VPS Access)

### Environment Setup
- [ ] Have VPS login credentials ready
- [ ] Have Contabo VNC console URL ready
- [ ] Have SSH terminal ready
- [ ] Have this checklist open (printed or on screen)

### Documentation Reviewed
- [ ] CHATBOT_LOADING_ISSUE.md (read and understood)
- [ ] CHATBOT_VPS_DEPLOYMENT_PLAN.md (reviewed)
- [ ] EMERGENCY_RESPONSE_VPS.md (commands ready)

---

## Phase 1: VPS Access (CRITICAL)

### Method 1: SSH Access
- [ ] Test SSH: `ssh contabo-vps "echo 'SSH test'"`
- [ ] If timeout (30s): Try Method 2
- [ ] If both fail: Use VNC console

### Method 2: Contabo VNC Console
- [ ] Login to https://customer.contabo.com
- [ ] Navigate to VPS: 109.199.118.38
- [ ] Launch VNC console
- [ ] Open terminal in VNC

### Method 3: Hard Reboot (Last Resort)
- [ ] Login to Contabo control panel
- [ ] Click "Restart" button
- [ ] Wait 5 minutes
- [ ] Try SSH access
- [ ] Try VNC console

**Result**:
- ⬜ SSH Access: [ ] Working / [ ] Timeout / [ ] VNC Used
- ⬜ Last Method: [ ] SSH / [ ] VNC / [ ] Control Panel

---

## Phase 2: System Diagnostics (When Accessible)

### Emergency Health Check
```bash
# RUN THIS ENTIRE BLOCK (copy-paste ready)
echo "=== SYSTEM HEALTH ==="
free -h
echo ""
echo "=== LOAD AVERAGE ==="
cat /proc/loadavg
echo ""
echo "=== TOP 10 MEMORY USERS ==="
ps aux --sort=-%mem | head -11
echo ""
echo "=== OLLAMA STATUS ==="
systemctl status ollama --no-pager 2>&1 | head -5
ps aux | grep ollama | head -5
echo ""
echo "=== PM2 STATUS ==="
pm2 status
echo ""
echo "=== DOCKER STATUS ==="
docker ps | grep -E 'chatbot|handoff|postgres'
docker stats --no-stream | head -5
```

**Expected Results**:
- Memory: Should show >4GB available
- Load: Should be <3.0 for all 3 numbers
- Ollama: Should be inactive or disabled
- PM2: All services "online"
- Docker: All containers "Up"

**If ANY Fail**:
- Document result (e.g., "Memory: Only 1.2GB available - CRITICAL")
- Take action based on failure
- Do NOT proceed with deployment

---

## Phase 3: nginx Configuration

### Check DNS Records
```bash
# Test DNS resolution
dig chat.cuttingedge.cihconsultingllc.com +short

# Should return: 109.199.118.38
# If returns different IP: DNS needs to be updated
```

### Check nginx Configuration
```bash
# Check if chat subdomain config exists
ls -la /etc/nginx/sites-enabled/ | grep chat

# If exists: Review it
cat /etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf

# If missing: Create it (using plan)
```

### Test SSL Certificate
```bash
# Check certificate
curl -vI https://chat.cuttingedge.cihconsultingllc.com 2>&1 | grep -i "certificate\|issuer"

# Should show: Valid certificate
# Should NOT show: "expired", "self-signed", "certificate error"
```

**Results**:
- [ ] DNS resolves to correct IP (109.199.118.38)
- [ ] nginx config exists for chat subdomain
- [ ] SSL certificate is valid
- [ ] nginx routes to localhost:3001

---

## Phase 4: Chatbot Container

### Check Container Status
```bash
# Check if running
docker ps | grep chatbot

# Check logs
docker logs cutting-edge_chatbot_1 --tail 30

# Test locally
curl -I http://localhost:3001

# Expected: HTTP 200 OK
```

### Verify Chatbot Code Version
```bash
# Check which code is deployed
ssh contabo-vps "docker exec cutting-edge_chatbot_1 cat /app/index.html | grep VITE_API_URL"

# Should show: VITE_API_URL=http://localhost:3000
# If shows https://api.cihconsultingllc.com: OLD CODE - Needs redeploy
```

**Results**:
- [ ] Container is running
- [ ] Container responds to HTTP requests
- [ ] Chatbot has NEW refactored code (using local API)
- [ ] OR old code is deployed (needs rebuild)

---

## Phase 5: Backend Services

### Check handoff-api (PM2)
```bash
# Check if running
pm2 status | grep handoff-api

# Test health endpoint
curl http://localhost:3000/api/health

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","shopId":1,"conversationHistory":[]}'

# Expected: JSON response with AI answer
```

### Check PostgreSQL Database
```bash
# Check if running
docker ps | grep postgres

# Check connection
ssh contabo-vps "docker exec cutting-edge-postgres_1 psql -U postgres -c 'SELECT 1;'"

# Expected: Returns "1" (connection successful)
```

**Results**:
- [ ] handoff-api is running (PM2)
- [ ] Health endpoint responds
- [ ] Chat endpoint responds
- [ ] Database is accessible

---

## Phase 6: Deployment Actions (Based on Findings)

### If nginx Config Missing
```bash
# Create nginx config
cat > /etc/nginx/sites-enabled/chat.cuttingedge.cihconsultingllc.com.conf << 'EOF'
server {
    listen 443 ssl;
    server_name chat.cuttingedge.cihconsultingllc.com;

    ssl_certificate /etc/letsencrypt/live/chat.cuttingedge.cihconsultingllc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.cuttingedge.cihconsultingllc.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    }
}

EOF

# Test nginx configuration
sudo nginx -t

# If OK: Reload nginx
sudo systemctl reload nginx
```

### If Chatbot Has Old Code
```bash
# Rebuild with new code
cd /root/NeXXT_WhatsGoingOn
docker stop cutting-edge_chatbot_1
docker rm cutting-edge_chatbot_1
cd services/chatbot
docker build -t cutting-edge-chatbot:new .
docker run -d \
  --name cutting-edge_chatbot_1 \
  -p 3001:80 \
  --network cutting-edge-network \
  --restart unless-stopped \
  cutting-edge-chatbot:new

# Verify
docker ps | grep chatbot
curl -I http://localhost:3001
```

### If Ollama Running
```bash
# Stop and disable Ollama
systemctl stop ollama
systemctl disable ollama
systemctl mask ollama

# Kill any remaining processes
pkill -9 ollama

# Verify memory freed
free -h
```

---

## Phase 7: End-to-End Testing

### Test 1: Main Site → Chatbot
1. Open: https://cuttingedge.cihconsultingllc.com
2. Locate "Chat Mode" button (bottom right corner)
3. Click button
4. **Expected**: Chatbot page opens: https://chat.cuttingedge.cihconsultingllc.com
5. **Verify**: Page loads without errors

### Test 2: Send Message
1. On chatbot page, enter message: "What services do you offer?"
2. Click send button
3. **Expected**: AI responds with relevant information
4. **Verify**: Response time < 5 seconds

### Test 3: Check Sources
1. Ask: "How much is a haircut?"
2. **Expected**: Response includes source citations (if relevant)
3. **Verify**: Sources display correctly with scores

### Test 4: Error Handling
1. Send: "This is a test error message"
2. **Expected**: Graceful error message displayed
3. **Verify**: No console errors, no server errors

---

## Phase 8: Verification & Documentation

### Verify All Services
- [ ] nginx routing correct (chat.cuttingedge → localhost:3001)
- [ ] Chatbot container running and responding
- [ ] handoff-api accessible and working
- [ ] PostgreSQL database connected
- [ ] Ollama not consuming memory (disabled)

### Collect Logs
```bash
# Save nginx logs
ssh contabo-vps "sudo tail -100 /var/log/nginx/chat.cuttingedge.cihconsultingllc.com-access.log > /tmp/nginx_logs.txt"

# Save chatbot logs
ssh contabo-vps "docker logs cutting-edge_chatbot_1 --tail 100 > /tmp/chatbot_logs.txt"

# Save PM2 logs
ssh contabo-vps "pm2 logs handoff-api --lines 100 > /tmp/handoff_api_logs.txt"
```

### Document Results
- [ ] Create deployment report: `CHATBOT_VPS_DEPLOYMENT_REPORT.md`
- [ ] Update PROJECT_STATUS.md with resolution
- [ ] Update any related documentation
- [ ] Commit and push to git

---

## Success Criteria - Final

### Must Have (All Required for Production)
- [ ] Chatbot page loads from main site button
- [ ] No console errors in browser
- [ ] User can send messages
- [ ] AI responds with relevant information
- [ ] Response time < 5 seconds (95th percentile)
- [ ] No HTTP errors in logs
- [ ] nginx routes correctly
- [ ] Container stable (no restarts)
- [ ] Memory usage < 70% (with 6.9GB available baseline)
- [ ] Load average < 3.0

### Nice to Have
- [ ] Chat interface looks professional and responsive
- [ ] Streaming responses work (if implemented)
- [ ] Mobile experience is good
- [ ] Error handling is graceful
- [ ] Sources display with scores when relevant
- [ ] All monitoring active
- [ ] Documentation is up to date

### Performance Targets
- [ ] Page load: < 2 seconds
- [ ] Message send: < 500ms
- [ ] AI response: < 3 seconds
- [ ] Memory usage: < 70%
- [ ] Load average: < 3.0
- [ ] Uptime: > 99.9%

---

## Issues Found & Resolutions

### Issue 1: DNS Not Configured
**Finding**: chat.cuttingedge.cihconsultingllc.com A record missing
**Resolution**: Add A record pointing to 109.199.118.38
**Status**: ⏳ Pending

### Issue 2: nginx Config Missing
**Finding**: No nginx config for chat.cuttingedge subdomain
**Resolution**: Create config using template in CHATBOT_VPS_DEPLOYMENT_PLAN.md
**Status**: ⏳ Pending

### Issue 3: Chatbot Old Code
**Finding**: Container might have old code using external APIs
**Resolution**: Rebuild container with new code from git
**Status**: ⏳ Pending

### Issue 4: VPS Inaccessible
**Finding**: SSH commands timing out (10-15 seconds)
**Resolution**: Wait for VPS to stabilize, use VNC console if needed
**Status**: ⏳ Pending

---

## Next Actions

### Immediate (When VPS Accessible)
1. Run Phase 1 diagnostic block (copy from EMERGENCY_RESPONSE_VPS.md)
2. Based on results, execute appropriate phase (3-8)
3. Document all findings and actions taken
4. Create deployment report
5. Update PROJECT_STATUS.md
6. Commit and push to git

### Documentation to Update
1. PROJECT_STATUS.md - Add chatbot deployment status
2. CHATBOT_VPS_DEPLOYMENT_REPORT.md - Create final report
3. NETLIFY_VPS_DEPLOYMENT_PLAN.md - Update with actual results

---

## Notes

- **IMPORTANT**: Do NOT deploy until VPS is verified as stable
- **TIP**: Use Contabo VNC console if SSH remains inaccessible
- **TIP**: Run full diagnostic block before making ANY changes
- **TIP**: Document EVERY action taken (even failed attempts)
- **REMINDER**: Chatbot code was refactored to use local APIs (not external)

---

**Checklist Version**: 1.0
**Last Updated**: 2026-02-11 19:30
**Status**: Ready for execution when VPS is accessible
