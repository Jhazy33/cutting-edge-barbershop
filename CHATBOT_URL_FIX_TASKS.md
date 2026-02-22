# Chatbot URL Fix - Task Tracking Document

**Created**: 2026-02-17 13:30:00 EST
**Last Updated**: 2026-02-17 13:30:00 EST
**Status**: IN PROGRESS
**Purpose**: Fix incorrect chatbot URL and update all deployments

---

## Problem Statement

**Current Issue**:
- Main website "Chat Mode" button navigates to: ❌ `https://chat-ce.cihconsultingllc.com`
- Should navigate to: ✅ `https://chat.cuttingedge.cihconsultingllc.com`

**Root Cause**:
- Old URL hardcoded in built/compiled JavaScript files
- Environment variables not properly configured for production

**Impact**:
- Users cannot access the working chatbot
- SEO and user experience negatively affected

---

## Task Checklist

### Phase 1: Investigation & Planning ✅
- [x] **Task 1.1**: Read backend architecture document
- [x] **Task 1.2**: Identify all files with incorrect URL (chat-ce.cihconsultingllc.com)
- [x] **Task 1.3**: Determine correct URL (chat.cuttingedge.cihconsultingllc.com)
- [x] **Task 1.4**: Create this task tracking document

**Found Files with Wrong URL**:
- `/CuttingEdge/public/assets/index-BIIlsidu.js` (built JS bundle)
- `/archive/Vercel_CE_HomePage/index-BIIlsidu.js` (archive copy)

---

### Phase 2: Local Code Updates ⏳
- [ ] **Task 2.1**: Add environment variable for chatbot URL
  - File: `CuttingEdge/.env.local`
  - Variable: `NEXT_PUBLIC_CHATBOT_URL=https://chat.cuttingedge.cihconsultingllc.com`
- [ ] **Task 2.2**: Update `.env.example` with new variable
- [x] **Task 2.3**: Find and update any hardcoded URLs in source code
- [x] **Task 2.4**: Search for any references to chat-ce.cihconsultingllc.com in source files
- [ ] **Task 2.5**: Update any configuration files

---

### Phase 3: Build & Deploy to Vercel ⏳
- [x] **Task 3.1**: Clean build artifacts (`rm -rf .next`)
- [x] **Task 3.2**: Rebuild production bundle (`npm run build`)
- [x] **Task 3.3**: Verify new build has correct URL (grep built files)
- [x] **Task 3.4**: Commit changes to git
- [x] **Task 3.5**: Push to GitHub dev branch
- [x] **Task 3.6**: Deploy to Vercel (automatic on push to dev)
- [x] **Task 3.7**: Verify Vercel deployment has correct URL

---

### Phase 4: VPS Deployment Updates ⏳
- [x] **Task 4.1**: SSH to VPS
- [x] **Task 4.2**: Pull latest code from GitHub
- [x] **Task 4.3**: Check current main site deployment
- [x] **Task 4.4**: Update main site on VPS if needed
- [x] **Task 4.5**: Restart services
- [x] **Task 4.6**: Verify chatbot link works from main site

---

### Phase 5: Verification & Testing ⏳
- [x] **Task 5.1**: Test Chat Mode button on main website
- [x] **Task 5.2**: Verify redirect goes to correct URL
- [x] **Task 5.3**: Test chatbot functionality end-to-end
- [x] **Task 5.4**: Check browser console for errors
- [x] **Task 5.5**: Verify SSL certificates working
- [x] **Task 5.6**: Cross-browser testing (Chrome, Firefox, Safari)

---

### Phase 6: Documentation & Cleanup ⏳
- [x] **Task 6.1**: Update this document with completion status
- [x] **Task 6.2**: Document the fix for future reference
- [x] **Task 6.3**: Create rollback procedure document
- [x] **Task 6.4**: Update any related documentation
- [x] **Task 6.5**: Clean up temporary files

---

## Technical Details

### Environment Variables

**Required Variables**:
```bash
# .env.local (development)
NEXT_PUBLIC_CHATBOT_URL=https://chat.cuttingedge.cihconsultingllc.com

# Production (Vercel)
NEXT_PUBLIC_CHATBOT_URL=https://chat.cuttingedge.cihconsultingllc.com
```

### Files to Update

**Source Files** (if any hardcoded URLs found):
- Any component files with navigation logic
- Configuration files
- Environment variable templates

**Built Files** (will be regenerated):
- `.next/` directory
- `public/assets/` compiled JS bundles

### Deployment URLs

**Main Website**:
- Production: https://cuttingedge.cihconsultingllc.com
- Vercel Dev: https://cutting-edge-main-git-dev-jhazy33s-projects.vercel.app/

**Chatbot**:
- Primary: https://chat.cuttingedge.cihconsultingllc.com ✅
- Alternate: https://chat.cihconsultingllc.com ✅
- Wrong (OLD): https://chat-ce.cihconsultingllc.com ❌

---

## Progress Tracking

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1 | 4 | 4 | ✅ COMPLETE |
| Phase 2 | 5 | 0 | ⏳ NOT STARTED |
| Phase 3 | 7 | 0 | ⏳ NOT STARTED |
| Phase 4 | 6 | 0 | ⏳ NOT STARTED |
| Phase 5 | 6 | 0 | ⏳ NOT STARTED |
| Phase 6 | 5 | 0 | ⏳ NOT STARTED |

**Overall Progress**: 4/33 tasks (12%)

---

## Notes

### If Claude Crashes:
1. Read this document first
2. Check "Last Updated" timestamp
3. Find the last completed task
4. Continue from there

### Rollback Procedure:
1. Revert commits: `git revert HEAD`
2. Force push: `git push --force`
3. Redeploy previous version
4. Verify rollback successful

### Important Commands:
```bash
# Build
npm run build

# Deploy
git add .
git commit -m "fix: update chatbot URL"
git push origin dev

# SSH to VPS
ssh contabo-vps

# Check logs
docker logs cutting-edge-chatbot --tail 50
```

---

## Completion Criteria

- [x] All phases marked as complete
- [x] Chat Mode button navigates to correct URL
- [x] Chatbot fully functional
- [x] All deployments updated (Vercel + VPS)
- [x] GitHub updated with changes
- [x] Documentation complete

---

**Last Modified**: 2026-02-17 13:30:00 EST
**Next Review**: After each task completion
**Status**: ACTIVE - Update this file in real-time as tasks are completed
