# Backend Deployment Checklist
**VPS Chatbot Integration - Quick Reference**

---

## Pre-Deployment Checklist

### Environment Verification

- [ ] **Local Development Environment**
  ```bash
  cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api
  node --version   # Should be v20+
  npm --version    # Should be v10+
  ```

- [ ] **VPS Access**
  ```bash
  ssh contabo-vps "echo 'Connected to VPS'"
  docker ps        # Verify containers running
  ```

- [ ] **Database Connectivity**
  ```bash
  # Test connection (may need VPN/SSH tunnel)
  docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d postgres -c "SELECT 1;"
  ```

- [ ] **Ollama Service**
  ```bash
  ssh contabo-vps "curl -s http://localhost:11434/api/tags | head -20"
  ```

---

## Phase 1: Database Setup (2-3 hours)

### 1.1 Create Dedicated Database

```bash
# Connect to PostgreSQL
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U postgres -d postgres"

# In psql:
CREATE DATABASE nexxt_db;
GRANT ALL PRIVILEGES ON DATABASE nexxt_db TO jhazy;
\q

# Verify
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\l'"
```

### 1.2 Apply Migration 001: Base Schema

```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api

# Find migration 001 file
ls database/migrations/001*.sql

# Apply migration
cat database/migrations/001*.sql | ssh contabo-vps "docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db"

# Verify tables created
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\dt'"
```

### 1.3 Apply Migration 002: Learning Tables

```bash
cat database/migrations/002_create_learning_tables.sql | \
  ssh contabo-vps "docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db"

# Verify
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\dt learning_queue'"
```

### 1.4 Apply Migration 003: Conversation Storage

```bash
cat database/migrations/003_optimize_conversation_storage.sql | \
  ssh contabo-vps "docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db"

# Verify
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\dt conversations'"
```

### 1.5 Apply Migration 004: Auto Triggers

```bash
cat database/migrations/004_knowledge_auto_triggers_enhanced.sql | \
  ssh contabo-vps "docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db"

# Verify triggers
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c "
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema = 'public';""
```

### 1.6 Apply P1 Security Migrations (with fixes)

**⚠️ NOTE**: These migrations need PostgreSQL 15.4 compatibility fixes

```bash
# Check PostgreSQL version
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c 'SELECT version();'"

# If version is 15.4, apply fixed migrations
# TODO: Create fixed migration files first

# For now, skip P1 migrations and apply later after fixes
```

### 1.7 Verify Schema

```bash
# List all tables
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\dt'"

# List all indexes
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\di'"

# Check table sizes
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c \"
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;\""

# Verify pgvector extension
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c 'SELECT * FROM pg_extension WHERE extname = '\''vector'\'';'"
```

---

## Phase 2: Ollama Proxy Setup (1-2 hours)

### 2.1 Verify Ollama Running on VPS

```bash
# Check Ollama process
ssh contabo-vps "ps aux | grep ollama"

# Test Ollama API
ssh contabo-vps "curl -s http://localhost:11434/api/tags | jq ."

# Check available models
ssh contabo-vps "curl -s http://localhost:11434/api/tags | jq -r '.models[].name'"
```

### 2.2 Ensure Model is Downloaded

```bash
# Pull nomic-embed-text model
ssh contabo-vps "ollama pull nomic-embed-text"

# Verify model
ssh contabo-vps "ollama list"

# Test embedding generation
ssh contabo-vps "curl -s http://localhost:11434/api/embeddings -X POST -d '{
  \"model\": \"nomic-embed-text\",
  \"prompt\": \"test\"
}' | jq '.embedding | length'"
```

### 2.3 Create Nginx Proxy Configuration

```bash
# Create configuration file
ssh contabo-vps "cat > /etc/nginx/sites-available/ai.cihconsultingllc.com.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name ai.cihconsultingllc.com;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ai.cihconsultingllc.com;

    # SSL configuration (use existing certificates)
    ssl_certificate /etc/letsencrypt/live/ai.cihconsultingllc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.cihconsultingllc.com/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Ollama API proxy
    location /api/ {
        # Security header validation
        set \$ollama_allowed 0;
        if (\$http_x_ollama_key = "CE_AGENT_2026_SECRET") {
            set \$ollama_allowed 1;
        }
        if (\$ollama_allowed = 0) {
            return 403;
        }

        # Proxy to Ollama
        proxy_pass http://localhost:11434/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF"

# Enable site
ssh contabo-vps "ln -sf /etc/nginx/sites-available/ai.cihconsultingllc.com.conf /etc/nginx/sites-enabled/"

# Test configuration
ssh contabo-vps "nginx -t"

# Reload Nginx
ssh contabo-vps "systemctl reload nginx"
```

