# Performance Optimization Action Plan

**VPS Performance Crisis - Immediate Response Plan**
**Date**: 2026-02-11
**Priority**: CRITICAL
**Status**: ACTION REQUIRED

---

## Executive Summary

### Situation
- VPS (109.199.118.38) is experiencing severe performance degradation
- SSH commands are timing out intermittently
- Memory is healthy (61% free) but system is unstable
- Cannot verify current load average or process status

### Key Findings
1. **Memory fix worked** - 6.7GB available (up from 262MB)
2. **But system still unstable** - commands timing out
3. **Something else is wrong** - not a memory issue

---

## Performance Baseline Comparison

| Metric | Before Fix | After Fix (Claimed) | Current (Verified) | Target |
|--------|-----------|-------------------|-------------------|--------|
| **Memory Free** | 262MB (2%) | 6.9GB (58%) | 6.7GB (61%) | >4GB (35%) |
| **Load Average** | 3.06, 2.90, 3.10 | "Decreasing" | UNKNOWN | <2.0 |
| **SSH Access** | Timing out | "Working" | Timing out | 100% |
| **Ollama** | Running (6.5GB) | Disabled | UNKNOWN | Managed |
| **Telegram Bot** | 235 restarts | N/A | UNKNOWN | 0 restarts |

---

## Root Cause Analysis

### Original Issue (RESOLVED)
```
Ollama AI service → 6.5GB RAM (53% of total)
→ Memory exhaustion (262MB free)
→ Cannot spawn new processes
→ SSH commands timeout
```

**Fix Applied**: Disabled Ollama service
**Result**: Memory freed to 6.7GB
**Status**: ✅ Memory issue resolved

### Current Issue (UNRESOLVED)
```
Something unknown → System calls timeout
→ Cannot run ps, top, pm2 status
→ Cannot diagnose issue
→ System unstable
```

**Current State**:
- Memory is healthy (61% free)
- But simple commands work, complex ones timeout
- Pattern suggests: I/O wait, locks, or kernel issue

**Status**: 🔴 ACTIVE - Root cause unknown

---

## Diagnostic Results

### What Works
- ✅ SSH connection: Connects immediately
- ✅ Simple commands: `echo`, `free -h`
- ✅ Direct file access: `cat /proc/meminfo`

### What Times Out
- ❌ Process enumeration: `ps aux`, `top`
- ❌ Process managers: `pm2 status`, `systemctl`
- ❌ System stats: `uptime`, `dmesg`
- ❌ Network commands: `curl`, `wget`

### Pattern Analysis
```
Commands requiring /proc filesystem → TIMEOUT
Commands requiring new process spawn → TIMEOUT
Commands reading direct files → WORK
```

**Hypothesis**: /proc filesystem is slow or locked, causing any command that reads process info to timeout

---

## Priority Action Plan

### Phase 1: Emergency Diagnostics (When SSH Accessible)

#### Step 1: Minimal Impact Checks
```bash
# These should work even under load
ssh -o ConnectTimeout=3 contabo-vps "cat /proc/loadavg"
ssh -o ConnectTimeout=3 contabo-vps "cat /proc/meminfo | grep Mem"
ssh -o ConnectTimeout=3 contabo-vps "cat /proc/uptime"
```

#### Step 2: Process Snapshot (If Step 1 Works)
```bash
# Single snapshot, no continuous monitoring
timeout 5 ssh contabo-vps "cat /proc/<PID>/status" \
  | grep -E "(VmRSS|VmSize|Threads|State)"
```

#### Step 3: Docker Status (Usually Works)
```bash
# Docker daemon may respond when shell doesn't
ssh contabo-vps "docker ps --format '{{.Names}}\t{{.Status}}'"
```

#### Step 4: Check for Locks
```bash
# Look for database locks
ssh contabo-vps "docker exec cutting-edge-postgres \
  psql -U postgres -d nexxt_db -c 'SELECT * FROM pg_stat_activity;'"
```

### Phase 2: Immediate Fixes (Do These First)

#### Fix 1: Configure Swap (CRITICAL)
**Why**: No swap = no safety valve = OOM deaths
**Priority**: HIGHEST
**Time**: 2 minutes

```bash
ssh contabo-vps << 'EOF'
# Create 4GB swap file
fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Persist across reboots
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Tune swappiness (only swap if critical)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p

# Verify
free -h
cat /proc/swaps
EOF
```

