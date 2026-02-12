# Layout Fix Backup - Hero/Services Overlap

**Date:** 2026-02-08
**Task:** Fix overlapping Hero and Services sections

## Current State (Before Changes)

### Hero.tsx (line 38)
```tsx
<header ref={containerRef} className="relative pt-64 md:pt-[500px] pb-20 min-h-screen flex flex-col justify-center">
```
**Current value:** `pb-20` (5rem bottom padding)

### Services.tsx (line 24)
```tsx
<section id="services" className="py-24 px-6 bg-background-dark text-white border-t border-white/5 relative">
```
**Current value:** `py-24` (6rem top AND bottom padding)

## Changes To Make

### Hero.tsx
**Line 38:** Change `pb-20` → `pb-32`
```tsx
<header ref={containerRef} className="relative pt-64 md:pt-[500px] pb-32 min-h-screen flex flex-col justify-center">
```
**New value:** `pb-32` (8rem bottom padding) - 60% more spacing

### Services.tsx
**Line 24:** Change `py-24` → `pt-32 pb-24`
```tsx
<section id="services" className="pt-32 pb-24 px-6 bg-background-dark text-white border-t border-white/5 relative">
```
**New value:** `pt-32` (8rem top) + `pb-24` (6rem bottom) - 33% more top spacing

## How to Revert

If you need to undo these changes:

### Hero.tsx
Change line 38 back to:
```tsx
pb-32 → pb-20
```

### Services.tsx
Change line 24 back to:
```tsx
pt-32 pb-24 → py-24
```

## Rationale

Following luxury design principles from frontend-design skill:
- **Generous whitespace** creates premium feel
- **8-point grid system** (32rem = 4 × 8)
- **Clear visual hierarchy** between sections
- Eliminates overlap while maintaining brand aesthetic

## Testing Checklist

- [ ] Hero section content has breathing room
- [ ] Services section starts cleanly after Hero
- [ ] No visual overlap on mobile (pt-64)
- [ ] No visual overlap on desktop (pt-[500px])
- [ ] Scroll behavior feels natural
- [ ] Background mask effect works correctly