### 2.4 Test Ollama Proxy

```bash
# Test health check
curl https://ai.cihconsultingllc.com/health

# Test API without key (should fail)
curl https://ai.cihconsultingllc.com/api/tags

# Test API with key (should succeed)
curl -H "X-Ollama-Key: CE_AGENT_2026_SECRET" \
  https://ai.cihconsultingllc.com/api/tags

# Test embedding generation
curl -X POST https://ai.cihconsultingllc.com/api/embeddings \
  -H "X-Ollama-Key: CE_AGENT_2026_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "prompt": "test embedding generation"
  }' | jq '.embedding | length'
# Should return: 768
```

---

## Phase 3: Application Deployment (2-3 hours)

### 3.1 Update Environment Variables

```bash
# SSH to VPS
ssh contabo-vps

# Navigate to project
cd /root/NeXXT_WhatsGoingOn/services/handoff-api

# Update .env file
cat > .env << 'EOF'
# Database Connection (PostgreSQL on VPS)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexxt_db
DB_USER=jhazy
DB_PASSWORD=Iverson1975Strong
DB_POOL_MAX=20
DB_POOL_TIMEOUT=2000

# Ollama Embedding Service
OLLAMA_URL=https://ai.cihconsultingllc.com
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_API_KEY=CE_AGENT_2026_SECRET
OLLAMA_TIMEOUT=30000

# Service Config
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGINS=https://cuttingedge.cihconsultingllc.com,https://ai.cihconsultingllc.com

# Performance
EMBEDDING_CACHE_TTL=3600
QUERY_TIMEOUT=5000
BATCH_SIZE=100
EOF

# Verify .env file
cat .env
```

### 3.2 Deploy Code to VPS

```bash
# From local machine
cd /Users/jhazy/AI_Projects/Cutting\ Edge

# Sync handoff-api to VPS
rsync -avz --delete \
  services/handoff-api/ \
  contabo-vps:/root/NeXXT_WhatsGoingOn/services/handoff-api/ \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  --exclude '*.log'

# SSH to VPS
ssh contabo-vps

# Navigate to project
cd /root/NeXXT_WhatsGoingOn/services/handoff-api

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### 3.3 Create PM2 Configuration

```bash
# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'handoff-api',
    script: './dist/index.js',
    cwd: '/root/NeXXT_WhatsGoingOn/services/handoff-api',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/handoff-api-error.log',
    out_file: '/var/log/pm2/handoff-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown root:root /var/log/pm2

# Test configuration
pm2 start ecosystem.config.js --no-daemon

# If successful, stop and restart in daemon mode
pm2 delete handoff-api
pm2 start ecosystem.config.js
pm2 save
```

### 3.4 Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration for handoff-api
ssh contabo-vps "cat > /etc/nginx/sites-available/handoff-api.conf << 'EOF'
# Upstream configuration
upstream handoff_api {
    least_conn;
    server localhost:3000;
    keepalive 32;
}

# Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name cuttingedge.cihconsultingllc.com;

    location /api/handoff {
        return 301 https://\$server_name\$request_uri;
    }
}

# Main API endpoint
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cuttingedge.cihconsultingllc.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/cuttingedge.cihconsultingllc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cuttingedge.cihconsultingllc.com/privkey.pem;

    # Handoff API routes
    location /api/handoff {
        proxy_pass http://handoff_api/api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check
    location /api/handoff/health {
        proxy_pass http://handoff_api/api/health;
        access_log off;
    }
}
EOF"

# Enable site
ssh contabo-vps "ln -sf /etc/nginx/sites-available/handoff-api.conf /etc/nginx/sites-enabled/"

# Test configuration
ssh contabo-vps "nginx -t"

# Reload Nginx
ssh contabo-vps "systemctl reload nginx"
```

### 3.5 Verify Service