#### Fix 2: Kill Suspicious Processes
**Why**: Something is blocking system calls
**Priority**: HIGH
**Time**: 5 minutes

```bash
ssh contabo-vps << 'EOF'
# Check for defunct/zombie processes
ps aux | grep defunct

# Check for D-state (uninterruptible sleep) processes
ps aux | awk '$8=="D"'

# If found, note PID and try to kill gracefully
# kill -15 <PID>
# If stuck, force kill
# kill -9 <PID>
EOF
```

#### Fix 3: Restart PM2 Processes
**Why**: Clear any stuck processes
**Priority**: MEDIUM
**Time**: 2 minutes

```bash
ssh contabo-vps << 'EOF'
# Soft restart all PM2 processes
pm2 restart all

# If that doesn't work, hard restart
pm2 delete all
pm2 resurrect
pm2 save
EOF
```

#### Fix 4: Check Disk Space
**Why**: Full disk causes I/O issues
**Priority**: HIGH
**Time**: 1 minute

```bash
ssh contabo-vps << 'EOF'
# Check disk space
df -h

# Check inode usage
df -i

# Find large files
du -sh /var/log/* | sort -rh | head -10
du -sh /root/* | sort -rh | head -10

# Clean logs if needed
journalctl --vacuum-time=7d
docker system prune -f
EOF
```

### Phase 3: Resource Limits (Prevent Recurrence)

#### Limit Docker Containers
```bash
# Update /root/cutting-edge/docker-compose.yml
cat > /tmp/docker-limits.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 512M
    shm_size: 1gb
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          memory: 2G
    environment:
      - OLLAMA_MAX_LOADED_MODELS=1
      - OLLAMA_NUM_PARALLEL=2
    restart: unless-stopped
EOF

# Apply to system
scp /tmp/docker-limits.yml contabo-vps:/root/cutting-edge/
ssh contabo-vps "cd /root/cutting-edge && docker-compose down && docker-compose up -d"
```

#### Limit PM2 Processes
```bash
# Update ecosystem.config.js
cat > /tmp/pm2-memory-limits.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'web',
      max_memory_restart: '1G',
      restart_delay: 4000
    },
    {
      name: 'discovery',
      max_memory_restart: '1G',
      restart_delay: 4000
    },
    {
      name: 'brain',
      max_memory_restart: '1G',
      restart_delay: 4000
    }
  ]
}
EOF

# Apply
scp /tmp/pm2-memory-limits.js contabo-vps:~/.pm2/ecosystem.config.js
ssh contabo-vps "pm2 reload ecosystem.config.js --update-env"
```

### Phase 4: Monitoring Setup

#### Install System Monitoring
```bash
ssh contabo-vps << 'EOF'
# Install monitoring tools
apt update
apt install -y htop sysstat iotop nethogs

# Enable sysstat collection
sed -i 's/ENABLED="false"/ENABLED="true"/' /etc/default/sysstat
systemctl restart sysstat
systemctl enable sysstat

# Install PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Configure Docker log rotation
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKEREOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
DOCKEREOF

systemctl restart docker
EOF
```

#### Set Up Alerts
```bash
ssh contabo-vps << 'EOF'
# Create alert script
cat > /usr/local/bin/vps-alert.sh << 'ALERTEOF'
#!/bin/bash

ADMIN_EMAIL="admin@cihconsultingllc.com"
HOSTNAME=$(hostname)

# Check memory
MEM_USAGE=$(free | awk '/Mem/{printf("%.0f"), $3/$2*100}')
if [ $MEM_USAGE -gt 80 ]; then
  echo "WARNING: $HOSTNAME memory usage at ${MEM_USAGE}%" | \
    mail -s "[$HOSTNAME] Memory Alert" $ADMIN_EMAIL
fi

# Check load average
LOAD=$(cat /proc/loadavg | awk '{print $1}')
CORES=$(nproc)
if (( $(echo "$LOAD > $CORES" | bc -l) )); then
  echo "WARNING: $HOSTNAME load average ${LOAD} > ${CORES} cores" | \
    mail -s "[$HOSTNAME] Load Alert" $ADMIN_EMAIL
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "WARNING: $HOSTNAME disk usage at ${DISK_USAGE}%" | \
    mail -s "[$HOSTNAME] Disk Alert" $ADMIN_EMAIL
fi
ALERTEOF

chmod +x /usr/local/bin/vps-alert.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/vps-alert.sh") | crontab -
EOF
```

