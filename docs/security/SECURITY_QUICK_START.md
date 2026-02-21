# 🔐 Security Remediation - Quick Start Guide
**Date**: 2026-02-11 21:00 EST
**Status**: 🔄 AWAITING YOUR ACTION
**Time Required**: 10 minutes

---

## What You Need To Do (Right Now)

### Step 1: Revoke the Exposed Gemini API Key (2 minutes)

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Find this key**: `AIzaSyBouCTuYhoipvG61cSvFlYR7V-VfI-S_yE`
3. **Click the trash icon** to delete it
4. **Confirm deletion**

### Step 2: Create a New Gemini API Key (2 minutes)

1. **Click**: "Create credentials" → "API key"
2. **Copy the new key** that appears
3. **Click "Edit API key"** (next to the new key)
4. **Set restrictions**:
   - Under "Application", select "IP addresses"
   - Add VPS IP: `109.199.118.38`
   - Under "API restrictions", select "Gemini API" only
5. **Save the key**
6. **Keep the new key handy** (you'll need it in Step 4)

### Step 3: Revoke the Exposed Cloudflare Token (2 minutes)

1. **Go to**: https://dash.cloudflare.com/profile/api-tokens
2. **Find this token**: `0tDYTVQQIoXjE8EryVuW5rzqQqssJrU25CEqaq3t`
3. **Click "Revoke"**
4. **Confirm revocation**

### Step 4: Create a New Cloudflare Token (2 minutes)

1. **Click "Create Token"**
2. **Use template**: "Edit zone DNS" (or create custom)
3. **Set permissions**:
   - Zone → DNS → Edit
   - Zone Resources → Include → Specific zone → [Your domain]
4. **Set expiration**: 90 days (recommended)
5. **Click "Continue to summary"** → "Create Token"
6. **Copy the new token**

### Step 5: Give Claude the New Keys (1 minute)

**Reply to Claude with**:
```
New Gemini API Key: [paste new key]
New Cloudflare Token: [paste new token]
```

**Then Claude will**:
- Update the VPS .env file automatically
- Restart all services
- Verify everything is working
- Report back to you

---

## What Claude Has Already Done ✅

1. ✅ **Identified all exposed credentials** on VPS
2. ✅ **Created backups** (.env file + database)
3. ✅ **Mapped all services** using the exposed keys
4. ✅ **Created execution plan** with rollback procedures
5. ✅ **Prepared automated scripts** to update services

---

## What Will Happen Next

### After You Provide New Keys:

**Time**: 10-15 minutes
**Actions**: Claude will execute automatically

1. **Update .env file** on VPS with new keys
2. **Restart Docker services** (4 containers)
   - handoff-api (port 3000)
   - chatbot (port 3001)
   - voice-backend (port 3040)
   - voice-app
3. **Verify services are working**
   - Test chatbot endpoint
   - Test API health
   - Check logs for errors
4. **Report completion status** to you

**Expected Result**: Services back online in <5 minutes

---

## If Something Goes Wrong

### Rollback Procedure (<1 minute)

If services fail after the update, Claude can immediately rollback:

```bash
ssh contabo-vps
cd /root/cutting-edge
cp .env.backup_* .env
docker-compose restart
```

This will restore the old credentials and restart services.

**Claude will handle this automatically if needed.**

---

## Timeline Summary

| Phase | Action | Who | Time |
|-------|--------|-----|------|
| **1** | Revoke tokens | You | 5 min |
| **2** | Generate new keys | You | 5 min |
| **3** | Provide keys to Claude | You | 1 min |
| **4** | Update .env file | Claude | 2 min |
| **5** | Restart services | Claude | 5 min |
| **6** | Verify & test | Claude | 5 min |
| **7** | Cleanup & consolidate | Claude | 60 min |
| **8** | Final report | Claude | 10 min |

**Total Your Time**: 11 minutes
**Total Claude Time**: ~80 minutes (automated)

---

## Why This Is Critical

### What's Exposed Right Now:
- 🔴 **Real Gemini API key** (can be used by anyone with VPS access)
- 🔴 **Real Cloudflare token** (can control your DNS settings)

### Risk If Not Fixed:
- **Financial**: Someone could use your Gemini API key and charge your account
- **Security**: Someone could redirect your domain via Cloudflare
- **Privacy**: Chatbot conversations could be intercepted

### After Fixing:
- ✅ Old keys revoked (useless to attackers)
- ✅ New keys restricted (VPS IP only)
- ✅ All services secured
- ✅ Zero downtime (expected)

---

## Questions?

### Q: Will this break my chatbot?
**A**: No. The chatbot will be offline for ~2 minutes while services restart. Then it will work normally with the new API key.

### Q: What if I make a mistake?
**A**: Claude has created backups and can rollback immediately if anything goes wrong. The risk is minimal.

### Q: Do I need to do this right now?
**A**: YES, this is CRITICAL. Your API keys are exposed and could be used by anyone with VPS access. Fix this immediately.

### Q: What about the Telegram token?
**A**: The Telegram bot token is less critical (bot-specific). We'll handle that in Phase 2 (after the critical tokens are fixed).

---

## Quick Links

- **Google API Console**: https://console.cloud.google.com/apis/credentials
- **Cloudflare Tokens**: https://dash.cloudflare.com/profile/api-tokens
- **VPS SSH**: `ssh contabo-vps`
- **Chatbot URL**: https://cuttingedge.cihconsultingllc.com

---

## Need Help?

If you get stuck at any step:

1. **Tell Claude exactly where you are** (e.g., "I'm at step 2 and can't find the API key")
2. **Provide any error messages** you see
3. **Claude will guide you through it**

---

**Status**: 🔄 Waiting for you to revoke tokens and provide new keys
**Once ready**: Just paste the new keys in your reply
**Estimated completion**: Within 20 minutes of providing keys

---

**Generated by**: Claude Code Orchestrator Agent
**Multi-Agent Coordination**: Security Remediation
**Priority**: 🔴 CRITICAL