```bash
# Check PM2 status
ssh contabo-vps "pm2 status"

# Check logs
ssh contabo-vps "pm2 logs handoff-api --lines 50 --nostream"

# Test health endpoint
curl https://cuttingedge.cihconsultingllc.com/api/handoff/health

# Test knowledge search
curl -X POST https://cuttingedge.cihconsultingllc.com/api/handoff/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "haircut prices",
    "shopId": 1,
    "limit": 5
  }'

# Check database connections
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c \"
SELECT count(*) FROM pg_stat_activity WHERE datname = 'nexxt_db';\""
```

---

## Phase 4: Testing & Verification (2-3 hours)

### 4.1 Run Health Checks

```bash
# API health check
curl https://cuttingedge.cihconsultingllc.com/api/handoff/health | jq '.'

# Expected output:
# {
#   "status": "ok",
#   "service": "cutting-edge-handoff-api",
#   "version": "1.0.0",
#   "timestamp": "2026-02-10T..."
# }
```

### 4.2 Test Knowledge Search

```bash
# Basic search
curl -X POST https://cuttingedge.cihconsultingllc.com/api/handoff/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "haircut prices",
    "shopId": 1,
    "limit": 5
  }' | jq '.'

# Search with category filter
curl -X POST https://cuttingedge.cihconsultingllc.com/api/handoff/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "hours of operation",
    "shopId": 1,
    "category": "general",
    "limit": 3
  }' | jq '.'
```

### 4.3 Test Conversation Storage

```bash
# Store conversation
curl -X POST https://cuttingedge.cihconsultingllc.com/api/handoff/conversations/store \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "shopId": 1,
    "channel": "web",
    "messages": [
      {
        "role": "user",
        "content": "What are your hours?"
      },
      {
        "role": "assistant",
        "content": "We are open 9 AM to 7 PM."
      }
    ]
  }' | jq '.'

# Get user conversations
curl "https://cuttingedge.cihconsultingllc.com/api/handoff/conversations/user/test-user-123?shopId=1&limit=10" | jq '.'
```

### 4.4 Test Feedback API

```bash
# Submit feedback
curl -X POST https://cuttingedge.cihconsultingllc.com/api/handoff/feedback/rating \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-uuid",
    "feedbackType": "thumbs_up",
    "reason": "Very helpful"
  }' | jq '.'

# Get pending corrections
curl "https://cuttingedge.cihconsultingllc.com/api/handoff/feedback/pending?shopId=1&limit=20" | jq '.'
```

### 4.5 Run Test Suite

```bash
# SSH to VPS
ssh contabo-vps

# Navigate to project
cd /root/NeXXT_WhatsGoingOn/services/handoff-api

# Run all tests
npm test

# Run security tests
npm test tests/security/

# Run performance benchmarks
npm run benchmark:storage

# View coverage
npm run test:coverage
```

### 4.6 Performance Testing

```bash
# Run conversation storage benchmark
cd /root/NeXXT_WhatsGoingOn/services/handoff-api
npm run benchmark:storage

# Expected results:
# - Single insert: < 10ms
# - Batch insert (100): < 100ms
# - User lookup: < 5ms
# - Vector search: < 50ms

# Run RAG benchmark
npm run benchmark

# Monitor PM2 performance
pm2 monit
```

---

## Phase 5: Monitoring Setup (1 hour)

### 5.1 Configure PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Verify configuration
pm2 list
pm2 logs handoff-api --lines 100
```

### 5.2 Set Up Database Backups

```bash
# Create backup script
ssh contabo-vps "cat > /root/scripts/backup_nexxt_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\${BACKUP_DIR}/nexxt_db_\${DATE}.sql"

# Create backup directory
mkdir -p \${BACKUP_DIR}

# Dump database
docker exec nexxt_whatsgoingon-postgres-1 \
  pg_dump -U jhazy nexxt_db > \${BACKUP_FILE}

# Compress backup
gzip \${BACKUP_FILE}

# Remove backups older than 7 days
find \${BACKUP_DIR} -name "nexxt_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: \${BACKUP_FILE}.gz"
EOF

chmod +x /root/scripts/backup_nexxt_db.sh"

# Add to crontab (daily at 2 AM)
ssh contabo-vps "(crontab -l 2>/dev/null; echo '0 2 * * * /root/scripts/backup_nexxt_db.sh >> /var/log/db-backup.log 2>&1') | crontab -"

