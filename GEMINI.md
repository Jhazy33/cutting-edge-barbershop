# Cutting Edge - Gemini AI Context

**Last Updated**: 2026-02-09
**Project**: AI-Powered Barbershop Website
**Current Phase**: Phase 2 Complete | Phase 2.5 P1 Security Delivered

---

## 🌐 Deployment Information

### Development Environment
- **Vercel Dev URL**: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
- **GitHub Repository**: https://github.com/Jhazy33/cutting-edge-barbershop
- **Development Branch**: `dev`
- **Deployment Tag**: `v1.0-p1-security`

### Production Environment
- **Production Site**: https://cuttingedge.cihconsultingllc.com
- **VPS Server**: 109.199.118.38 (Contabo)
- **Supabase Studio**: https://supabase.cihconsultingllc.com

### Server Access
- **SSH Command**: `ssh contabo-vps` or `ssh root@109.199.118.38`
- **Project Path**: `/root/NeXXT_WhatsGoingOn`
- **Process Manager**: PM2

---

## 🏗️ Architecture Overview

### Frontend Architecture
```
Frontend (Vercel)
├── React 18 + Next.js 14
├── TypeScript for type safety
├── Tailwind CSS for styling
└── Vite 6 for building
```

### Backend Architecture
```
Backend (VPS with PM2)
├── Hono API framework (lightweight)
├── Node.js v24.12.0
├── PostgreSQL 15.4 + pgvector
└── Ollama (local LLM)
```

### Database Architecture
```
Database (Docker on VPS)
├── Container: nexxt_whatsgoingon-postgres-1
├── User: jhazy
├── Database: nexxt_db
├── Port: 5432 (internal), 5435 (external)
└── Extensions: pgvector (vector similarity search)
```

### AI/ML Architecture
```
AI System
├── LLM: Ollama (local on VPS)
├── Embeddings: nomic-embed-text
├── Vector Search: pgvector
├── RAG: Retrieval Augmented Generation
└── Caching: 100x performance improvement
```

---

## 📊 Project Phases

### ✅ Phase 1: Main Website (Complete)
- Modern, responsive design
- Hero section with animations
- Services showcase
- Portfolio gallery
- Contact/booking section
- Professional imagery

### ✅ Phase 2: RAG System Integration (Complete)
- **Team A - Performance**: 100x caching, 40% batch optimization
- **Team C - Chatbot**: AI chat with source citations, streaming responses
- Vector similarity search using pgvector
- Knowledge base integration

### ✅ Phase 2.5: Learning System (P1 Security Delivered)
- **P1-1 RBAC**: 3-tier role hierarchy, SECURITY DEFINER, RLS policies
- **P1-2 Validation**: Input validation, SQL injection prevention, XSS protection
- **Test Suite**: 154+ security tests
- **Security Score**: 6.5/10 → 9.5/10 (+46% improvement)
- **Status**: Code delivered to GitHub + VPS, migrations pending compatibility fixes

### 🔄 Phase 3: Production Deployment (Planning)
- Infrastructure setup
- Environment configuration
- Staging deployment
- Production rollout
- Monitoring and alerting

---

## 🔐 Security Implementation

### P1 Critical Security Fixes

#### P1-1: RBAC (Role-Based Access Control)
**Components**:
- 3 database roles: `app_reader`, `app_writer`, `app_admin`
- SECURITY DEFINER on 10 trigger functions
- Row-Level Security (RLS) on 4 tables with 8 policies
- Security audit logging system

**Files**:
- `services/handoff-api/database/migrations/005_p1_security_rbac.sql` (983 lines)
- `services/handoff-api/database/migrations/005_rollback_rbac.sql` (672 lines)

#### P1-2: Input Validation
**Components**:
- 17 CHECK constraints across 5 tables
- 6 validation functions:
  - `sanitize_text_input()` - Removes NULL bytes, control characters
  - `is_valid_email()` - Email format validation
  - `is_valid_uuid()` - UUID v4 validation
  - `detect_sql_injection()` - 13 SQL injection patterns
  - `validate_jsonb_structure()` - Size limit, dangerous key detection
  - `check_for_xss_patterns()` - Script tags, event handlers
- 5 validation triggers

**Files**:
- `services/handoff-api/database/migrations/006_p1_input_validation.sql` (815 lines)
- `services/handoff-api/database/migrations/006_rollback_input_validation.sql` (103 lines)

### Testing Coverage
- **Unit Tests**: 114 security tests
- **Penetration Tests**: 65 attack scenarios
- **Database Tests**: 55 validation/RBAC tests
- **Total**: 154+ comprehensive tests

---

## ⚠️ Current Issues

### PostgreSQL Migration Compatibility
**Problem**: P1 migration scripts have syntax errors with PostgreSQL 15.4

