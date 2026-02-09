# Phase 3: Production Deployment Plan

**Project**: Cutting Edge - AI-Powered Barbershop Assistant
**Phase**: 3 - Production Deployment
**Status**: 🔄 Planning
**Target Start**: 2026-02-10
**Estimated Duration**: 2-3 weeks

---

## Executive Summary

Phase 3 focuses on deploying the Cutting Edge RAG system to a production environment. This includes infrastructure setup, environment configuration, staging deployment, testing, and final production rollout.

### Objectives:
1. **Deploy RAG system** to production-ready infrastructure
2. **Achieve 99.9% uptime** with proper monitoring
3. **Maintain <2s response time** (P95)
4. **Ensure scalability** for growing user base
5. **Implement observability** for proactive monitoring

---

## Prerequisites

### Completed (Phase 2):
- [x] RAG system developed and tested locally
- [x] Performance optimizations implemented
- [x] Benchmark suite created
- [x] Documentation complete
- [x] Deployment checklist prepared

### Required for Phase 3:
- [ ] Production server access (VPS or cloud)
- [ ] Domain name configured
- [ ] SSL certificates ready
- [ ] Database backup strategy
- [ ] Monitoring tools selected

---

## Infrastructure Plan

### Option A: VPS Deployment (Recommended for Cost)

**Provider**: Contabo VPS (already owned)
**IP**: 109.199.118.38
**Cost**: ~$6-15/month

#### Server Specifications:
- **CPU**: 4+ cores
- **RAM**: 8GB+ (recommended 16GB for Ollama)
- **Storage**: 200GB+ SSD
- **OS**: Ubuntu 22.04 LTS

#### Software Stack:
```
┌─────────────────────────────────────┐
│         Nginx (Reverse Proxy)       │
│         Port 80/443                 │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐  ┌────▼────────┐
│ PM2: API    │  │ PM2: Bot    │
│ Port 3000   │  │ Port 3001   │
└──────┬──────┘  └────┬────────┘
       │               │
       └───────┬───────┘
               │
       ┌───────▼───────────────────┐
       │ PostgreSQL + pgvector      │
       │ Port 5432                  │
       └───────────────────────────┘

       ┌───────┐
       │ Ollama│
       │ :11434│
       └───────┘
```

### Option B: Cloud Deployment (Alternative)

**Providers**: AWS, GCP, Azure, DigitalOcean

#### Architecture:
- **Load Balancer**: Cloud LB or nginx
- **Application Servers**: 2+ instances (auto-scaling)
- **Database**: Managed PostgreSQL (RDS, Cloud SQL)
- **Cache**: Redis (ElastiCache, Memorystore)
- **CDN**: CloudFront, Cloud CDN

**Estimated Cost**: $50-200/month

---

## Implementation Steps

### Week 1: Infrastructure Setup

#### Day 1-2: Server Preparation
```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y nginx nodejs postgresql redis-server

# 3. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 4. Pull models
ollama pull llama2
ollama pull nomic-embed-text

# 5. Configure firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

#### Day 3-4: Database Setup
```bash
# 1. Configure PostgreSQL
sudo -u postgres psql

# 2. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# 3. Create database
CREATE DATABASE cutting_edge;

# 4. Create user
CREATE USER cutting_edge_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE cutting_edge TO cutting_edge_user;

# 5. Create tables
\i /path/to/schema.sql

# 6. Configure pg_hba.conf for remote access
# 7. Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Day 5: Application Deployment
```bash
# 1. Clone repository
git clone <repo-url> /var/www/cutting-edge

# 2. Install dependencies
cd /var/www/cutting-edge/services/handoff-api
npm install --production

cd /var/www/cutting-edge/services/chatbot
npm install --production

# 3. Build applications
npm run build

# 4. Configure PM2
pm2 start dist/index.js --name handoff-api --cwd /var/www/cutting-edge/services/handoff-api
pm2 start /var/www/cutting-edge/services/chatbot --name chatbot -- --port 3001

# 5. Save PM2 config
pm2 save
pm2 startup
```