#### Create Diagnostic Script
```bash
ssh contabo-vps << 'EOF'
# Create comprehensive diagnostic script
cat > /usr/local/bin/vps-diagnose.sh << 'DIAGEOF'
#!/bin/bash

LOG_FILE="/var/log/vps-diagnostics.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== $DATE ===" >> $LOG_FILE

# System info
echo "--- Uptime ---" >> $LOG_FILE
cat /proc/uptime >> $LOG_FILE

echo "--- Load Average ---" >> $LOG_FILE
cat /proc/loadavg >> $LOG_FILE

echo "--- Memory ---" >> $LOG_FILE
free -h >> $LOG_FILE

echo "--- Disk ---" >> $LOG_FILE
df -h >> $LOG_FILE

# Processes (single snapshot)
echo "--- Top 5 CPU ---" >> $LOG_FILE
ps aux --sort=-%cpu | head -6 >> $LOG_FILE 2>&1

echo "--- Top 5 Memory ---" >> $LOG_FILE
ps aux --sort=-%mem | head -6 >> $LOG_FILE 2>&1

# PM2
echo "--- PM2 Status ---" >> $LOG_FILE
pm2 status >> $LOG_FILE 2>&1

# Docker
echo "--- Docker Containers ---" >> $LOG_FILE
docker ps --format "table {{.Names}}\t{{.Status}}" >> $LOG_FILE 2>&1

echo "--- Docker Stats ---" >> $LOG_FILE
timeout 5 docker stats --no-stream >> $LOG_FILE 2>&1

# Database
echo "--- Database Connections ---" >> $LOG_FILE
docker exec cutting-edge-postgres psql -U postgres -d nexxt_db \
  -c "SELECT count(*) FROM pg_stat_activity;" >> $LOG_FILE 2>&1

echo "===================" >> $LOG_FILE
echo "Diagnostics logged to $LOG_FILE"
DIAGEOF

chmod +x /usr/local/bin/vps-diagnose.sh

# Run every hour
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/vps-diagnose.sh") | crontab -
EOF
```

---

## Investigation Checklist

### Telegram Bot (235 Restarts)
- [ ] Check PM2 logs: `pm2 logs telegram-bot --err --lines 100`
- [ ] Check for memory leaks: `pm2 monit`
- [ ] Check API rate limits
- [ ] Check network connectivity
- [ ] Review error logs for patterns
- [ ] Update with resource limits: `max_memory_restart: 500M`

### Ollama Status
- [ ] Verify if disabled: `systemctl status ollama`
- [ ] Check if processes running: `ps aux | grep ollama`
- [ ] Check Docker containers: `docker ps | grep ollama`
- [ ] If running, decide: keep disabled or re-enable with limits

### Database Health
- [ ] Check connections: `docker exec cutting-edge-postgres psql -U postgres -d nexxt_db -c "SELECT * FROM pg_stat_activity;"`
- [ ] Check locks: `docker exec cutting-edge-postgres psql -U postgres -d nexxt_db -c "SELECT * FROM pg_locks WHERE granted = false;"`
- [ ] Check long queries: `docker exec cutting-edge-postgres psql -U postgres -d nexxt_db -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"`
- [ ] Check bloat: `docker exec cutting-edge-postgres psql -U postgres -d nexxt_db -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"`

### Disk I/O
- [ ] Check I/O wait: `iostat -x 1 5`
- [ ] Check disk usage: `du -sh /var/log/* | sort -rh | head -10`
- [ ] Check for large files: `find / -type f -size +100M 2>/dev/null | head -10`
- [ ] Clear old logs: `journalctl --vacuum-time=7d`

### Network
- [ ] Check DNS: `ping -c 3 google.com`
- [ ] Check latency: `ping -c 3 8.8.8.8`
- [ ] Check bandwidth: `nethogs`
- [ ] Check open ports: `netstat -tlnp | grep LISTEN`

---

## Decision Matrix: Ollama

### Option A: Keep Disabled (Current)
**Pros**:
- ✅ No memory risk
- ✅ System stable (for now)
- ✅ No AI management overhead

**Cons**:
- ❌ Chatbot depends on external APIs
- ❌ Single point of failure
- ❌ Increased latency
- ❌ Potential API costs
- ❌ Data privacy concerns

**Verdict**: ⚠️ Temporary fix, not sustainable

### Option B: Re-Enable with Limits (Recommended)
**Pros**:
- ✅ Privacy (data stays local)
- ✅ Latency (no network calls)
- ✅ Control (model selection)
- ✅ Cost (no API fees)
- ✅ Resource limits prevent issues