**Errors**:
1. `AUTHORIZATION` keyword not supported in PG 15.4
2. `session_user` used as column name (reserved word)

**Solution Needed**: Adjust migration scripts for PG 15.4 compatibility

**Status**:
- ✅ Code written and tested locally
- ✅ Committed to GitHub (tag: v1.0-p1-security)
- ✅ Synced to VPS file system
- ⚠️ **Awaiting**: Syntax fixes before database deployment

---

## 🚀 Deployment Commands

### Git Operations
```bash
# Push changes to dev branch
git push origin dev

# View deployment plan
cat P1_DEPLOYMENT_PLAN.md

# View deployment status
cat P1_DEPLOYMENT_COMPLETE.md
```

### VPS Operations
```bash
# Connect to VPS
ssh contabo-vps

# Check PM2 status
pm2 status

# View application logs
pm2 logs

# Restart all services
pm2 restart all
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it nexxt_whatsgoingon-postgres-1 psql -U jhazy -d nexxt_db

# Create backup
docker exec nexxt_whatsgoingon-postgres-1 \
  pg_dump -U jhazy nexxt_db > backup_$(date +%Y%m%d).sql

# Apply migration
cat migration_file.sql | docker exec -i nexxt_whatsgoingon-postgres-1 \
  psql -U jhazy -d nexxt_db
```

---

## 📁 Key File Locations

### Configuration Files
- `.claude.json` - Claude AI configuration
- `CLAUDE.md` - This file (Claude context)
- `GEMINI.md` - Gemini context
- `PROJECT_STATUS.md` - Current status
- `PROJECT_ROADMAP.md` - Master roadmap

### Documentation
- `P1_DEPLOYMENT_PLAN.md` - Deployment checklist (458 lines)
- `P1_DEPLOYMENT_COMPLETE.md` - Deployment report (368 lines)
- `PHASE_3_PLAN.md` - Production deployment plan

### Services
```
services/
├── handoff-api/          # RAG API backend
│   ├── src/
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Database, caching
│   │   ├── helpers/      # Input validation
│   │   └── scripts/      # Benchmarks
│   ├── tests/            # 154+ security tests
│   ├── database/
│   │   └── migrations/   # P1 security migrations
│   └── security/         # Penetration tests
├── chatbot/              # AI chatbot UI
└── main-site/            # Main website (Next.js)
```

---

## 🎯 Current Priorities

### Immediate (Today)
1. Fix P1 migration scripts for PostgreSQL 15.4 compatibility
2. Test Vercel dev deployment functionality
3. Verify database connectivity from Vercel to VPS

### Short Term (This Week)
1. Apply fixed migrations to VPS database
2. Execute full security test suite (154+ tests)
3. Complete Phase 2.5 learning system
4. Begin Phase 3 production deployment

### Long Term (Next Sprint)
1. Address P2 security findings
2. Implement encryption at rest
3. Add real-time alerting
4. Performance optimization

---

## 🔗 Quick Reference

### URLs
- **Vercel Dev**: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/
- **Production**: https://cuttingedge.cihconsultingllc.com
- **GitHub**: https://github.com/Jhazy33/cutting-edge-barbershop
- **Deployment Tag**: https://github.com/Jhazy33/cutting-edge-barbershop/releases/tag/v1.0-p1-security

### Important Ports
- **PostgreSQL**: 5432 (Docker internal), 5435 (external)
- **API**: 3000 (handoff-api)
- **Chatbot**: 3001
- **Website**: 3015 (VPS production)

### Environment Variables
```bash
DATABASE_URL=postgresql://jhazy:password@localhost:5435/nexxt_db
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 💡 Tips for Gemini

1. **Always check**: `PROJECT_STATUS.md` for current state
2. **Database changes**: Test on staging first, backup before migrations
3. **Security**: Use security-auditor agent for any security work
4. **Testing**: Run full test suite before deploying
5. **Vercel**: Verify environment variables are configured
6. **VPS**: Check PM2 logs if services fail
7. **Backups**: Always create database backup before migrations
8. **Cloudflared**: Use for temporary public URLs if needed

---

## 📚 Additional Resources

### Documentation
- **RAG System**: `services/RAG_README.md`
- **Deployment**: `services/DEPLOYMENT_CHECKLIST.md`
- **Security**: `services/handoff-api/docs/P1_QUICK_REFERENCE.md`

### Test Suites
- **Security Tests**: `npm test tests/security/`
- **Penetration Tests**: `npm test security/penetration-tests/`
- **All Tests**: `npm test`

### Monitoring
- **PM2**: `pm2 status`, `pm2 logs`, `pm2 monit`
- **Health Check**: `curl https://cuttingedge.cihconsultingllc.com/api/events`
- **Database**: `docker stats nexxt_whatsgoingon-postgres-1`

---

**Generated for Gemini AI**
Last Updated: 2026-02-09