#### Day 6-7: Nginx Configuration
```nginx
# /etc/nginx/sites-available/cutting-edge-api
server {
    listen 80;
    server_name api.cuttingedge.cihconsultingllc.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# /etc/nginx/sites-available/cutting-edge-chatbot
server {
    listen 80;
    server_name chat.cuttingedge.cihconsultingllc.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/cutting-edge-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cutting-edge-chatbot /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Week 2: SSL & Environment Configuration

#### Day 8-9: SSL Certificates
```bash
# 1. Install Certbot
sudo apt install certbot python3-certbot-nginx

# 2. Obtain certificates
sudo certbot --nginx -d api.cuttingedge.cihconsultingllc.com
sudo certbot --nginx -d chat.cuttingedge.cihconsultingllc.com

# 3. Test auto-renewal
sudo certbot renew --dry-run

# 4. Verify HTTPS
curl https://api.cuttingedge.cihconsultingllc.com/api/health
```

#### Day 10-11: Environment Variables
```bash
# /var/www/cutting-edge/services/handoff-api/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cutting_edge
DB_USER=cutting_edge_user
DB_PASSWORD=secure_password
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://chat.cuttingedge.cihconsultingllc.com,https://cuttingedge.cihconsultingllc.com

# /var/www/cutting-edge/services/chatbot/.env
VITE_API_URL=https://api.cuttingedge.cihconsultingllc.com
VITE_OLLAMA_API=https://api.cuttingedge.cihconsultingllc.com
```

#### Day 12: Monitoring Setup
```bash
# 1. Install monitoring tools
sudo apt install htop iotop

# 2. Set up log rotation
sudo vim /etc/logrotate.d/cutting-edge

# 3. Configure error tracking (Sentry)
# Add to application code

# 4. Set up uptime monitoring
# Use UptimeRobot, Pingdom, or similar
```

### Week 3: Testing & Launch

#### Day 13-14: Staging Testing
```bash
# 1. Deploy to staging
# Use same process as production but on staging domain

# 2. Run tests
cd /var/www/cutting-edge/services/handoff-api
npm run benchmark

# 3. Load testing
# Use Apache Bench, Locust, or k6
ab -n 1000 -c 10 https://staging-api.cuttingedge.com/api/health

# 4. Test RAG functionality
curl -X POST https://staging-api.cuttingedge.com/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "haircut prices", "shopId": 1, "limit": 3}'
```

#### Day 15: Production Launch
```bash
# 1. Final checks
- [ ] All tests pass
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan ready

# 2. Deploy to production
git pull origin main
npm install --production
npm run build
pm2 restart all

# 3. Verify deployment
curl https://api.cuttingedge.cihconsultingllc.com/api/health
curl https://chat.cuttingedge.cihconsultingllc.com

# 4. Monitor logs
pm2 logs handoff-api
pm2 logs chatbot
sudo journalctl -u nginx -f
```

---

## Monitoring Strategy

### Application Metrics

#### Key Performance Indicators (KPIs):
```javascript
// Custom tracking in application
const metrics = {
  // Response times
  responseTime: {
    p50: '< 1s',
    p95: '< 2s',
    p99: '< 3s'
  },

  // Error rates
  errorRate: {
    target: '< 1%',
    critical: '> 5%'
  },

  // Availability
  uptime: {
    target: '99.9%',
    monthlyDowntime: '< 43min'
  },

  // RAG performance
  rag: {
    embeddingTime: '< 500ms',
    vectorSearchTime: '< 200ms',
    cacheHitRate: '> 40%'
  }
};
```

#### Monitoring Tools:
1. **PM2 Monitoring** (built-in)
   ```bash
   pm2 monit
   ```

2. **Application Performance Monitoring**
   - **Sentry** (Error tracking)
   - **DataDog** (APM - paid)
   - **New Relic** (APM - paid)
   - **Prometheus + Grafana** (self-hosted)

3. **Uptime Monitoring**
   - **UptimeRobot** (free tier)
   - **Pingdom** (paid)
   - **StatusCake** (free tier)

4. **Log Aggregation**
   - **Papertrail** (paid)
   - **Loggly** (paid)
   - **ELK Stack** (self-hosted)

### Alerting Rules

```yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    action: Send SMS + Email

  - name: SlowResponseTime
    condition: p95_response_time > 3s
    duration: 10m
    severity: warning
    action: Send Email

  - name: HighMemoryUsage
    condition: memory_usage > 90%
    duration: 5m
    severity: warning
    action: Send Email

  - name: ServiceDown
    condition: uptime_check == false
    duration: 1m
    severity: critical
    action: Send SMS + Email + Pager
