# Security Quick Reference - VPS SSH Timeout Fix

**Date**: 2026-02-11
**Purpose**: Immediate actions when SSH access restored
**Status**: Print this for use during emergency access

---

## EMERGENCY COMMANDS (Run First)

```bash
# Copy-paste this entire block immediately upon SSH access
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

### If Ollama Running (Most Likely - 60%)
```bash
pkill -9 ollama
systemctl stop ollama
systemctl disable ollama
systemctl mask ollama
free -h
echo "Ollama killed. Memory freed above."
```

### If Docker Container Leak (25%)
```bash
# Identify container from docker stats output
docker restart <container_name>
```

### If PM2 Process Runaway (10%)
```bash
pm2 restart <process_name>
# OR if critical:
pm2 delete <process_name>
pm2 start <app_name> --name <process_name>
```

---

## CRITICAL FIXES (Implement Within 1 Hour)

### 1. Enable Swap (Safety Valve)
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo "Swap enabled: 4GB"
```

### 2. Install Memory Alert
```bash
cat > /usr/local/bin/check-memory.sh <<'EOF'
#!/bin/bash
MEM_PERCENT=$(free | awk '/Mem/{printf("%.0f"), $3/$2 * 100}')
if [ $MEM_PERCENT -gt 80 ]; then
    echo "CRITICAL: Memory at $MEM_PERCENT%" | logger -t memory-alert
fi
EOF
chmod +x /usr/local/bin/check-memory.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-memory.sh") | crontab -
```

### 3. Install Load Alert
```bash
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
```

### 4. Install Service Health Check
```bash
cat > /usr/local/bin/check-services.sh <<'EOF'
#!/bin/bash
SERVICES="handoff-api telegram-bot cutting-edge_chatbot_1"
for service in $SERVICES; do
    if ! pm2 status | grep -q "$service.*online"; then
        echo "WARNING: $service not running" | logger -t service-alert
        pm2 restart $service
    fi
done
EOF
chmod +x /usr/local/bin/check-services.sh
(crontab -l 2>/dev/null; echo "*/10 * * * * /usr/local/bin/check-services.sh") | crontab -
```

---

## VERIFICATION (After Fix)

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
- `date` command executes in <1s
- `free -h` shows >4GB available
- Load average <3.0
- PM2 services online
- HTTP endpoints return 200

---

## SECURITY HARDENING (This Week)

### SSH Configuration
```bash
# Edit /etc/ssh/sshd_config
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3

systemctl restart sshd
```

### nginx Rate Limiting
```nginx
# Add to /etc/nginx/sites-enabled/all_sites.conf
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
        }
    }
}
```

### nginx Security Headers
```nginx
# Add to server block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
server_tokens off;
```

---

## TELEGRAM-BOT INVESTIGATION

```bash
# Check error logs
pm2 logs telegram-bot --err --lines 200

# Check restart count
pm2 status | grep telegram-bot

# Monitor resources
pm2 monit

# Consider stopping if unstable
pm2 stop telegram-bot
```

---

## CONTACT INFO

**VPS Provider**: Contabo
**Panel**: https://customer.contabo.com
**VPS IP**: 109.199.118.38

**Project Directory**: `/root/NeXXT_WhatsGoingOn`
**Log Directory**: `/root/NeXXT_WhatsGoingOn/logs/`

**Critical Services**:
- handoff-api (port 3000)
- cutting-edge_chatbot_1 (port 3001)
- telegram-bot (PM2 managed)

---

## EXTERNAL MONITORING

**Free Options**:
- UptimeRobot: https://uptimerobot.com
- StatusCake: https://www.statuscake.com
- Pingdom (paid): https://www.pingdom.com

**What to Monitor**:
- https://cuttingedge.cihconsultingllc.com
- https://chat.cuttingedge.cihconsultingllc.com
- SSH port 22 (if supported)

---

## PRO TIP: Prevention

**To prevent recurrence**:

1. Remove Ollama permanently (6.5GB not worth risk)
2. Use external AI API (Together AI ~$1/month)
3. Add swap partition (4GB safety valve)
4. Monitor memory (alert at 80%, auto-kill at 90%)
5. Fix telegram-bot restart loop
6. Setup external monitoring (UptimeRobot)

---

**Print this document for emergency use!**

**Generated**: 2026-02-11
**Purpose**: Immediate reference when SSH access restored
**Full Report**: SECURITY_AUDIT_VPS_TIMEOUT_FIX_20260211.md
