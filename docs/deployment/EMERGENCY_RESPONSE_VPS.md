# EMERGENCY RESPONSE GUIDE - VPS Unresponsive

**Status**: 🔴 CRITICAL
**Last Updated**: 2026-02-11
**VPS**: 109.199.118.38 (Contabo)
**Issue**: SSH timeouts (10-15s), all commands failing

---

## QUICK DECISION TREE

```
Can you SSH in?
├─ NO → Use Contabo VNC Console
│  ├─ System frozen? → Hard reboot via panel
│  └─ System responsive? → Run diagnostic commands
│
└─ YES → Run diagnostics immediately
   ├─ Ollama running? → Kill it + disable permanently
   ├─ New memory leak? → Kill process + restart service
   └─ Load >3.0? → Check top consumers + kill if needed
```

---

## EMERGENCY COMMANDS (Run Immediately Upon SSH Access)

**Copy-paste this entire block**:

```bash
{
echo "=== MEMORY STATUS ==="
free -h
echo ""
echo "=== LOAD AVERAGE ==="
cat /proc/loadavg
echo ""
echo "=== TOP 10 MEMORY CONSUMERS ==="
ps aux --sort=-%mem | head -11
echo ""
echo "=== DOCKER STATS ==="
docker stats --no-stream
echo ""
echo "=== PM2 STATUS ==="
pm2 status
echo ""
echo "=== OLLAMA STATUS ==="
systemctl status ollama --no-pager 2>&1 | head -5
ps aux | grep ollama | grep -v grep | head -5
echo ""
echo "=== SSH TEST ==="
date
uptime
} 2>&1 | tee /tmp/emergency-diagnostic-$(date +%Y%m%d_%H%M%S).log
```

---

## SCENARIO-BASED FIXES

### Scenario 1: Ollama Running (Most Likely - 60%)
**If output shows**: `ps aux | grep ollama` returns processes

```bash
# Execute immediately
pkill -9 ollama
systemctl stop ollama
systemctl disable ollama
systemctl mask ollama
free -h
echo "Ollama killed. Memory freed above."
```

**Verify**: `free -h` should show >4GB available

---

### Scenario 2: Docker Container Leak (25%)
**If output shows**: Docker container using >2GB memory

```bash
# Identify container from docker stats output
docker restart <container_name>
# OR
docker-compose -f /root/NeXXT_WhatsGoingOn/docker-compose.yml restart <service>
```

**Verify**: `docker stats --no-stream` shows normal memory

---

### Scenario 3: PM2 Process Runaway (10%)
**If output shows**: PM2 process using >2GB memory

```bash
# Identify process from pm2 status
pm2 restart <process_name>
# OR if critical:
pm2 delete <process_name>
pm2 start <app_name> --name <process_name>
```

**Verify**: `pm2 status` shows "online" status

---

### Scenario 4: Load Average High (5%)
**If output shows**: Load >5.0 in `cat /proc/loadavg`

```bash
# Find CPU hogs
ps aux --sort=-%cpu | head -10

# Kill if necessary
kill -15 <PID>  # Graceful first
# OR
kill -9 <PID>   # Force if needed
```

**Verify**: `cat /proc/loadavg` shows decreasing trend

---

## IF SSH COMPLETELY UNRESPONSIVE

### Method 1: Contabo Customer Panel
1. Login to https://customer.contabo.com
2. Navigate to VPS section
3. Find VPS: 109.199.118.38
4. Click "VNC Console" or "Launch Console"
5. Login with root credentials
6. Run emergency diagnostic commands

### Method 2: Hard Reboot (Last Resort)
1. In Contabo panel
2. Click "Restart" or "Reboot"
3. Wait 2-3 minutes for boot
4. Use VNC Console to monitor boot
5. Login and run diagnostics

### Method 3: Rescue Mode (If Corrupted)
1. In Contabo panel
2. Enable "Rescue Mode"
3. Reboot into rescue system
4. Mount disk
5. Check logs: `/var/log/syslog`, `/var/log/auth.log`

---

## VERIFICATION CHECKLIST

After applying fix, verify:

```bash
# Test SSH responsiveness
date && uptime && echo "SSH Working"

# Check memory
free -h | grep "available" && echo "Memory OK"

# Check load
cat /proc/loadavg | awk '{if ($1 < 3.0) print "Load OK"; else print "Load HIGH"}'

# Test services
pm2 status | grep -E "handoff-api|telegram-bot" | grep online

# Test HTTP
curl -I http://localhost:3000 2>&1 | head -1
curl -I http://localhost:3001 2>&1 | head -1

echo "=== ALL CHECKS COMPLETE ==="
```

**Success Criteria**:
- ✅ `date` command executes in <1s
- ✅ `free -h` shows >4GB available
- ✅ Load average <3.0
- ✅ PM2 services online
- ✅ HTTP endpoints return 200

---

## PERMANENT FIX IMPLEMENTATION

### After Emergency Resolved (Do This Within 1 Hour)

