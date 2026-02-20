# 🎯 Cutting Edge Data - Quick Reference

## 📂 FOLDER LOCATION
```
/Users/jhazy/AI_Projects/Vercel_CuttingEdge/CuttingEdge/cutting-edge-live-content-data/
```

## 📊 WHAT'S INSIDE (42 files total)

### 📄 business-info/ (7 files)
**WHAT:** Core business data from website
**FILES:** constants.ts, hero.tsx, footer.tsx, navbar.tsx, Instagram/Facebook content
**KEY DATA:** Address, phone, hours, services, tagline

### 👥 barbers/ (2 files)
**WHAT:** Staff information
**FILES:** barber-names.txt, barber-roles.txt
**KEY DATA:** 7 barbers (Paul R., Fast Eddie, Kevin, Bryan, Cam, Cody, Ricky)

### 💰 pricing-services/ (2 files)
**WHAT:** Service offerings & pricing
**FILES:** services-list.txt, pricing-tier.txt
**KEY DATA:** 8 services ($20-$45), 4 pricing tiers

### 🖼️ images/ (26 files)
**WHAT:** All visual assets
**FILES:**
- logos/logo.png (1 file)
- haircut-gallery/*.jpg (25 photos)

### 🔗 social-links/ (2 files)
**WHAT:** Social media & booking URLs
**FILES:** social-urls.txt, booking-links.txt
**KEY DATA:** Instagram, Facebook, Yelp, Squire

### 📊 stats/ (2 files)
**WHAT:** Metrics & location data
**FILES:** instagram-stats.txt, location-info.txt
**KEY DATA:** 485 IG followers, established 2012, Plymouth MA

---

## 🚀 FOR AI AGENTS

### Prompt Template:
```
Import Cutting Edge Barbershop data from:
/Users/jhazy/AI_Projects/Vercel_CuttingEdge/CuttingEdge/cutting-edge-live-content-data/

1. Read README.md for instructions
2. Parse all text files (skip # comment lines)
3. Extract: business info, barbers, services, images, links
4. Output format: [SQL | TypeScript | JSON - your choice]
```

### Data Format:
- Delimiter: `|` (pipe character)
- Comments: Lines starting with `#`
- Images: Standard .png, .jpg files

---

## 💻 FOR DEVELOPERS

### Database Tables Needed:
1. **barbers** (6 records)
2. **services** (8 records)
3. **business_info** (1 record)
4. **appointments** (empty, for bookings)

### Frontend Data Files:
```typescript
// Copy these files to your Next.js project:
- src/data/business-info.ts
- src/data/barbers.ts
- src/data/services.ts
- src/data/social-links.ts
- public/images/logo.png
- public/images/gallery/*
```

---

## ✅ QUALITY CHECK
- ✅ No duplicate files
- ✅ No duplicate data
- ✅ All sources documented
- ✅ AI-friendly format
- ✅ Database-ready
- ✅ Frontend-ready

---

## 📞 NEED HELP?
- **Full Documentation:** See README.md
- **SQL Examples:** See README.md > AI Agent Instructions
- **Code Examples:** See README.md > For Website Frontend

---
*Last Updated: 2026-02-19*
*Total Files: 42 (26 images + 16 data files)*
*Created by: Claude Code AI Agent*
