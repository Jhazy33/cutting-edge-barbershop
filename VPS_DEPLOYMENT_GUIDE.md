# VPS Chatbot Deployment - Quick Guide

## Current Status

✅ **Files Created Locally:**
- `services/chatbot/Dockerfile`
- `docker-compose.chatbot.yml`
- `nginx-chatbot.conf`
- `scripts/deploy-chatbot-vps.sh`
- `scripts/rollback-chatbot-vps.sh`

✅ **Git Status:**
- Committed to main (commit: 5cc77e87)
- Merged to dev branch
- Pushed to origin/dev

✅ **VPS Status:**
- VPS accessible: ssh contabo-vps
- Git repo location: `/root/cutting-edge/cutting-edge-main-site/`
- Current branch: main
- Existing chatbot container: running (port 3001 internal)

---

## Deployment Steps (Manual)

### 1. SSH to VPS
```bash
ssh contabo-vps
```

### 2. Navigate to Git Repository
```bash
cd /root/cutting-edge/cutting-edge-main-site
```

### 3. Check Current State
```bash
git status
git branch
git log --oneline -3
```

### 4. Pull Latest Changes from Dev
```bash
# Fetch all branches
git fetch origin

# Checkout dev branch
git checkout dev

# Pull latest changes
git pull origin dev
```

### 5. Verify New Files
```bash
ls -la services/chatbot/Dockerfile
ls -la docker-compose.chatbot.yml
ls -la nginx-chatbot.conf
```

### 6. Build Chatbot Image
```bash
docker-compose -f docker-compose.chatbot.yml build
```

### 7. Stop Old Container (if exists)
```bash
# Check what's running
docker ps | grep chatbot

# Stop old container if it exists
docker stop cutting-edge_chatbot 2>/dev/null || true
docker rm cutting-edge_chatbot 2>/dev/null || true
```

### 8. Start New Container
```bash
docker-compose -f docker-compose.chatbot.yml up -d
```

### 9. Verify Container is Running
```bash
docker ps | grep cutting-edge-chatbot
docker logs cutting-edge-chatbot
```

### 10. Test Locally
```bash
curl -I http://localhost:3001
```

### 11. Configure Nginx
```bash
# Copy nginx config
sudo cp nginx-chatbot.conf /etc/nginx/sites-available/chat-cutting-edge

# Create symlink
sudo ln -sf /etc/nginx/sites-available/chat-cutting-edge /etc/nginx/sites-enabled/chat-cutting-edge

# Test nginx
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 12. Setup SSL Certificate
```bash
sudo certbot --nginx -d chat.cuttingedge.cihconsultingllc.com \
  --non-interactive \
  --agree-tos \
  --email admin@cihconsultingllc.com
```

### 13. Verify Deployment
```bash
# Check container
docker ps | grep cutting-edge-chatbot

# Check nginx
sudo systemctl status nginx

# Check SSL
sudo certbot certificates | grep chat.cuttingedge

# Test external access
curl -I https://chat.cuttingedge.cihconsultingllc.com
```

---

## Rollback (if needed)

```bash
cd /root/cutting-edge/cutting-edge-main-site

# Stop new container
docker-compose -f docker-compose.chatbot.yml down

# Remove nginx config
sudo rm /etc/nginx/sites-enabled/chat-cutting-edge
sudo rm /etc/nginx/sites-available/chat-cutting-edge

# Reload nginx
sudo systemctl reload nginx

# Checkout main branch
git checkout main
```

---

## Files Location on VPS

- **Git Repository**: `/root/cutting-edge/cutting-edge-main-site/`
- **Dockerfile**: `/root/cutting-edge/cutting-edge-main-site/services/chatbot/Dockerfile`
- **Docker Compose**: `/root/cutting-edge/cutting-edge-main-site/docker-compose.chatbot.yml`
- **Nginx Config**: `/root/cutting-edge/cutting-edge-main-site/nginx-chatbot.conf`

---

## Expected URLs

- **Local (VPS)**: http://localhost:3001
- **External**: https://chat.cuttingedge.cihconsultingllc.com

---

## Troubleshooting

### Container won't start
```bash
docker logs cutting-edge-chatbot
docker-compose -f docker-compose.chatbot.yml build --no-cache
docker-compose -f docker-compose.chatbot.yml up -d
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Port conflicts
```bash
sudo lsof -i :3001
```

---

## Next Steps After Deployment

1. Open browser to https://chat.cuttingedge.cihconsultingllc.com
2. Verify chat interface loads
3. Test sending messages
4. Check API connectivity (browser console)
5. Monitor logs for first 24 hours

---

**Generated with Claude Code**
