# Chatbot VPS Deployment Manual

**Date**: 2026-02-10
**Deployment Target**: VPS (109.199.118.38)
**Deployment URL**: https://chat.cuttingedge.cihconsultingllc.com
**Branch**: dev

---

## Prerequisites

### 1. Local Files Created
- ✅ `services/chatbot/Dockerfile` - Multi-stage build configuration
- ✅ `docker-compose.chatbot.yml` - Container orchestration
- ✅ `nginx-chatbot.conf` - Nginx reverse proxy config
- ✅ `scripts/deploy-chatbot-vps.sh` - Automated deployment script
- ✅ `scripts/rollback-chatbot-vps.sh` - Rollback procedures

### 2. Git Status
- ✅ Committed to main branch (commit: 5cc77e87)
- ✅ Merged to dev branch
- ✅ Pushed to origin/dev

---

## Deployment Steps

### Step 1: SSH to VPS
```bash
ssh contabo-vps
# or
ssh root@109.199.118.38
```

### Step 2: Navigate to Project
```bash
cd /root/cutting-edge
```

### Step 3: Verify Current State
```bash
# Check git branch
git branch --show-current

# Check running containers
docker ps

# Check PM2 status
pm2 status
```

### Step 4: Pull Latest Changes
```bash
# Switch to dev branch if not already
git checkout dev

# Pull latest changes
git pull origin dev
```

### Step 5: Verify Docker Network
```bash
docker network ls | grep cutting-edge-network

# Create if doesn't exist
docker network create cutting-edge-network
```

### Step 6: Build and Start Container
```bash
# Build the chatbot image
docker-compose -f docker-compose.chatbot.yml build

# Start the container
docker-compose -f docker-compose.chatbot.yml up -d

# Verify it's running
docker ps | grep cutting-edge-chatbot
```

### Step 7: Configure Nginx
```bash
# Copy nginx config
sudo cp nginx-chatbot.conf /etc/nginx/sites-available/chat-cutting-edge

# Create symlink
sudo ln -s /etc/nginx/sites-available/chat-cutting-edge /etc/nginx/sites-enabled/chat-cutting-edge

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 8: Request SSL Certificate
```bash
sudo certbot --nginx -d chat.cuttingedge.cihconsultingllc.com \
  --non-interactive \
  --agree-tos \
  --email admin@cihconsultingllc.com
```

### Step 9: Verify Deployment
```bash
# Check container status
docker ps | grep cutting-edge-chatbot

# Check nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates | grep chat.cuttingedge.cihconsultingllc.com

# Test locally
curl -I http://localhost:3001
```

### Step 10: External Testing
Open in browser: https://chat.cuttingedge.cihconsultingllc.com

---

## Automated Deployment

You can also run the automated script:
```bash
cd /root/cutting-edge
bash scripts/deploy-chatbot-vps.sh
```

The script will:
1. Switch to dev branch
2. Pull latest changes
3. Create Docker network if needed
4. Build and start container
5. Configure Nginx
6. Request SSL certificate
7. Verify deployment

---

## Rollback Procedures

If anything goes wrong:

### Option 1: Use Rollback Script
```bash
cd /root/cutting-edge
bash scripts/rollback-chatbot-vps.sh
```

### Option 2: Manual Rollback
```bash
# Stop and remove container
cd /root/cutting-edge
docker-compose -f docker-compose.chatbot.yml down

# Remove Nginx config
sudo rm /etc/nginx/sites-enabled/chat-cutting-edge
sudo rm /etc/nginx/sites-available/chat-cutting-edge

# Reload Nginx
sudo systemctl reload nginx

# Switch back to main (optional)
git checkout main
```

---

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs cutting-edge-chatbot

# Rebuild
docker-compose -f docker-compose.chatbot.yml build --no-cache
docker-compose -f docker-compose.chatbot.yml up -d
```

### Nginx Configuration Errors
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Re-request certificate
sudo certbot --nginx -d chat.cuttingedge.cihconsultingllc.com --force-renewal
```

### Port 3001 Already in Use
```bash
# Check what's using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>
```

---

## Configuration Files

### Environment Variables (.env)
```bash
VITE_API_URL=https://api.cihconsultingllc.com
VITE_OLLAMA_API=https://ai.cihconsultingllc.com
```

### Docker Ports
- Container port: 80
- Host port: 3001
- External URL: https://chat.cuttingedge.cihconsultingllc.com

### Nginx Configuration
- Proxy pass: http://127.0.0.1:3001
- SSL: Let's Encrypt
- CORS headers enabled

---

## Verification Checklist

After deployment, verify:

- [ ] Container is running (`docker ps`)
- [ ] Port 3001 is accessible (`curl -I http://localhost:3001`)
- [ ] Nginx configuration is valid (`nginx -t`)
- [ ] SSL certificate is installed (`certbot certificates`)
- [ ] External URL is accessible (browser test)
- [ ] Chat interface loads correctly
- [ ] API calls work (check browser console)

---

## Monitoring

### View Container Logs
```bash
docker logs cutting-edge-chatbot
docker logs -f cutting-edge-chatbot  # Follow logs
```

### Restart Container
```bash
docker-compose -f /root/cutting-edge/docker-compose.chatbot.yml restart
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Success Criteria

Deployment is successful when:
1. Chatbot container is running on port 3001
2. Nginx reverse proxy is configured
3. SSL certificate is valid
4. https://chat.cuttingedge.cihconsultingllc.com is accessible
5. Chat interface loads and functions correctly

---

## Next Steps

After successful deployment:
1. Monitor logs for first 24 hours
2. Test all chat features
3. Verify API connectivity to handoff-api
4. Set up automated backups if needed
5. Configure monitoring/alerting

---

**Generated with Claude Code**
https://claude.com/claude-code