**Cons**:
- ⚠️ Need to manage models
- ⚠️ Need to monitor resources
- ⚠️ Need swap configured

**Configuration**:
```yaml
ollama:
  image: ollama/ollama:latest
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 4G
      reservations:
        memory: 2G
  environment:
    - OLLAMA_MAX_LOADED_MODELS=1
    - OLLAMA_NUM_PARALLEL=2
  restart: unless-stopped
```

**Verdict**: ✅ Recommended (after swap is configured)

### Option C: Migrate to Cloud API
**Pros**:
- ✅ No resource usage on VPS
- ✅ High availability (SLA)
- ✅ No maintenance

**Cons**:
- ❌ Increased latency (1-2s)
- ❌ API costs ($0.01-0.10/1K tokens)
- ❌ Data leaves VPS
- ❌ Vendor lock-in
- ❌ Network dependency

**Verdict**: ⚠️ Last resort if VPS can't handle it

**Recommendation**: Option B (Re-enable with limits)

---

## Decision Matrix: Deployment Architecture

### Option A: Current (Mixed PM2 + Docker)
**Pros**:
- ✅ Fast development iteration
- ✅ Easy debugging
- ✅ Low overhead

**Cons**:
- ❌ No resource isolation
- ❌ Complex deployment
- ❌ Hard to scale

**Verdict**: ❌ Not production-ready

### Option B: Full Docker
**Pros**:
- ✅ Resource isolation
- ✅ Consistent deployment
- ✅ Easy scaling
- ✅ Health checks

**Cons**:
- ⚠️ Container overhead (~100MB per container)
- ⚠️ Slower startup

**Verdict**: ✅ Recommended for production

### Option C: Kubernetes
**Pros**:
- ✅ Auto-scaling
- ✅ Self-healing
- ✅ Resource quotas

**Cons**:
- ❌ Complex setup
- ❌ Overkill for single VPS
- ❌ High learning curve

**Verdict**: ❌ Overkill for current scale

### Option D: Serverless
**Pros**:
- ✅ No server management
- ✅ Auto-scaling
- ✅ Pay-per-use

**Cons**:
- ❌ Vendor lock-in
- ❌ Cold starts
- ❌ Costs at scale

**Verdict**: ⚠️ Consider if VPS issues persist

**Recommendation**: Option B (Full Docker)

---

## Success Criteria

### Performance Targets
- [ ] Memory usage < 70% (stable)
- [ ] Load average < 2.0 (for 4+ cores)
- [ ] SSH commands respond < 2s
- [ ] PM2 processes stable (0 restarts/hour)
- [ ] Telegram bot < 10 restarts/day
- [ ] API response time < 500ms p95

### Stability Targets
- [ ] 100% SSH availability
- [ ] 99.9% uptime for services
- [ ] Zero OOM kills
- [ ] Zero forced reboots
- [ ] All services auto-restart on failure

### Monitoring Targets
- [ ] Memory alerts configured (80% threshold)
- [ ] Load alerts configured (> CPU cores)
- [ ] Disk alerts configured (80% threshold)
- [ ] Log rotation enabled
- [ ] Diagnostics automated

---

## Timeline

### Immediate (Today - When SSH Accessible)
1. [ ] Configure swap (2 min)
2. [ ] Check disk space (1 min)
3. [ ] Kill stuck processes (5 min)
4. [ ] Restart PM2 services (2 min)
5. [ ] Gather full diagnostics (5 min)

### Short-Term (This Week)
1. [ ] Set resource limits (30 min)
2. [ ] Install monitoring tools (15 min)
3. [ ] Configure alerts (20 min)
4. [ ] Fix Telegram bot (1 hour)
5. [ ] Decide on Ollama (30 min)

### Medium-Term (Next Sprint)
1. [ ] Unify deployment (Docker vs PM2)
2. [ ] Implement health checks
3. [ ] Load testing
4. [ ] Performance tuning
5. [ ] Documentation updates

---

## Escalation Path

### If SSH Remains Inaccessible
1. **Try VPS Console** (via Contabo dashboard)
   - Access via VNC/IPMI console
   - Run diagnostics directly
   - Restart services if needed

2. **Reboot VPS** (last resort)
   - Via Contabo dashboard
   - Will clear any stuck processes
   - Services should auto-start

3. **Contact Support** (if nothing works)
   - Contabo VPS support
   - Report hardware issues
   - Request diagnostics