#### 1. Ollama Decision
```bash
# OPTION A: Remove Permanently (RECOMMENDED)
systemctl mask ollama
apt remove ollama -y
echo "Ollama removed permanently"

# OPTION B: Re-enable with Limits
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
MemoryLimit=4G
CPUQuota=50%
TasksMax=100
EOF
```

#### 2. Enable Swap (Safety Valve)
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo "Swap enabled: 4GB"
```

#### 3. Install Monitoring Alerts
```bash
# Memory alert (80% threshold)
cat > /usr/local/bin/check-memory.sh <<'EOF'
#!/bin/bash
MEM_PERCENT=$(free | awk '/Mem/{printf("%.0f"), $3/$2 * 100}')
if [ $MEM_PERCENT -gt 80 ]; then
    echo "CRITICAL: Memory at $MEM_PERCENT%" | logger -t memory-alert
fi
EOF
chmod +x /usr/local/bin/check-memory.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-memory.sh") | crontab -

# Load alert (300% threshold)
cat > /usr/local/bin/check-load.sh <<'EOF'
#!/bin/bash
LOAD1=$(awk '{print $1}' /proc/loadavg)
CPUS=$(nproc)
LOAD_PERCENT=$(echo "$LOAD1 / $CPUS * 100" | bc -l | awk '{printf("%.0f"), $1}')
if [ $LOAD_PERCENT -gt 300 ]; then
    echo "CRITICAL: Load average $LOAD1 ($LOAD_PERCENT%)" | logger -t load-alert
fi
EOF
chmod +x /usr/local/bin/check-load.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-load.sh") | crontab -

echo "Monitoring installed"
```

#### 4. Investigate Telegram-Bot (235 Restarts)
```bash
# Check logs
pm2 logs telegram-bot --err --lines 100

# Consider stopping if unstable
pm2 stop telegram-bot

# Fix underlying issue (requires code review)
```

---

## POST-INCIDENT REPORT (Fill This Out)

**Date/Time**: ___________________

**Root Cause**:
[ ] Ollama memory exhaustion
[ ] Docker container leak
[ ] PM2 process runaway
[ ] Other: __________________

**Actions Taken**:
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

**Fix Applied**:
- [ ] Ollama disabled permanently
- [ ] Service restarted
- [ ] Process killed
- [ ] Other: __________________

**Verification**:
- [ ] Memory: _____ GB available
- [ ] Load: _____ (1-min average)
- [ ] SSH: Working / Not working
- [ ] Services: All online / Some down

**Monitoring Status**:
- [ ] Memory alerts installed
- [ ] Load alerts installed
- [ ] Swap configured
- [ ] Telegram-bot investigated

**Follow-up Required**:
1. _________________________________________________
2. _________________________________________________

---

## CONTACT INFO

**VPS Provider**: Contabo
**Panel**: https://customer.contabo.com
**VPS IP**: 109.199.118.38
**SSH Host**: contabo-vps (local alias)

**Project Directory**: `/root/NeXXT_WhatsGoingOn`
**Log Directory**: `/root/NeXXT_WhatsGoingOn/logs/`

**Critical Services**:
- handoff-api (port 3000)
- cutting-edge_chatbot_1 (port 3001)
- telegram-bot (PM2 managed)

---

## PRO TIP: Prevention

**To prevent recurrence**:

1. **Remove Ollama** - Not worth 6.5GB memory risk
2. **Use External AI API** - Together AI Llama (~$1/month)
3. **Add Swap** - 4GB safety valve prevents OOM
4. **Monitor Memory** - Alert at 80%, auto-kill at 90%
5. **Fix Telegram-Bot** - 235 restarts = chronic issue

**Alternative AI Options**:
- Together AI: https://together.ai (Llama models, ~$0.0001/1K tokens)
- OpenAI: https://openai.com (GPT-3.5, ~$0.002/1K tokens)
- Anthropic: https://anthropic.com (Claude, ~$0.003/1K tokens)

**Cost Comparison** (30K chats/month):
- Ollama: $0 (6.5GB memory risk)
- Together AI: ~$0.90/month
- OpenAI GPT-3.5: ~$18/month
- Anthropic Claude: ~$27/month

---

## LAST RESORT: VPS Upgrade

If consistently >80% memory usage:

**Current**: Contabo VPS S (likely 12GB RAM)
**Upgrade to**: Contabo VPS M (16GB RAM) or XL (32GB RAM)

**Cost Difference**: ~$5-15/month

**Benefits**:
- Headroom for Ollama (if kept)
- More containers/services
- Better performance under load
- Lower crash risk

---

**Remember**: This guide is for EMERGENCY use. For comprehensive analysis, see `VPS_UNRESPONSIVE_ORCHESTRATION_REPORT.md`.

**Generated**: 2026-02-11
**Status**: 🔴 CRITICAL - Awaiting SSH access
**Priority**: URGENT - Execute immediately upon SSH access
