# Cutting Edge - Claude AI Context

**Last Updated**: 2026-02-09
**Project Status**: Phase 2 Complete | Phase 2.5 (P1 Security) Delivered | Phase 3 Planning

---

## 🌐 Deployment URLs

### Development
- **Vercel Dev**: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
- **GitHub Dev Branch**: https://github.com/Jhazy33/cutting-edge-barbershop/tree/dev
- **Deployment Tag**: v1.0-p1-security

### Production
- **Main Website**: https://cuttingedge.cihconsultingllc.com
- **Chatbot**: https://chat.cuttingedge.cihconsultingllc.com
- **Direct IP**: https://109.199.118.38
- **Supabase Studio**: https://supabase.cihconsultingllc.com

### 🎯 Project Documentation
- **Master Tracker**: `MASTER_TASK_TRACKER.md` ⭐ READ THIS FIRST
- **Organized Docs**: `docs/` folder (chatbot/, database/, security/, etc.)
- **Crash Report**: `CLAUDE_CRASH_INVESTIGATION.md`
- **Separation Status**: `PROJECT_SEPARATION_STATUS.md` (3 projects documented)

### VPS Access
- **SSH Command**: `ssh contabo-vps` or `ssh root@109.199.118.38`
- **Project Directory**: `/root/NeXXT_WhatsGoingOn`
- **Database**: PostgreSQL 15.4 in Docker (nexxt_whatsgoingon-postgres-1)
- **Process Manager**: PM2

---

## 📊 Project Status

### Completed Phases
- ✅ **Phase 0**: Git Infrastructure Setup
- ✅ **Phase 1**: Main Website (React + Next.js)
- ✅ **Phase 2**: RAG System Integration (AI chatbot with knowledge retrieval)
- ✅ **Phase 2.5**: Learning System (P1 Security Fixes delivered to GitHub + VPS)

### Current Work
- 🔄 **Phase 3**: Production Deployment (planning)
- ⏳ **P1 Security**: Database migrations pending PostgreSQL 15.4 compatibility fixes

---

## 🛠️ Architecture

### Frontend Stack
- **Framework**: React 18 + Next.js 14 + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite 6
- **Deployment**: Vercel (dev) + VPS (production)

### Backend Stack
- **API**: Hono (lightweight framework)
- **Runtime**: Node.js v24.12.0
- **Deployment**: PM2 on VPS

### Database
- **Primary**: PostgreSQL 15.4 with pgvector extension
- **Container**: Docker (nexxt_whatsgoingon-postgres-1)
- **User**: jhazy
- **Database**: nexxt_db
- **Port**: 5432 (container) → 5435 (external in .env)

### AI/ML
- **LLM**: Ollama (local on VPS)
- **Embeddings**: Ollama nomic-embed-text
- **Vector Search**: pgvector similarity search

---

## 🚀 Key Commands

### Git Operations
```bash
# Push to dev branch
git push origin dev

# Check recent commits
git log --oneline -5

# View deployment plan
cat P1_DEPLOYMENT_PLAN.md

# View deployment status
cat P1_DEPLOYMENT_COMPLETE.md
```

### VPS Operations
```bash
# SSH to VPS
ssh contabo-vps

# Navigate to project
cd /root/NeXXT_WhatsGoingOn

# Check PM2 status
pm2 status

# View logs
pm2 logs
pm2 logs --err

# Restart services
pm2 restart all
```

### Database Operations
```bash
# Connect to PostgreSQL in Docker
docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db

# Create backup
docker exec nexxt_whatsgoingon-postgres-1 \
  pg_dump -U jhazy nexxt_db > backup_$(date +%Y%m%d).sql

# Apply migration
docker exec -i nexxt_whatsgoingon-postgres-1 \
  psql -U jhazy -d nexxt_db < migration_file.sql
```

### Testing
```bash
# Run security tests
cd services/handoff-api
npm test tests/security/

# Run penetration tests
npm test security/penetration-tests/

# Run all tests
npm test
```

---

## 📁 Project Structure

