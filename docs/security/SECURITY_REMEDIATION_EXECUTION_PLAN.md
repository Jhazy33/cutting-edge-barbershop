# Security Remediation Execution Plan
**Date**: 2026-02-11 20:57 EST
**Orchestrator**: Claude Code
**Status**: 🔄 READY TO EXECUTE
**Phase**: CRITICAL - Immediate Token Revocation

---

## CRITICAL FINDINGS SUMMARY

### Exposed Credentials (Confirmed)
```bash
# File: /root/cutting-edge/.env
GEMINI_API_KEY=AIzaSyBouCTuYhoipvG61cSvFlYR7V-VfI-S_yE
CF_API_TOKEN=0tDYTVQQIoXjE8EryVuW5rzqQqssJrU25CEqaq3t

# File: /root/cutting-edge/AI_temp/DEPLOYMENT.md
TELEGRAM_BOT_TOKEN=7726713926:AAGK3C_gX4T8XU0u4T_w8lZ8j2uV505qD88
```

### Services Using Exposed Credentials

#### 1. Gemini API Key Usage
- **Docker Containers**:
  - `cutting-edge_handoff-api_1` (port 3000) - Handoff API for RAG
  - `cutting-edge_chatbot_1` (port 3001) - AI chatbot
  - `cutting-edge_voice-backend-1` (port 3040) - Voice app backend
  - `cutting-edge_voice-app_1` - Voice app frontend

- **Environment Variable References**:
  - `docker-compose.yml`: `VITE_GEMINI_API_KEY=${GEMINI_API_KEY}`
  - Multiple vite.config.ts files

#### 2. Cloudflare API Token Usage
- Unknown (need to audit automation scripts)
- Likely used for DNS/SSL management

#### 3. Telegram Bot Token Usage
- **PM2 Service**: `telegram-bot` (running, PID 81893, 2 restarts)
- **Docker Container**: `nexxt_whatsgoingon-telegram-bot-1` (running)
- **Active**: Yes, confirmed running

---

## BACKUPS CREATED ✅

### System Backups
```bash
# .env file backup
/root/cutting-edge/.env.backup_20260211_2057XX

# Database backup
/root/cutting-edge/db_backup_pre_security_20260211_2057XX.sql
```

### Rollback Commands
```bash
# Restore .env
ssh contabo-vps
cp /root/cutting-edge/.env.backup_20260211_2057XX /root/cutting-edge/.env

# Restore database
docker exec -i nexxt_whatsgoingon-postgres-1 \
  psql -U jhazy -d nexxt_db < /root/cutting-edge/db_backup_pre_security_20260211_2057XX.sql
```

---

## EXECUTION PLAN

### Phase 1: CRITICAL - Token Revocation (0-30 min)

#### Step 1: Create Placeholder Credentials (5 min)
**Action**: Generate new secure credentials for replacement

**New Credentials to Generate**:
1. **New Gemini API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create new API key
   - Restrict to Gemini API only
   - Enable application restrictions (VPS IP only)

2. **New Cloudflare API Token**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Create new token with minimal permissions
   - Restrict to specific zones
   - Set expiration date

3. **Telegram Bot Token**
   - Decision needed: Is bot still needed?
   - If yes: Keep current token (bot-specific, less risk)
   - If no: Revoke via BotFather

#### Step 2: Update VPS .env File (2 min)
**Action**: Replace exposed credentials with new keys

```bash
# Backup current .env (already done)
ssh contabo-vps
cd /root/cutting-edge

# Create new .env with updated credentials
cat > .env << 'EOF'
# NEW CREDENTIALS - 2026-02-11 Security Remediation
GEMINI_API_KEY=<NEW_KEY_HERE>
CF_API_TOKEN=<NEW_TOKEN_HERE>

# OLD EXPOSED CREDENTIALS (REVOKED):
# GEMINI_API_KEY=AIzaSyBouCTuYhoipvG61cSvFlYR7V-VfI-S_yE
# CF_API_TOKEN=0tDYTVQQIoXjE8EryVuW5rzqQqssJrU25CEqaq3t
EOF
```