### If Performance Doesn't Improve
1. **Hardware Upgrade**
   - More RAM (12GB → 16GB/24GB)
   - Better CPU (if CPU-bound)
   - Faster SSD (if I/O-bound)

2. **Architecture Review**
   - Move to Kubernetes
   - Migrate to serverless
   - Split services across multiple VPS

3. **Disaster Recovery**
   - Restore from backup
   - Deploy to new VPS
   - Implement HA setup

---

## Commands Reference

### Emergency Commands
```bash
# Quick health check
ssh -o ConnectTimeout=3 contabo-vps "free -h && cat /proc/loadavg"

# Kill all PM2 processes
pm2 delete all

# Restart all Docker containers
cd /root/cutting-edge && docker-compose restart

# Reboot VPS (last resort)
# Use Contabo dashboard, not SSH command
```

### Diagnostic Commands
```bash
# Full system report
ssh contabo-vps "/usr/local/bin/vps-diagnose.sh"

# Check logs
pm2 logs --err --lines 100
docker logs cutting-edge-chatbot --tail 50
journalctl -xe -n 50

# Resource usage
docker stats --no-stream
pm2 monit
htop
```

### Maintenance Commands
```bash
# Clean logs
journalctl --vacuum-time=7d
docker system prune -af

# Update system
apt update && apt upgrade -y

# Restart services
pm2 restart all
docker-compose restart
```

---

## Appendix: Emergency Response Script

Save this as `emergency-vps-fix.sh`:

```bash
#!/bin/bash
# Emergency VPS Recovery Script
# Run when SSH is accessible but system is unstable

set -e

echo "=== VPS Emergency Recovery ==="
echo "Starting at $(date)"

# 1. Configure swap
echo "[1/7] Configuring swap..."
ssh contabo-vps << 'EOF'
  if ! swapon --show | grep -q /swapfile; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    sysctl -p
    echo "Swap configured successfully"
  else
    echo "Swap already configured"
  fi
EOF

# 2. Check disk space
echo "[2/7] Checking disk space..."
ssh contabo-vps "df -h"

# 3. Clean up logs
echo "[3/7] Cleaning up logs..."
ssh contabo-vps << 'EOF'
  journalctl --vacuum-time=7d
  docker system prune -f
  echo "Cleanup complete"
EOF

# 4. Restart PM2 services
echo "[4/7] Restarting PM2 services..."
ssh contabo-vps "pm2 restart all || (pm2 delete all && pm2 resurrect)"

# 5. Restart Docker containers
echo "[5/7] Restarting Docker containers..."
ssh contabo-vps "cd /root/cutting-edge && docker-compose restart"

# 6. Run diagnostics
echo "[6/7] Running diagnostics..."
ssh contabo-vps << 'EOF'
  echo "Memory:"
  free -h
  echo "Load:"
  cat /proc/loadavg
  echo "Docker:"
  docker ps --format "table {{.Names}}\t{{.Status}}"
  echo "PM2:"
  pm2 status
EOF

# 7. Verify system
echo "[7/7] Verifying system..."
ssh -o ConnectTimeout=5 contabo-vps "echo 'System accessible' && uptime"

echo "=== Recovery Complete ==="
echo "Finished at $(date)"
echo "Check status: ssh contabo-vps 'free -h && pm2 status'"
```

**Usage**:
```bash
chmod +x emergency-vps-fix.sh
./emergency-vps-fix.sh
```

---

## Summary

### Current State
- Memory: 6.7GB available (61%) ✅
- SSH: Intermittent (timeouts) ❌
- Root Cause: Unknown (not memory) 🔴
- Blocking: All deployment work

### Immediate Actions Required
1. Configure swap (2 min)
2. Investigate timeouts (5 min)
3. Set resource limits (30 min)
4. Fix Telegram bot (1 hour)
5. Install monitoring (15 min)

### Expected Outcomes
- Swap configured: No more OOM deaths
- Resource limits: No single service hog
- Monitoring: Early warning system
- Telegram bot: Stable operation
- System: Reliable SSH access

### Long-Term Vision
- Unified deployment (Docker)
- Resource isolation
- Auto-scaling ready
- Full monitoring stack
- Disaster recovery plan

---

**Status**: 🔴 CRITICAL - Immediate Action Required
**Generated by**: Claude Code (Performance Optimizer)
**Date**: 2026-02-11
**Next Review**: After emergency fixes applied

---

**End of Action Plan**