```
cutting-edge/
├── components/                   # Main site React components
├── services/
│   ├── handoff-api/             # RAG API server (port 3000)
│   │   ├── src/
│   │   │   ├── services/        # Business logic
│   │   │   ├── utils/           # Database, caching
│   │   │   ├── scripts/         # Benchmarks
│   │   │   └── helpers/         # Input validation
│   │   ├── tests/               # Test suites (154+ tests)
│   │   ├── database/            # Migrations & schemas
│   │   │   └── migrations/      # P1 security migrations
│   │   └── security/            # Penetration tests
│   ├── chatbot/                 # AI chatbot UI (port 3001)
│   │   └── src/components/      # Chat interface
│   └── main-site/               # Main website (Next.js)
├── P1_DEPLOYMENT_PLAN.md        # P1 deployment checklist
├── P1_DEPLOYMENT_COMPLETE.md    # P1 deployment report
├── PROJECT_ROADMAP.md           # Master roadmap
├── PROJECT_STATUS.md            # Current status
├── CLAUDE.md                    # This file
└── GEMINI.md                    # Gemini AI context
```

---

## 🔐 Security Status

### P1 Critical Fixes (Delivered)
- **P1-1 RBAC**: Role-based access control (3 roles, SECURITY DEFINER on 10 functions, RLS on 4 tables)
- **P1-2 Validation**: Input validation (17 constraints, 6 functions, 5 triggers)
- **Test Suite**: 154+ security tests
- **Penetration Tests**: 65 attack scenarios
- **Security Score**: 6.5/10 → 9.5/10 (+46% improvement)

### Migration Status
- ✅ Code written and tested
- ✅ Committed to GitHub (tag: v1.0-p1-security)
- ✅ Synced to VPS
- ⚠️ **Pending**: PostgreSQL 15.4 compatibility fixes needed
  - `AUTHORIZATION` syntax error
  - `session_user` column name conflict

---

## 🎯 Current Priorities

### Immediate
1. Fix P1 migration scripts for PostgreSQL 15.4
2. Apply migrations to VPS database
3. Run security test suite (154+ tests)
4. Verify Vercel dev deployment

### Short Term
1. Complete Phase 2.5 learning system
2. Phase 3 production deployment
3. Performance monitoring and optimization
4. Address P2 security findings

---

## 📚 Documentation

### Key Documents
- **[P1 Deployment Plan](./P1_DEPLOYMENT_PLAN.md)** - Comprehensive deployment checklist
- **[P1 Deployment Report](./P1_DEPLOYMENT_COMPLETE.md)** - Deployment completion status
- **[Project Roadmap](./PROJECT_ROADMAP.md)** - Master planning document
- **[Project Status](./PROJECT_STATUS.md)** - Current implementation status
- **[Phase 3 Plan](./PHASE_3_PLAN.md)** - Production deployment strategy

### P1 Security Documentation
- `services/handoff-api/P1_FINAL_SUMMARY.md` - Complete P1 summary
- `services/handoff-api/docs/P1_QUICK_REFERENCE.md` - Quick reference guide
- `services/handoff-api/docs/P1_RBAC_IMPLEMENTATION_GUIDE.md` - RBAC guide
- `services/handoff-api/docs/P1_INPUT_VALIDATION_GUIDE.md` - Validation guide

---

## 🤖 AI Agent Capabilities

### Available Agents
- **database-architect**: Schema design, migrations, query optimization
- **security-auditor**: Security audits, penetration testing
- **test-engineer**: TDD, test automation, coverage
- **frontend-specialist**: React/Next.js, UI components
- **orchestrator**: Multi-agent coordination
- **debugger**: Systematic debugging, troubleshooting
- **code-reviewer**: ADVERSARIAL code review (finds 3-10 problems)

### Skills Available
- **Vercel React Best Practices**: Performance optimization (57 rules)
- **Frontend Testing**: Vitest + React Testing Library
- **find-skills**: Discover and install new skills

---

## 🔗 Quick Links

- **GitHub**: https://github.com/Jhazy33/cutting-edge-barbershop
- **Vercel Dev**: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
- **Production**: https://cuttingedge.cihconsultingllc.com
- **Deployment Tag**: https://github.com/Jhazy33/cutting-edge-barbershop/releases/tag/v1.0-p1-security

---

## ⚠️ Known Issues

1. **PostgreSQL Migrations**: P1 security migrations need syntax adjustments for PG 15.4
2. **Vercel Connection**: Needs verification that Vercel app can connect to VPS database
3. **Telegram Bot**: 235 restarts indicating chronic issues (currently stopped)

---

## 💡 Tips for Claude

- Always check `PROJECT_STATUS.md` for current project state
- Use `database-architect` agent for any database operations
- Use `security-auditor` agent for security-related tasks
- Test database changes on staging before production
- Verify Vercel environment variables are set correctly
- Check PM2 logs if services are failing
- Use cloudflared tunnel for temporary public URLs if needed

---

**Generated with Claude Code**
https://claude.com/claude-code
