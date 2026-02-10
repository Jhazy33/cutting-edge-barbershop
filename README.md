<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Cutting Edge - AI-Powered Barbershop Assistant

A modern, AI-integrated barbershop website with RAG-powered chatbot capabilities.

**Current Status**: Phase 2 Complete | Phase 3 Planning
**Last Updated**: 2026-02-09
**Tech Stack**: React, Next.js, TypeScript, PostgreSQL, pgvector, Ollama

---

## 🚀 Quick Links

- **[Project Roadmap](./PROJECT_ROADMAP.md)** - Master planning document with all phases
- **[Project Status](./PROJECT_STATUS.md)** - Current implementation status and metrics
- **[Phase 3 Plan](./PHASE_3_PLAN.md)** - Production deployment strategy
- **[Deployment Checklist](./services/DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
- **[Vercel Dev](https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/)** - Development environment
- **[Live Site](https://nexxt.cihconsultingllc.com)** - Main website

---

## 📋 Project Overview

Cutting Edge is a comprehensive barbershop website project featuring:

### ✅ Phase 1: Main Website (Complete)
- Modern, responsive design with Tailwind CSS
- Hero section with smooth scroll animations
- Services showcase and portfolio gallery
- Professional imagery and branding
- Mobile-first responsive design

### ✅ Phase 2: RAG Integration (Complete)
- **AI Chatbot** with knowledge retrieval
- **Vector similarity search** using pgvector
- **Performance optimizations**:
  - 100x faster repeated queries (caching)
  - 40% faster batch processing
  - Connection pooling and monitoring
- **Source citations** with similarity scores
- **Streaming responses** from Ollama

### 🔄 Phase 3: Production Deployment (Planning)
- Infrastructure setup and configuration
- SSL/TLS certificates
- Monitoring and alerting
- Load balancing and scaling
- Target: 99.9% uptime, <2s response time

---

## 🛠️ Tech Stack

### Frontend:
- **React 18** - UI framework
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite 6** - Build tool

### Backend:
- **Hono** - Lightweight API framework
- **PostgreSQL** + **pgvector** - Vector database
- **Ollama** - Local LLM and embeddings
- **Node.js** - Runtime

### Infrastructure:
- **Nginx** - Reverse proxy
- **PM2** - Process manager
- **Docker** - Containerization (optional)

---

## 📂 Project Structure

```
cutting-edge/
├── components/                   # Main site React components
├── services/
│   ├── handoff-api/             # RAG API server (port 3000)
│   │   ├── src/
│   │   │   ├── services/        # Business logic
│   │   │   ├── utils/           # Database, caching
│   │   │   └── scripts/         # Benchmarks
│   │   └── package.json
│   ├── chatbot/                 # AI chatbot UI (port 3001)
│   │   └── src/components/
│   ├── main-site/               # Main website
│   ├── RAG_README.md            # RAG quick start
│   └── DEPLOYMENT_CHECKLIST.md  # Deployment guide
├── App.tsx                      # Main application
├── PROJECT_ROADMAP.md           # Master roadmap
├── PROJECT_STATUS.md            # Quick status
├── PHASE_3_PLAN.md              # Deployment plan
├── CHANGELOG.md                 # Version history
└── README.md                    # This file
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** with pgvector extension
- **Ollama** with llama2 and nomic-embed-text models

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # For main site
   cp .env.local.example .env.local

   # For handoff API
   cd services/handoff-api
   cp .env.example .env

   # For chatbot
   cd ../chatbot
   cp .env.example .env
   ```

3. **Install Ollama and pull models:**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh

   # Pull models
   ollama pull llama2
   ollama pull nomic-embed-text
   ```

4. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb cutting_edge

   # Enable pgvector extension
   psql cutting_edge -c "CREATE EXTENSION IF NOT EXISTS vector;"

   # Run migrations (if available)
   cd services/handoff-api
   npm run migrate
   ```

### Running Locally

#### Main Site:
```bash
npm run dev
# Access at http://localhost:5173
```

#### Handoff API:
```bash
cd services/handoff-api
npm run dev
# Access at http://localhost:3000
```

#### Chatbot:
```bash
cd services/chatbot
npm run dev
# Access at http://localhost:3001
```

---

## 🧪 Testing

### Run Performance Benchmarks:
```bash
cd services/handoff-api
npm run benchmark
```

### Verify Implementation:
```bash
cd services/handoff-api
npm run verify
```

### Test API Endpoints:
```bash
# Health check
curl http://localhost:3000/api/health

# Knowledge search
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "haircut prices", "shopId": 1, "limit": 3}'
```

---

## 📊 Performance Metrics

### RAG System Performance:

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Embedding Generation | <500ms | ~245ms | ✅ Pass |
| Vector Search | <200ms | ~150ms | ✅ Pass |
| Batch Processing | <300ms | ~300ms | ✅ Pass |
| Cache Hit | <10ms | ~5ms | ✅ Pass |

### Key Improvements:
- **100x faster** repeated queries (via caching)
- **40% faster** batch processing (via concurrent requests)
- **Efficient** database access (via connection pooling)

---

## 📚 Documentation

### Essential Reading:
1. **[Project Roadmap](./PROJECT_ROADMAP.md)** - Complete project overview and phases
2. **[Project Status](./PROJECT_STATUS.md)** - Current status and next steps
3. **[Phase 3 Plan](./PHASE_3_PLAN.md)** - Production deployment strategy

### Technical Documentation:
4. **[RAG README](./services/RAG_README.md)** - RAG system quick start
5. **[Performance Guide](./services/handoff-api/PERFORMANCE_GUIDE.md)** - Performance optimization tips
6. **[Deployment Checklist](./services/DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
7. **[Final Report](./services/handoff-api/FINAL_REPORT.md)** - Comprehensive Phase 2 report

---

## 🔧 Configuration

### Environment Variables

**Main Site** (`.env.local`):
```bash
GEMINI_API_KEY=your_api_key_here
```

**Handoff API** (`services/handoff-api/.env`):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cutting_edge
DB_USER=postgres
DB_PASSWORD=your_password
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
PORT=3000
NODE_ENV=development
```

**Chatbot** (`services/chatbot/.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_OLLAMA_API=http://localhost:11434
```

---

## 🚀 Deployment

### Build for Production:

```bash
# Main site
npm run build

# Handoff API
cd services/handoff-api
npm run build

# Chatbot
cd ../chatbot
npm run build
```

### Quick Deploy Guide:

See **[Deployment Checklist](./services/DEPLOYMENT_CHECKLIST.md)** for comprehensive deployment instructions.

Quick start:
1. Set up VPS server
2. Install dependencies (Node.js, PostgreSQL, Ollama)
3. Configure nginx reverse proxy
4. Set up SSL certificates
5. Deploy applications with PM2
6. Configure monitoring and backups

---

## 🤝 Contributing

This project uses AI-assisted development with Claude Code. When contributing:

1. Follow the project's phase structure (see Roadmap)
2. Maintain TypeScript strict mode compliance
3. Add tests for new features
4. Update documentation
5. Follow git commit conventions

---

## 📝 Changelog

See **[CHANGELOG.md](./CHANGELOG.md)** for version history and recent changes.

---

## ⚠️ Known Issues

- Claude context crashes (resolved with optimized configuration)
- Missing unit tests (planned for Phase 3)
- Load testing not yet executed (planned for Phase 3)

---

## 🎯 Roadmap

### ✅ Completed:
- Phase 0: Git infrastructure
- Phase 1: Main website
- Phase 2: RAG integration & performance optimization

### 🔄 In Progress:
- Phase 3: Production deployment

### 📋 Planned:
- Phase 4: Advanced features (conversation memory, voice I/O, analytics)

See **[Project Roadmap](./PROJECT_ROADMAP.md)** for details.

---

## 📞 Support

For issues or questions:
- Check documentation in `/services` directories
- Review **[Project Status](./PROJECT_STATUS.md)** for known issues
- Check git logs: `git log --oneline -10`

---

## 📄 License

[Your License Here]

---

**Project Status**: 🟢 Healthy
**Last Updated**: 2026-02-09
**Maintained By**: Development Team
**AI Assistant**: Claude Code

---

## 🌐 Live Links

- **Main Website**: https://nexxt.cihconsultingllc.com
- **VPS**: 109.199.118.38:5432
- **Repository**: Local (git)

---

*This project is developed with AI assistance using Claude Code. See [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) for complete project details.*