```

---

## Backup & Disaster Recovery

### Database Backups
```bash
# Automated daily backups (cron)
0 2 * * * pg_dump -U cutting_edge_user cutting_edge | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Retention policy
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

# Off-site backup
rsync -avz /backups/ user@backup-server:/remote-backups/
```

### Application Backups
```bash
# Backup application code and configs
tar -czf /backups/app_$(date +%Y%m%d).tar.gz /var/www/cutting-edge
```

### Recovery Procedures
```bash
# 1. Database recovery
gunzip < /backups/db_20260209.sql.gz | psql -U cutting_edge_user cutting_edge

# 2. Application recovery
tar -xzf /backups/app_20260209.tar.gz -C /
pm2 restart all
```

---

## Security Considerations

### Application Security
- [ ] Input validation on all endpoints
- [ ] Rate limiting (100 req/min per IP)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] CORS properly configured
- [ ] Environment variables secured (chmod 600)

### Server Security
```bash
# 1. SSH hardening
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# 2. Firewall rules
sudo ufw deny incoming
sudo ufw allow from YOUR_IP to any port 22
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# 4. Automatic updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Secrets Management
```bash
# Use environment variables, never commit secrets
# Store in .env files with proper permissions
chmod 600 .env

# Consider using:
- HashiCorp Vault (enterprise)
- AWS Secrets Manager (AWS)
- Doppler (third-party)
```

---

## Scalability Plan

### Horizontal Scaling
When single server is insufficient:

```
┌─────────────────┐
│   Load Balancer │ (nginx/HAProxy)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ App 1 │ │ App 2 │  (2+ instances)
└───┬───┘ └──┬────┘
    │         │
    └────┬────┘
         │
    ┌────▼────────────┐
    │  Shared Cache   │  (Redis)
    │   PostgreSQL    │
    └─────────────────┘
```

### Caching Strategy
- **Level 1**: In-memory cache (current)
- **Level 2**: Redis (distributed cache)
- **Level 3**: CDN (static assets)

### Database Optimization
```sql
-- Add indexes for performance
CREATE INDEX idx_embedding_cosine ON knowledge_base_rag USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_shop_category ON knowledge_base_rag(shop_id, category);
CREATE INDEX idx_created_at ON knowledge_base_rag(created_at DESC);

-- Partitioning for large tables
-- (for future use when tables grow > 10M rows)
```

---

## Testing Strategy

### Pre-Deployment Tests
```bash
# 1. Unit tests
npm test

# 2. Integration tests
npm run test:integration

# 3. Performance benchmarks
npm run benchmark

# 4. Load testing
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
```