# Test backup script
ssh contabo-vps "/root/scripts/backup_nexxt_db.sh"

# Verify backup
ssh contabo-vps "ls -lh /backups/postgresql/"
```

### 5.3 Set Up Log Monitoring

```bash
# Create log aggregation script
ssh contabo-vps "cat > /root/scripts/check_logs.sh << 'EOF'
#!/bin/bash
# Check PM2 logs for errors
ERRORS=\$(pm2 logs handoff-api --nostream --lines 1000 | grep -i error | wc -l)

if [ \$ERRORS -gt 10 ]; then
  echo "WARNING: Found \$ERRORS errors in logs"
  # Send alert (configure email/Slack webhook here)
fi

# Check disk space
DISK_USAGE=\$(df -h / | awk 'NR==2 {print \$5}' | sed 's/%//')

if [ \$DISK_USAGE -gt 80 ]; then
  echo "WARNING: Disk usage is at \$DISK_USAGE%"
  # Send alert
fi
EOF

chmod +x /root/scripts/check_logs.sh"

# Add to crontab (every hour)
ssh contabo-vps "(crontab -l 2>/dev/null; echo '0 * * * * /root/scripts/check_logs.sh >> /var/log/log-check.log 2>&1') | crontab -"
```

---

## Rollback Procedures

### Rollback Database Migration

```bash
# List applied migrations
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c '\dt'"

# If migration 003 needs rollback
cat services/handoff-api/database/migrations/003_rollback.sql | \
  ssh contabo-vps "docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db"

# If migration 002 needs rollback
cat services/handoff-api/database/migrations/002_rollback.sql | \
  ssh contabo-vps "docker exec -i nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db"
```

### Rollback Application Deployment

```bash
# Stop PM2 service
ssh contabo-vps "pm2 stop handoff-api"

# Restore previous version
ssh contabo-vps "cd /root/NeXXT_WhatsGoingOn && git checkout HEAD~1 services/handoff-api"

# Rebuild and restart
ssh contabo-vps "cd /root/NeXXT_WhatsGoingOn/services/handoff-api && npm run build && pm2 restart handoff-api"

# Verify
curl https://cuttingedge.cihconsultingllc.com/api/handoff/health
```

---

## Troubleshooting

### Issue: Service Won't Start

```bash
# Check PM2 logs
ssh contabo-vps "pm2 logs handoff-api --lines 100"

# Check if port is in use
ssh contabo-vps "netstat -tlnp | grep 3000"

# Check environment variables
ssh contabo-vps "cd /root/NeXXT_WhatsGoingOn/services/handoff-api && cat .env"

# Test database connection
ssh contabo-vps "docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db -c 'SELECT 1;'"
```

### Issue: 502 Bad Gateway

```bash
# Check if PM2 service is running
ssh contabo-vps "pm2 status"

# Check Nginx configuration
ssh contabo-vps "nginx -t"

# Check Nginx error logs
ssh contabo-vps "tail -100 /var/log/nginx/error.log"

# Restart Nginx
ssh contabo-vps "systemctl restart nginx"
```

### Issue: Ollama Proxy Returns 403

```bash
# Test without security header
curl https://ai.cihconsultingllc.com/api/tags

# Test with security header
curl -H "X-Ollama-Key: CE_AGENT_2026_SECRET" https://ai.cihconsultingllc.com/api/tags

# Check Nginx configuration
ssh contabo-vps "cat /etc/nginx/sites-available/ai.cihconsultingllc.com.conf"

# Test Ollama directly
ssh contabo-vps "curl http://localhost:11434/api/tags"
```

---

## Completion Checklist

- [ ] All database migrations applied successfully
- [ ] Ollama proxy working with security header
- [ ] handoff-api deployed and running on PM2
- [ ] Nginx reverse proxy configured
- [ ] Health check endpoint responding
- [ ] Knowledge search API tested
- [ ] Conversation storage tested
- [ ] Feedback API tested
- [ ] Test suite passing (all 154+ tests)
- [ ] Performance benchmarks meeting targets
- [ ] Database backups configured
- [ ] Log monitoring configured
- [ ] Rollback procedures documented
- [ ] Production documentation updated

---

**Last Updated**: 2026-02-10
**Status**: Ready for Deployment
**Estimated Time**: 7-13 hours total