#### Step 3: Restart Docker Services (3 min)
**Action**: Restart all services using Gemini API key

```bash
# Restart cutting-edge services
cd /root/cutting-edge
docker-compose restart handoff-api chatbot voice-backend voice-app

# Verify containers started
docker-compose ps
```

**Expected Output**: All containers status = "Up"

#### Step 4: Restart PM2 Services (1 min)
**Action**: Restart telegram-bot if token changed

```bash
# Only if telegram token is being changed
pm2 restart telegram-bot
```

#### Step 5: Verification (10 min)
**Action**: Test all services are working

```bash
# Test chatbot
curl -X POST https://cuttingedge.cihconsultingllc.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# Expected: 200 OK with response

# Test handoff API
curl https://cuttingedge.cihconsultingllc.com/api/health
# Expected: 200 OK

# Check logs for errors
docker-compose logs --tail=50
pm2 logs --err
```

---

### Phase 2: HIGH - VPS Cleanup (30-90 min)

#### Step 6: Audit All .env Files (15 min)
**Action**: Identify active vs inactive .env files

**Files Found** (15 total):
```
/root/cutting-edge/.env                         ← ACTIVE (main)
/root/cutting-edge/gemini-live-debug/.env       ← Audit needed
/root/cutting-edge/cutting-edge-handoff-api/.env ← Audit needed
/root/cutting-edge/AI_temp/.env                 ← Likely inactive
/root/cutting-edge/Website Ideas/.../.env       ← Likely inactive
/root/cutting-edge/cutting-edge-main-site/.env.local ← Audit needed
/root/cutting-edge/AI Chatbot/.../.env          ← Likely inactive
/root/cutting-edge/AI/.env                      ← Likely inactive
/root/cutting-edge/AI Voice App/.../.env       ← Likely inactive
```

**Action Plan**:
1. Check each file for active credentials
2. Test if file is referenced by running service
3. Delete unused files
4. Consolidate active files to minimal set

#### Step 7: Cleanup Documentation (5 min)
**Action**: Remove Telegram token from documentation

```bash
# Option A: Replace with placeholder
sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE/' \
  /root/cutting-edge/AI_temp/DEPLOYMENT.md

# Option B: Delete the entire file (if not needed)
rm /root/cutting-edge/AI_temp/DEPLOYMENT.md
```

#### Step 8: Consolidate .env Structure (20 min)
**Action**: Create unified .env structure

**Target Structure**:
```
/root/cutting-edge/.env                 ← Main env file (ACTIVE)
/root/cutting-edge/.env.backup          ← Backup
/root/cutting-edge/.env.example         ← Template (no secrets)
```

**Actions**:
1. Keep only main .env file
2. Delete all other .env files (after audit)
3. Create .env.example for reference

#### Step 9: Update Service Configurations (10 min)
**Action**: Ensure all services use main .env

```bash
# Update docker-compose.yml to use main .env
cd /root/cutting-edge

# Verify env_file points to main .env
grep "env_file" docker-compose.yml

# Update if needed
# env_file:
#   - .env
```

---

### Phase 3: MEDIUM - System Verification (90-150 min)

#### Step 10: Integration Testing (30 min)
**Action**: Run comprehensive service tests

**Test Suite**:
1. ✅ Chatbot functionality (end-to-end)
2. ✅ Handoff API (RAG queries)
3. ✅ Voice app (if applicable)
4. ✅ Database connectivity
5. ✅ Telegram bot (if active)
6. ✅ Memory usage check
7. ✅ Response time verification

**Commands**:
```bash
# Test chatbot
curl -X POST https://cuttingedge.cihconsultingllc.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are your hours?"}' \
  --max-time 10

# Test database
docker exec nexxt_whatsgoingon-postgres-1 \
  psql -U jhazy -d nexxt_db -c "SELECT COUNT(*) FROM knowledge_base;"

# Check memory
docker stats --no-stream
pm2 monit
```

#### Step 11: Performance Verification (15 min)
**Action**: Compare before/after metrics

**Metrics to Track**:
- Response times (p50, p95, p99)
- Memory usage per container
- CPU utilization
- Error rates
- Service uptime

