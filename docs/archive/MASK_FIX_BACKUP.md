# Mask Fix Backup - Services Section Cut Off

**Date:** 2026-02-08
**Issue:** Services section heading ("Master Services") was invisible/cut off
**Root Cause:** CSS mask effect transparent zone was too large

---

## Problem Analysis

### Symptoms
- "Master Services" heading was NOT visible
- Red line under heading was NOT visible
- Service cards were partially visible
- User could only see "half" of Services section

### Root Cause
The CSS mask in `App.tsx` created a transparent zone at the top of the viewport:
- **Mobile:** 240px transparent zone
- **Desktop:** 400px transparent zone

When Services section scrolled into view, the heading and red line passed through this invisible zone.

### Visual Timeline
```
Before Fix (240px/400px mask):
┌─────────────────────────────┐
│ MASK: Transparent (0-240px) │ ← "Master Services" hidden here!
│ MASK: Fade zone             │ ← Red line hidden here!
│ MASK: Visible               │ ← Service cards visible
└─────────────────────────────┘

After Fix (180px/280px mask):
┌─────────────────────────────┐
│ MASK: Transparent (0-180px) │ ← Much smaller zone
│ MASK: Fade zone             │ ← Still looks premium
│ MASK: Visible               │ ← Everything visible!
└─────────────────────────────┘
```

---

## Fix Applied

### App.tsx (lines 73-77)

**Before:**
```tsx
:root { --mask-h: 240px; }
@media (min-width: 768px) { :root { --mask-h: 400px; } }
```

**After:**
```tsx
:root { --mask-h: 180px; }
@media (min-width: 768px) { :root { --mask-h: 280px; } }
```

### Changes Made
- **Mobile mask:** 240px → 180px (60px smaller)
- **Desktop mask:** 400px → 280px (120px smaller)

### Why This Works
- Smaller transparent zone = less content hidden
- Services heading now clears the mask zone
- Maintains premium fade effect
- Combined with spacing fixes (commit 475bb9a), creates perfect visibility

---

## Testing Checklist

- [x] Build passes (Vite 6.4.1)
- [ ] "Master Services" heading fully visible
- [ ] Red line fully visible
- [ ] Service cards not cut off
- [ ] Mask effect still looks premium
- [ ] Test on mobile (180px mask)
- [ ] Test on desktop (280px mask)

---

## Reversion

If you need to undo this fix:

**App.tsx lines 75-76:**
```tsx
// Change back to:
:root { --mask-h: 240px; }
@media (min-width: 768px) { :root { --mask-h: 400px; } }
```

---

## Related Fixes

This fix works in combination with:
- **Commit 475bb9a:** Hero/Services spacing improvements
- **Previous spacing changes:** Hero `pb-32`, Services `pt-32`

Together, these ensure:
1. Generous spacing between sections
2. No content hidden by mask
3. Premium fade effect maintained
4. Full section visibility on scroll