### Load Test Script (k6)
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  let response = http.post('https://api.cuttingedge.com/api/knowledge/search', JSON.stringify({
    query: 'haircut prices',
    shopId: 1,
    limit: 3
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

```bash
# Run load test
k6 run load-test.js
```

### Smoke Tests (Post-Deployment)
```bash
# 1. Health check
curl https://api.cuttingedge.cihconsultingllc.com/api/health

# 2. RAG functionality
curl -X POST https://api.cuttingedge.cihconsultingllc.com/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "haircut prices", "shopId": 1, "limit": 3}'

# 3. Chatbot interface
curl https://chat.cuttingedge.cihconsultingllc.com

# 4. SSL certificate
curl -Iv https://api.cuttingedge.cihconsultingllc.com 2>&1 | grep "issuer"
```

---

## Rollback Plan

### If Deployment Fails:
```bash
# 1. Immediate rollback to previous version
cd /var/www/cutting-edge
git revert HEAD
npm install --production
npm run build
pm2 restart all

# 2. Or rollback to specific commit
git checkout <previous-stable-commit>
npm install --production
npm run build
pm2 restart all

# 3. Database rollback (if needed)
pg_restore -U cutting_edge_user -d cutting_edge /backups/db_pre_deploy.sql
```

### Rollback Triggers:
- Error rate > 10% for 5 minutes
- Response time P95 > 5s for 10 minutes
- Service completely down
- Data corruption detected

---

## Cost Estimation

### Option A: VPS (Contabo)
- **VPS**: $15/month
- **Domain**: $10/year (~$1/month)
- **SSL**: Free (Let's Encrypt)
- **Monitoring**: Free (PM2 + basic tools)
- **Total**: ~$16/month

### Option B: Cloud (AWS)
- **EC2** (t3.medium): $30/month
- **RDS** (db.t3.micro): $15/month
- **ElastiCache**: $12/month
- **Load Balancer**: $18/month
- **Domain**: $1/month
- **Total**: ~$76/month

---

## Success Criteria

Phase 3 is complete when:
- [ ] Application deployed to production
- [ ] SSL certificates installed and valid
- [ ] All smoke tests passing
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Uptime > 99.9% for 1 week
- [ ] Response time P95 < 2s
- [ ] Error rate < 1%
- [ ] Load test passes (50 concurrent users)
- [ ] Security audit passed
- [ ] Documentation updated

---

## Timeline

| Week | Tasks | Deliverables |
|------|-------|--------------|
| **Week 1** | Infrastructure Setup | Server ready, DB configured, apps deployed |
| **Week 2** | SSL & Environment | HTTPS enabled, monitoring configured |
| **Week 3** | Testing & Launch | Production live, all tests passing |

**Milestones**:
- Day 7: Infrastructure complete
- Day 14: Staging deployed and tested
- Day 15: Production launch 🚀

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Server overload** | Medium | High | Load testing, scaling plan |
| **Database breach** | Low | Critical | Security hardening, backups |
| **SSL expiration** | Low | Medium | Auto-renewal configured |
| **Ollama crashes** | Medium | High | Monitoring, auto-restart |
| **Domain issues** | Low | Medium | DNS monitoring |
| **Deployment failure** | Medium | Medium | Rollback plan ready |

---

## Next Steps

### Immediate (This Week):
1. ✅ Review and approve this plan
2. ⏳ Provision VPS server
3. ⏳ Set up domain and DNS
4. ⏳ Begin infrastructure setup

### Short-term (Next 2 Weeks):
5. ⏳ Complete infrastructure deployment
6. ⏳ Configure monitoring and backups
7. ⏳ Execute staging deployment
8. ⏳ Perform thorough testing

### Long-term (Next Month):
9. ⏳ Launch to production
10. ⏳ Monitor and optimize
11. ⏳ Plan Phase 4 features

---

## Resources

### Documentation:
- [Deployment Checklist](./services/DEPLOYMENT_CHECKLIST.md)
- [Performance Guide](./services/handoff-api/PERFORMANCE_GUIDE.md)
- [Nginx Docs](https://nginx.org/en/docs/)
- [PM2 Docs](https://pm2.keymetrics.io/docs/)

### Tools:
- [Certbot](https://certbot.eff.org/)
- [UptimeRobot](https://uptimerobot.com/)
- [Sentry](https://sentry.io/)
- [k6](https://k6.io/)

### Support:
- **Infrastructure**: System Administrator
- **Database**: DBA Team
- **Application**: Development Team
- **Security**: Security Team

---

**Plan Created**: 2026-02-09
**Status**: 🔄 Ready for Review
**Next Review**: After infrastructure setup complete