**Expected Results**:
- Response times: <2s (no degradation)
- Memory: Stable (no leaks)
- CPU: <50% per container
- Errors: 0

#### Step 12: 24-Hour Monitoring (Ongoing)
**Action**: Monitor for issues

**Check List**:
- [ ] Check logs every hour for first 4 hours
- [ ] Monitor error rates
- [ ] Verify chatbot functionality
- [ ] Watch for memory leaks
- [ ] Confirm no unauthorized API usage

---

### Phase 4: LOW - Long-term Security (Week 1-2)

#### Step 13: Implement Secrets Management (Week 1)
**Action**: Replace .env files with secure secrets management

**Options**:
1. **Environment Variables in systemd** (Recommended for VPS)
   - No .env files on disk
   - Secrets in memory only
   - Easy to rotate

2. **HashiCorp Vault** (Best for production)
   - Centralized secrets management
   - Automatic rotation
   - Audit logging

3. **AWS Secrets Manager** (If using AWS)
   - Cloud-native solution
   - Automatic rotation
   - Integration with other AWS services

#### Step 14: Documentation & Training (Week 2)
**Action**: Create security best practices guide

**Topics**:
1. Secrets management policy
2. .env file handling guidelines
3. Git security (.gitignore, pre-commit hooks)
4. API key rotation procedures
5. Security audit checklist

---

## RISK MITIGATION

### High-Risk Activities
1. **Token Revocation**: Service outage risk (2-5 min)
   - **Mitigation**: Perform during low-traffic hours
   - **Rollback**: Restore .env.backup if services fail

2. **Service Restart**: Incomplete startup risk
   - **Mitigation**: Monitor logs during restart
   - **Rollback**: Manual intervention if needed

3. **.env Consolidation**: Configuration mismatch risk
   - **Mitigation**: Test in staging first
   - **Rollback**: Restore from backup

### Low-Risk Activities
1. Database backup (already complete)
2. Documentation updates
3. .gitignore updates
4. Monitoring setup

---

## SUCCESS CRITERIA

### Phase 1 Success (CRITICAL)
- ✅ All exposed tokens revoked
- ✅ New tokens active and working
- ✅ All services operational
- ✅ Zero data loss
- ✅ Outage <5 minutes

### Phase 2 Success (HIGH)
- ✅ .env files consolidated (<5 total)
- ✅ Unused .env files deleted
- ✅ Documentation cleaned
- ✅ No token references in code

### Phase 3 Success (MEDIUM)
- ✅ All integration tests passing
- ✅ Performance acceptable (no degradation)
- ✅ No new errors in logs
- ✅ System health verified

### Phase 4 Success (LOW)
- ✅ Secrets management implemented
- ✅ Documentation complete
- ✅ Team trained on security
- ✅ Ongoing monitoring in place

---

## NEXT ACTIONS (IMMEDIATE)

### User Must Do (Cannot be Automated):
1. **Revoke Gemini API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find key: `AIzaSyBouCTuYhoipvG61cSvFlYR7V-VfI-S_yE`
   - Delete it immediately
   - Create new key with restrictions
   - Provide new key for .env update

2. **Revoke Cloudflare Token**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Find token: `0tDYTVQQIoXjE8EryVuW5rzqQqssJrU25CEqaq3t`
   - Delete it immediately
   - Create new token with minimal permissions
   - Provide new token for .env update

3. **Decide on Telegram Bot**
   - Is the telegram-bot service still needed?
   - If yes: Keep current token (less risk)
   - If no: Revoke via BotFather and stop service

### Claude Will Do (Automated):
1. Update .env file with new credentials (once provided)
2. Restart affected services
3. Verify service functionality
4. Run integration tests
5. Clean up .env files
6. Update documentation
7. Generate final report

---

## COMMUNICATIONS PLAN

### During Execution (Minutes 0-30)
- **Silent Period**: Minutes 0-15 (critical operations)
- **Status Update**: Every 5 minutes after minute 15
- **Alerts**: Immediate on any service failure

### Post-Execution (Hours 1-24)
- **Hour 1**: Monitor every 15 minutes
- **Hours 2-4**: Monitor every 30 minutes
- **Hours 5-24**: Monitor every 2 hours

