# Cutting Edge - Deployment Architecture

**Last Updated**: 2026-02-09
**GitHub Repository**: https://github.com/Jhazy33/cutting-edge-barbershop

---

## 🌐 Production URLs

### Primary Websites
| Site | URL | Status | Platform | Purpose |
|------|-----|--------|----------|---------|
| **Main Website** | https://cuttingedge.cihconsultingllc.com | ✅ Live | Vercel | Primary barbershop website |
| **Chat Interface** | https://chat-ce.cihconsultingllc.com | ❌ Down | Vercel (pending) | AI chatbot interface |
| **Vercel Dev** | https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/ | ✅ Live | Vercel | Development environment |

### Infrastructure
| Service | URL/IP | Port | Purpose |
|---------|--------|------|---------|
| **VPS Server** | 109.199.118.38 | 22 (SSH), 80, 443 | Backend hosting |
| **PostgreSQL** | localhost (on VPS) | 5432 (internal), 5435 (external) | Database |
| **API Backend** | localhost (on VPS) | 3000 | Hono API server |

---

## 🏗️ Architecture Overview

### Deployment Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐          ┌──────▼──────────┐
        │  Main Site     │          │  Chat Site       │
        │  (Vercel)      │          │  (Vercel)        │
        │                │          │                  │
        │ cuttingedge    │          │ chat-ce          │
        │ .cihconsulting │          │ .cihconsulting   │
        │ llc.com        │          │ llc.com          │
        └───────┬────────┘          └──────┬───────────┘
                │                          │
                │         API Calls         │
                └──────────┬────────────────┘
                           │
                ┌──────────▼──────────┐
                │  VPS Server          │
                │  (109.199.118.38)   │
                │                      │
                │  ┌────────────────┐  │
                │  │  API Backend   │  │
                │  │  (Hono)        │  │
                │  │  Port 3000     │  │
                │  └────────┬───────┘  │
                │           │          │
                │  ┌────────▼───────┐  │
                │  │  PostgreSQL    │  │
                │  │  + pgvector    │  │
                │  │  Port 5432     │  │
                │  └────────────────┘  │
                │                      │
                │  ┌────────────────┐  │
                │  │  Ollama LLM    │  │
                │  │  Port 11434    │  │
                │  └────────────────┘  │
                └──────────────────────┘
```

### Technology Stack

#### Frontend (Vercel)
```
Main Site: cuttingedge.cihconsultingllc.com
├── React 18
├── Next.js 14
├── TypeScript
├── Tailwind CSS
└── Vite 6

Chat Site: chat-ce.cihconsultingllc.com
├── React 18
├── Vite 6
├── TypeScript
└── Tailwind CSS
```

#### Backend (VPS - PM2)
```
API Server: handoff-api (Port 3000)
├── Hono Framework
├── Node.js v24.12.0
├── PostgreSQL Client
└── Ollama Client
```

#### Database (VPS - Docker)
```
PostgreSQL 15.4
├── Database: nexxt_db
├── User: jhazy
├── Extensions: pgvector
└── Container: nexxt_whatsgoingon-postgres-1
```

#### AI/ML (VPS)
```
Ollama (Local LLM)
├── Model: nomic-embed-text (embeddings)
├── API: Port 11434
└── Purpose: RAG knowledge retrieval
```

---

## 📦 Project Structure & Deployment

### Local Development
```
cutting-edge-barbershop/
├── components/              # Main site React components
├── services/
│   ├── main-site/          # Main website → cuttingedge.cihconsultingllc.com
│   ├── chatbot/            # Chat interface → chat-ce.cihconsultingllc.com
│   └── handoff-api/        # Backend API → Deployed to VPS (PM2)
├── App.tsx
├── README.md
├── DEPLOYMENT_ARCHITECTURE.md (this file)
└── .git/
```

### Deployment Mapping

| Local Path | Deployed To | Platform | URL |
|------------|-------------|----------|-----|
| `services/main-site/` | Vercel Project | Vercel | https://cuttingedge.cihconsultingllc.com |
| `services/chatbot/` | Vercel Project (pending) | Vercel | https://chat-ce.cihconsultingllc.com |
| `services/handoff-api/` | PM2 Process | VPS | http://109.199.118.38:3000 |

---

## 🔗 Connection Flow

### User → Main Site Flow
```
1. User accesses: https://cuttingedge.cihconsultingllc.com
2. Vercel serves: React/Next.js frontend
3. User interacts with: Services, Portfolio, Contact sections
4. Static content: Served directly from Vercel
5. Dynamic features: API calls to VPS backend
```

### User → Chat Site Flow
```
1. User accesses: https://chat-ce.cihconsultingllc.com
2. Vercel serves: React chatbot UI
3. User sends message
4. Vercel frontend → VPS API (109.199.118.38:3000)
5. VPS API → PostgreSQL (retrieve knowledge)
6. VPS API → Ollama (generate response)
7. Response flows back through VPS → Vercel → User
```

### Database Flow
```
Vercel Frontend
    ↓ (HTTPS API calls)
VPS Backend (Hono API)
    ↓ (SQL queries)
PostgreSQL (Docker)
    ↓ (vector search)
