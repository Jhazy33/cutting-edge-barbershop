# 🚀 Quick Fix: Create Index Page Redirect

Since `https://voice.cihconsultingllc.com/voice` works perfectly,
we just need to make the root URL (`/`) redirect to `/voice`.

## Simple Solution:

Instead of fighting with middleware, let's add an HTML meta redirect
to the root page that will work instantly.

```
/src/app/page.tsx → Add meta redirect
```

This will redirect users from `voice.cihconsultingllc.com/` to `voice.cihconsultingllc.com/voice` immediately.