### Status Reports
- **Phase 1 Complete**: After 30 minutes
- **Phase 2 Complete**: After 90 minutes
- **Phase 3 Complete**: After 150 minutes
- **Final Report**: After 24 hours

---

## ROLLBACK PROCEDURES

### If Services Fail After Token Rotation

#### Scenario 1: Chatbot/AI Services Fail
```bash
# Immediate rollback (seconds)
ssh contabo-vps
cd /root/cutting-edge
cp .env.backup_20260211_2057XX .env
docker-compose restart handoff-api chatbot voice-backend voice-app

# Verify restored
docker-compose ps
curl https://cuttingedge.cihconsultingllc.com/api/health
```

#### Scenario 2: All Services Down
```bash
# Full system rollback
ssh contabo-vps
cd /root/cutting-edge

# Restore .env
cp .env.backup_20260211_2057XX .env

# Restart all services
docker-compose restart
pm2 restart all

# Restore database if needed
docker exec -i nexxt_whatsgoingon-postgres-1 \
  psql -U jhazy -d nexxt_db < db_backup_pre_security_20260211_2057XX.sql
```

#### Scenario 3: Partial Failure
```bash
# Restart only failed services
docker-compose restart <service-name>
pm2 restart <service-name>

# Check logs
docker-compose logs --tail=100 <service-name>
pm2 logs --err
```

---

## VERIFICATION COMMANDS

### Pre-Rollback Checks
```bash
# Check service status
docker-compose ps
pm2 status

# Check logs
docker-compose logs --tail=50
pm2 logs --lines 50

# Test connectivity
curl -I https://cuttingedge.cihconsultingllc.com
```

### Post-Rollback Verification
```bash
# All containers up?
docker-compose ps | grep -q "Up"

# PM2 processes online?
pm2 status | grep -q "online"

# API responding?
curl -s https://cuttingedge.cihconsultingllc.com/api/health | grep -q "ok"

# Database connected?
docker exec nexxt_whatsgoingon-postgres-1 \
  psql -U jhazy -d nexxt_db -c "SELECT 1;" | grep -q "1"
```

---

## DOCUMENTATION DELIVERABLES

### Reports to Generate
1. ✅ Security Remediation Execution Plan (this file)
2. ⏳ Token Revocation Confirmation (after step 1-3)
3. ⏳ Service Verification Report (after step 5)
4. ⏳ .env Cleanup Report (after step 8)
5. ⏳ Integration Test Report (after step 10)
6. ⏳ Final Remediation Summary (after 24 hours)

### Files to Update
1. `/root/cutting-edge/.env` - New credentials
2. `/root/cutting-edge/AI_temp/DEPLOYMENT.md` - Remove token
3. `.gitignore` - Add patterns for .env files
4. `SECURITY_AUDIT_REPORT_20260211.md` - Update with remediation status

---

## ESTIMATED TIMELINE

### Phase 1: CRITICAL (0-30 min)
- 00-05: User revokes tokens, generates new ones
- 05-10: Claude updates .env with new credentials
- 10-15: Docker services restart
- 15-25: Verification testing
- 25-30: Status confirmation

### Phase 2: HIGH (30-90 min)
- 30-45: .env file audit
- 45-65: Cleanup documentation
- 65-85: Consolidate .env structure
- 85-90: Update service configs

### Phase 3: MEDIUM (90-150 min)
- 90-105: Integration testing
- 105-120: Performance verification
- 120-135: 24-hour monitoring setup
- 135-150: Final health check

### Phase 4: LOW (Week 1-2)
- Week 1: Implement secrets management
- Week 2: Documentation and training

**Total Active Time**: 2.5 hours (spread over 2 weeks)

---

**Status**: 🔄 WAITING FOR USER ACTION (Token Revocation)
**Next Step**: User revokes tokens and provides new credentials
**Orchestrator**: Ready to execute immediately upon new credentials

---

**Generated with**: Claude Code Orchestrator Agent
**Multi-Agent Coordination**: Security Remediation
**Priority**: 🔴 CRITICAL
**Goal**: Secure exposed credentials with zero service disruption