pgvector Extension
```

---

## 🔐 Security Architecture

### P1 Security Implementation (Pending Migration)
- **RBAC**: 3-tier role hierarchy (app_reader, app_writer, app_admin)
- **Input Validation**: 17 CHECK constraints, 6 validation functions
- **SQL Injection Prevention**: 13 patterns detected and blocked
- **XSS Prevention**: Script tag and event handler detection
- **Audit Logging**: All security events logged

### CORS Configuration
```javascript
// Vercel → VPS API
Access-Control-Allow-Origin: https://cuttingedge.cihconsultingllc.com
Access-Control-Allow-Origin: https://chat-ce.cihconsultingllc.com
```

### Database Security
- **User**: jhazy (application user)
- **Roles**: RBAC with SECURITY DEFINER
- **Row-Level Security**: Enabled on 4 tables
- **Audit Log**: security_audit_log table tracks all access

---

## 🚀 Deployment Process

### Main Site (cuttingedge.cihconsultingllc.com)
```
1. git push origin dev
2. Vercel auto-deploys from GitHub
3. Vercel builds Next.js app
4. Deployed to production URL
5. CDN caching active
```

### Chat Site (chat-ce.cihconsultingllc.com) - PENDING
```
1. Configure Vercel project
2. Connect to GitHub repo
3. Set root directory: services/chatbot/
4. Configure environment variables:
   - VITE_API_URL=https://backend.cihconsultingllc.com
   - VITE_DATABASE_URL=postgresql://...
5. Deploy to production
```

### Backend API (VPS)
```
1. SSH to VPS: ssh contabo-vps
2. Pull latest code: git pull origin dev
3. Install dependencies: npm install
4. Build (if needed): npm run build
5. Restart PM2: pm2 restart handoff-api
6. Check status: pm2 status
```

---

## 🔧 Configuration Files

### Environment Variables

**Vercel (Main Site)**:
```env
NEXT_PUBLIC_API_URL=https://api.cihconsultingllc.com
NEXT_PUBLIC_SITE_URL=https://cuttingedge.cihconsultingllc.com
```

**Vercel (Chat Site)**:
```env
VITE_API_URL=https://api.cihconsultingllc.com
VITE_SITE_URL=https://chat-ce.cihconsultingllc.com
```

**VPS Backend**:
```env
DATABASE_URL=postgresql://jhazy:password@localhost:5435/nexxt_db
OLLAMA_BASE_URL=http://localhost:11434
PORT=3000
NODE_ENV=production
```

---

## 📊 Monitoring & Logging

### Vercel Monitoring
- **Analytics**: Vercel Analytics Dashboard
- **Logs**: Vercel Deployment Logs
- **Performance**: Vercel Speed Insights
- **Errors**: Vercel Error Tracking

### VPS Monitoring
```bash
# PM2 Process Monitoring
pm2 status
pm2 logs handoff-api
pm2 monit

# System Resources
htop
df -h
free -h

# Database Monitoring
docker stats nexxt_whatsgoingon-postgres-1
```

### Health Checks
```bash
# Main Site
curl -I https://cuttingedge.cihconsultingllc.com

# Chat Site
curl -I https://chat-ce.cihconsultingllc.com

# API Backend
curl https://api.cihconsultingllc.com/health

# Database Connection
docker exec nexxt_whatsgoingon-postgres-1 pg_isready -U jhazy
```

---

## 🎯 Deployment Checklist

### Initial Setup
- [x] Main site deployed to Vercel (cuttingedge.cihconsultingllc.com)
- [ ] Chat site deployed to Vercel (chat-ce.cihconsultingllc.com)
- [x] Backend API deployed to VPS (PM2)
- [x] PostgreSQL running in Docker
- [x] Ollama LLM service running

### Security
- [ ] P1-1 RBAC migration applied
- [ ] P1-2 Input Validation migration applied
- [ ] Security test suite passing (154+ tests)
- [ ] CORS configured correctly
- [ ] SSL/TLS certificates active

### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Log aggregation setup
- [ ] Alert system configured

---

## 🔗 Quick Links

### Documentation
- **[Project Roadmap](./PROJECT_ROADMAP.md)** - Complete project roadmap
- **[Project Status](./PROJECT_STATUS.md)** - Current implementation status
- **[Deployment Plan](./P1_DEPLOYMENT_PLAN.md)** - P1 security deployment plan
- **[Claude Context](./CLAUDE.md)** - AI context for Claude
- **[Gemini Context](./GEMINI.md)** - AI context for Gemini

### Repositories
- **GitHub**: https://github.com/Jhazy33/cutting-edge-barbershop
- **Git Branch**: dev
- **Deployment Tag**: v1.0-p1-security

### External Services
- **Vercel Dashboard**: https://vercel.com/dashboard
- **VPS Access**: ssh contabo-vps
- **Supabase Studio**: https://supabase.cihconsultingllc.com (database admin)

---

## 📞 Troubleshooting

### Common Issues

**Main Site Down**:
```bash
# Check Vercel deployment
vercel list
vercel logs

# Check DNS
nslookup cuttingedge.cihconsultingllc.com
```

**Chat Site Down**:
```bash
# Check if Vercel project is deployed
vercel list

# Check environment variables
vercel env pull
```

**API Not Responding**:
```bash
# SSH to VPS
ssh contabo-vps

# Check PM2
pm2 status
pm2 logs handoff-api

# Restart if needed
pm2 restart handoff-api
```

**Database Connection Failed**:
```bash
# Check Docker container
docker ps | grep postgres

# Restart container if needed
docker restart nexxt_whatsgoingon-postgres-1

# Test connection
docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db
```

---

**Last Updated**: 2026-02-09
**Architecture Version**: 1.0
**Status**: Main site live, chat site pending deployment

---

**Generated with Claude Code**
https://claude.com/claude-code
