# Quick Deployment Guide - Cutting Edge Chatbot

## TL;DR - Deploy in 5 Minutes

### 1. Push to Git
```bash
cd services/chatbot
git add .
git commit -m "chore: add Vercel deployment configuration"
git push origin main
```

### 2. Deploy on Vercel
- Go to https://vercel.com/new
- Import your repository
- Root directory: `services/chatbot`
- Click **Deploy**

### 3. Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_API_URL=https://api.cihconsultingllc.com
VITE_OLLAMA_API=https://ollama.cihconsultingllc.com
```

### 4. Add Custom Domain
- Settings → Domains → Add Domain
- Enter: `chat-ce.cihconsultingllc.com`
- Update DNS as instructed

✅ **Done!** Your chatbot is live.

---

## What Was Configured

### ✅ Files Created
1. `vercel.json` - Vercel deployment configuration
2. `.env.example` - Environment variable template
3. `DEPLOYMENT_REPORT.md` - Complete documentation (this file)

### ✅ Build Tested
- Local build: ✅ Success (599ms)
- Preview server: ✅ Working
- Output structure: ✅ Correct
- Bundle size: ✅ Optimized (270 kB → 85 kB gzipped)

### ✅ Vercel Configuration
- Framework: Vite 6 (auto-detected)
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: ✅ Configured
- Cache headers: ✅ Optimized
- Security headers: ✅ Added

---

## Environment Variables

### Required Variables
| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API endpoint | `https://api.cihconsultingllc.com` |
| `VITE_OLLAMA_API` | Ollama LLM endpoint | `https://ollama.cihconsultingllc.com` |

### Set in Vercel
Settings → Environment Variables → Add New:
```
Name: VITE_API_URL
Value: https://api.cihconsultingllc.com
Environments: Production, Preview

Name: VITE_OLLAMA_API
Value: https://ollama.cihconsultingllc.com
Environments: Production, Preview
```

---

## Common Issues

### ❌ Blank Page After Deploy
**Fix**: Make sure `vercel.json` is committed to Git

### ❌ API Calls Fail
**Fix**: Check that `VITE_API_URL` is set correctly in Vercel

### ❌ Environment Variables Not Working
**Fix**: Ensure variables start with `VITE_` prefix

### ❌ Build Fails
**Fix**: Check build logs in Vercel Dashboard

---

## Project Structure

```
services/chatbot/
├── vercel.json              ← Vercel configuration
├── .env.example             ← Environment variables template
├── DEPLOYMENT_REPORT.md     ← Detailed documentation
├── QUICK_DEPLOY.md          ← This file
├── package.json             ← Build scripts
├── vite.config.ts           ← Vite configuration
├── tsconfig.json            ← TypeScript configuration
├── index.html               ← Entry point
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── components/
│       └── ChatInterface.tsx
└── dist/                    ← Build output (generated)
    ├── index.html
    └── assets/
        ├── index-*.js
        └── index-*.css
```

---

## Deployment Commands

### Via Vercel CLI
```bash
# Install CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add VITE_API_URL
```

### Via Git (Auto-Deploy)
```bash
# Any push to main triggers production deployment
git push origin main

# Any push to other branch triggers preview deployment
git push origin feature-branch
```

---

## What Happens During Deployment

1. **Vercel detects Vite project** automatically
2. **Installs dependencies** (`npm install`)
3. **Runs TypeScript compiler** (`tsc`)
4. **Builds with Vite** (`vite build`)
5. **Uploads dist/ folder** to Vercel Edge Network
6. **Deploys to global CDN** (~30 seconds)
7. **Activates custom domain** (if configured)

---

## Performance Metrics

### Build Size
- JavaScript: 270 kB (85 kB gzipped)
- CSS: 0.5 kB (0.3 kB gzipped)
- HTML: 0.6 kB (0.4 kB gzipped)

### Performance Score (Estimated)
- Lighthouse: 95+
- First Contentful Paint: < 1s
- Time to Interactive: < 2s

### CDN
- Global edge network
- Automatic HTTP/2
- Built-in caching
- Instant rollbacks

---

## Need Help?

### Vercel Resources
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support
- Status: https://vercel-status.com/

### Project Resources
- Full Report: `DEPLOYMENT_REPORT.md`
- Config: `vercel.json`
- Environment: `.env.example`

---

## Checklist

### Before Deploying
- [ ] Git repository created and pushed
- [ ] `vercel.json` committed to repo
- [ ] `.env.example` updated
- [ ] Local build tested successfully
- [ ] Preview server works locally

### After Deploying
- [ ] Homepage loads correctly
- [ ] Chat interface works
- [ ] API calls succeed
- [ ] No console errors
- [ ] Environment variables loaded
- [ ] Custom domain active
- [ ] SSL certificate valid

---

**Status**: ✅ Ready for Deployment  
**Estimated Time**: 15 minutes  
**Difficulty**: Beginner-friendly  

*Last updated: February 9, 2026*
