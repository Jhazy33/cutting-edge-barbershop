# 🌐 Chatbot Browser Testing Protocol

**Date**: 2026-02-12 00:30:00 EST
**Purpose**: Comprehensive testing of https://cuttingedge.cihconsultingllc.com chatbot functionality
**Status**: Ready for testing

---

## 🎯 TEST OBJECTIVES

1. Verify "Need Help" / "Digital Client" button appears on main website
2. Confirm clicking button opens modal with Voice Mode and Chat Mode options
3. Test Chat Mode link navigates to https://chat.cuttingedge.cihconsultingllc.com
4. Verify chat interface loads without crashes
5. Test sending messages and receiving AI responses
6. Document any errors, crashes, or unexpected behavior
7. Capture browser console errors
8. Test on multiple browsers (Chrome, Safari, Firefox, Edge)

---

## 📋 STEP-BY-STEP TESTING GUIDE

### **STEP 1: Navigate to Main Website**

**URL**: https://cuttingedge.cihconsultingllc.com

**Actions**:
1. Open browser (Chrome recommended for initial testing)
2. Navigate to URL
3. Wait for page to fully load
4. Look for floating "Need Help" button in bottom-right corner

**Expected Results**:
- ✅ Page loads without errors
- ✅ Floating button appears with:
  - "Need Help?" label (small text)
  - "Digital Client" label (bold text)
  - Cutting Edge logo icon
  - Black/transparent background with red accent

**Screenshot Location**: Capture full page showing button

**What to Check**:
```
□ Floating button visible on desktop (bottom-right)
□ Button has "Need Help?" text
□ Button has "Digital Client" text
□ Cutting Edge logo icon visible
□ Hover effect works (scales up slightly)
```

---

### **STEP 2: Click "Digital Client" Button**

**Actions**:
1. Click the floating "Digital Client" button
2. Wait for modal to appear
3. Check modal appearance and animations

**Expected Results**:
- ✅ Modal overlay appears with backdrop blur
- ✅ Large Cutting Edge logo animates (floating effect)
- ✅ "Digital Client" title visible
- ✅ Subtitle: "Choose your preferred way to connect"
- ✅ Two option cards visible:
  - **Voice Mode** (microphone icon)
  - **Chat Mode** (chat icon)
- ✅ Close button (X) in top-right corner
- ✅ "Live Status: All Systems Synced" at bottom with green pulsing dot

**Screenshot Location**: Capture full modal

**What to Check**:
```
□ Modal appears smoothly with animation
□ Backdrop blur effect visible
□ Large logo visible with floating animation
□ "Voice Mode" card visible with microphone icon
□ "Chat Mode" card visible with chat icon
□ Both cards have hover effects
□ Close button functional
□ Green pulsing dot shows "Live Status: All Systems Synced"
```

**Known Behavior**:
- Modal should appear with fade-in and scale-in animations
- Logo should float up and down continuously
- Cards should scale up and change color on hover

---

### **STEP 3: Click "Chat Mode" Option**

**Actions**:
1. Click the "Chat Mode" card
2. Wait for navigation
3. Observe URL change

**Expected Results**:
- ✅ Browser navigates to: https://chat.cuttingedge.cihconsultingllc.com
- ✅ Chat interface loads
- ✅ No intermediate errors or white screens

**Screenshot Location**: Capture navigation moment if possible

**What to Check**:
```
□ URL changes to https://chat.cuttingedge.cihconsultingllc.com
□ No redirect loops
□ No "too many redirects" errors
□ Page transition is smooth
```

---

### **STEP 4: Verify Chat Interface Loads**

**URL**: https://chat.cuttingedge.cihconsultingllc.com

**Expected UI Elements**:
- ✅ Page title: "Cutting Edge | Digital Concierge"
- ✅ Chat interface container
- ✅ Message input field at bottom
- ✅ Send button
- ✅ Welcome message or greeting
- ✅ Cutting Edge branding

**Screenshot Location**: Capture full chat interface on load

**What to Check**:
```
□ Chat interface renders without errors
□ Input field visible and clickable
□ Send button visible
□ No broken images or missing icons
□ Layout is responsive (try resizing browser)
□ No console errors (check F12 → Console tab)
```

---

### **STEP 5: Check Browser Console for Errors**

**Actions**:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to "Console" tab
3. Look for red error messages
4. Note any warnings
5. Check Network tab for failed requests

**Expected Results**:
- ✅ No JavaScript errors
- ✅ No failed network requests
- ✅ All resources load successfully (status 200)
- ✅ No CORS errors
- ✅ No WebSocket connection errors

**Screenshot Location**: Capture Console tab

**What to Check**:
```
□ No red error messages in Console tab
□ No yellow warnings (or note if present)
□ All resources in Network tab show 200 status
□ No requests to localhost (should all be to cuttingedge.cihconsultingllc.com)
□ No 404 or 500 errors
□ No CORS errors
□ No WebSocket errors
```

**Common Errors to Look For**:
- `ERR_CONNECTION_REFUSED`
- `ERR_TOO_MANY_REDIRECTS`
- `CORS policy` errors
- `Failed to fetch`
- `WebSocket` connection errors
- `localhost` in request URLs (indicates config issue)

---

### **STEP 6: Send Test Message #1 (Simple Greeting)**

**Message**: "Hello"

**Actions**:
1. Type "Hello" in input field
2. Click Send button (or press Enter)
3. Watch for message to appear in chat
4. Wait for AI response
5. Note response time

**Expected Results**:
- ✅ Message appears immediately in chat interface
- ✅ "Typing..." indicator or loading state shows
- ✅ AI responds within 20-30 seconds
- ✅ Response is relevant and helpful
- ✅ No errors displayed

**Screenshot Location**: Capture chat with message and response

**What to Check**:
```
□ User message appears in chat bubble
□ Message timestamp visible
□ Loading/typing indicator shows
□ AI response arrives (may take 15-30 seconds)
□ Response is formatted correctly
□ No error messages overlay
□ Browser console shows no new errors
□ Network tab shows successful /api/chat request (status 200)
```

**Response Time Tracking**:
```
Start Time: ___________
End Time:   ___________
Duration:   _______ seconds
```

**If It Fails**:
- Take screenshot of exact error
- Copy browser console errors
- Note exact moment it fails (during send, during wait, or no response)
- Check if browser crashes completely

---

### **STEP 7: Send Test Message #2 (Complex Question)**

**Message**: "What are your business hours and how do I book an appointment?"

**Actions**:
1. Type the full question in input field
2. Click Send button
3. Wait for AI response
4. Read response for accuracy

**Expected Results**:
- ✅ Message appears in chat
- ✅ AI responds with accurate information about:
  - Business hours
  - Booking process
  - Location/contact info
- ✅ Response is helpful and complete
- ✅ No crashes or errors

**Screenshot Location**: Capture full conversation

**What to Check**:
```
□ Message appears correctly
□ AI response mentions business hours
□ AI response mentions booking (Squire link)
□ Response is accurate for Cutting Edge Barbershop
□ No hallucinations or wrong information
□ Response time acceptable (<30 seconds)
```

---

### **STEP 8: Test Chat Functionality**

**Actions**:
1. Send 3-5 more varied messages
2. Test different question types:
   - "What services do you offer?"
   - "How much does a haircut cost?"
   - "Where are you located?"
3. Check each response

**Expected Results**:
- ✅ All messages get responses
- ✅ Responses are relevant
- ✅ No messages get "lost"
- ✅ Chat history is visible
- ✅ No crashes after multiple messages

**Screenshot Location**: Capture full conversation history

**What to Check**:
```
□ All user messages visible
□ All AI responses visible
□ Conversation flows naturally
□ No duplicate messages
□ No missing messages
□ Chat scroll works
□ Can view previous messages by scrolling up
```

---

### **STEP 9: Test Mobile Responsiveness (Optional)**

**Actions**:
1. Open browser DevTools (F12)
2. Click device toolbar icon (Cmd+Shift+M)
3. Select iPhone 12 or similar device
4. Reload page
5. Test chat functionality again

**Expected Results**:
- ✅ Chat interface adapts to mobile layout
- ✅ Touch targets are large enough
- ✅ Input field accessible
- ✅ No horizontal scrolling
- ✅ All features work on mobile

**Screenshot Location**: Capture mobile view

**What to Check**:
```
□ Layout stacks correctly on mobile
□ Input field doesn't hide behind keyboard
□ Send button accessible
□ Messages readable on small screen
□ No zoom issues
□ Touch interactions work
```

---

### **STEP 10: Test Multiple Browsers (Optional)**

**Browsers to Test**:
1. Chrome (primary)
2. Safari (if on Mac)
3. Firefox
4. Edge (if on Windows)

**Actions**:
1. Repeat Steps 1-8 in each browser
2. Note any browser-specific issues
3. Compare behavior across browsers

**Expected Results**:
- ✅ Consistent behavior across all browsers
- ✅ No browser-specific crashes
- ✅ All features work identically

**What to Check**:
```
□ Chrome: Works correctly
□ Safari: Works correctly
□ Firefox: Works correctly
□ Edge: Works correctly
□ No browser-specific console errors
```

---

## 🔍 CRASH INVESTIGATION CHECKLIST

**If Chatbot Crashes or Fails**:

### Immediate Actions
```
□ Take screenshot of exact error state
□ Note browser being used
□ Note exact step when crash occurred
□ Copy ALL console errors (right-click → Save as...)
□ Check Network tab for failed requests (red status codes)
□ Note timestamp of crash
```

### Error Categories

**Type 1: Page Doesn't Load**
- Symptom: White screen, spinner forever
- Check: DNS issues, SSL certificate, server down
- Console: Connection refused, timeout errors
- Action: Check server logs, test DNS

**Type 2: Chat Interface Loads But Messages Fail**
- Symptom: Can see UI but messages don't send
- Check: API connectivity, CORS issues
- Console: Failed to fetch, CORS errors
- Action: Check API logs, verify CORS config

**Type 3: Browser Crashes Completely**
- Symptom: Browser tab closes or freezes
- Check: Memory issues, infinite loops
- Console: N/A (browser crashed)
- Action: Check for memory leaks, infinite render loops

**Type 4: "LLM Connection Failed" Error**
- Symptom: Error message about LLM connection
- Check: Ollama service, handoff-api logs
- Console: API returns 500 error
- Action: Check Ollama is running, restart containers

**Type 5: "Too Many Redirects"**
- Symptom: ERR_TOO_MANY_REDIRECTS
- Check: Nginx configuration, SSL settings
- Console: Redirect loop detected
- Action: Check Nginx config, SSL certificate

---

## 📊 TEST RESULTS TEMPLATE

### Session Information
```
Date/Time: _________________
Tester: ___________________
Browser: _________________
OS: ______________________
Device: _________________
```

### Test Results Summary
```
Step 1 (Main Site Load):         PASS / FAIL
Step 2 (Button Click):           PASS / FAIL
Step 3 (Navigate to Chat):       PASS / FAIL
Step 4 (Chat Interface Loads):   PASS / FAIL
Step 5 (Console Check):          PASS / FAIL
Step 6 (Test Message 1):         PASS / FAIL
Step 7 (Test Message 2):         PASS / FAIL
Step 8 (Multiple Messages):      PASS / FAIL
Step 9 (Mobile Test):            PASS / FAIL / N/A
Step 10 (Cross-Browser):         PASS / FAIL / N/A

Overall Result: PASS / FAIL
```

### Performance Metrics
```
Page Load Time:          ______ seconds
Chat Interface Load:     ______ seconds
First Message Response:  ______ seconds
Average Response Time:   ______ seconds
Network Requests Total:  ______
Failed Requests:         ______
Console Errors:          ______
```

### Issues Found
```
Issue 1: _________________________________________________
Severity: ___ (Critical/High/Medium/Low)
Steps to Reproduce:
1.
2.
3.

Screenshot: _______________________

Console Error:
[Paste console error here]
```

---

## 🛠️ TROUBLESHOOTING GUIDE

### If Step 1 Fails (Main Site Won't Load)

**Symptoms**:
- White screen
- Connection timeout
- DNS error

**Checks**:
```bash
# 1. Check if server is up
ssh contabo-vps "docker ps | grep cutting-edge"

# 2. Check nginx status
ssh contabo-vps "systemctl status nginx"

# 3. Check SSL certificate
ssh contabo-vps "certbot certificates"

# 4. Test DNS locally
nslookup cuttingedge.cihconsultingllc.com
```

**Common Fixes**:
- Restart nginx: `ssh contabo-vps "systemctl restart nginx"`
- Restart containers: `ssh contabo-vps "cd /root/cutting-edge && docker-compose restart"`
- Check DNS propagation

---

### If Step 3 Fails (Navigation to Chat URL Fails)

**Symptoms**:
- ERR_TOO_MANY_REDIRECTS
- 404 Not Found
- Connection refused

**Checks**:
```bash
# 1. Check if chatbot container is running
ssh contabo-vps "docker ps | grep chatbot"

# 2. Check nginx chatbot config
ssh contabo-vps "cat /etc/nginx/sites-available/chat.cuttingedge.cihconsultingllc.com"

# 3. Test chatbot URL directly
curl -I https://chat.cuttingedge.cihconsultingllc.com
```

**Common Fixes**:
- Restart chatbot container: `ssh contabo-vps "docker restart cutting-edge_chatbot_1"`
- Reload nginx: `ssh contabo-vps "nginx -s reload"`
- Check SSL certificate validity

---

### If Step 6 Fails (Messages Don't Send)

**Symptoms**:
- Message appears but no response
- "LLM Connection failed" error
- 500 error in Network tab

**Checks**:
```bash
# 1. Check handoff-api logs
ssh contabo-vps "docker logs cutting-edge-handoff-api --tail 50"

# 2. Check if Ollama is running
ssh contabo-vps "docker ps | grep ollama"

# 3. Test Ollama directly
ssh contabo-vps "curl http://localhost:11434/api/tags"

# 4. Test health endpoint
curl https://chat.cuttingedge.cihconsultingllc.com/api/health
```

**Common Fixes**:
- Restart handoff-api: `ssh contabo-vps "docker restart cutting-edge-handoff-api"`
- Restart Ollama: `ssh contabo-vps "docker restart ollama"`
- Check .env configuration for correct API URLs

---

### If Browser Console Shows Errors

**Common Error Patterns**:

**CORS Error**:
```
Access to fetch at '...' has been blocked by CORS policy
```
**Fix**: Check nginx CORS configuration, add proper headers

**Failed to Fetch**:
```
TypeError: Failed to fetch
```
**Fix**: Check API is running, verify URL is correct, check network connectivity

**WebSocket Error**:
```
WebSocket connection to 'wss://...' failed
```
**Fix**: Check WebSocket proxy configuration in nginx, verify backend supports WebSocket

**localhost Reference**:
```
GET http://localhost:3000/... net::ERR_CONNECTION_REFUSED
```
**Fix**: Update .env.production to use relative URL `/api` instead of `http://localhost:3000`

---

## 📱 SCREENSHOT CHECKLIST

**Required Screenshots**:
1. Main website with "Need Help" button visible
2. Modal after clicking button (full modal)
3. Chat interface loaded (before sending messages)
4. Browser Console tab (showing no errors or listing errors)
5. Network tab (showing successful requests or failures)
6. After sending first test message
7. After sending second test message
8. Full conversation history
9. Any error states (if crashes occur)
10. Mobile view (if testing mobile)

**Screenshot Format**:
- PNG format preferred
- Include full browser window
- Capture URL bar
- Capture DevTools if showing errors
- Name files descriptively: `step1-main-site.png`, `step5-console-errors.png`

---

## 📝 REPORTING FORMAT

**When reporting test results, include**:

1. **Executive Summary**
   - Overall status (PASS/FAIL)
   - Number of critical issues found
   - Browser(s) tested
   - Date/time of test

2. **Detailed Findings**
   - Each failed step documented
   - Screenshots attached
   - Console errors copied
   - Network failures listed

3. **Performance Metrics**
   - Response times
   - Load times
   - Error rates

4. **Recommendations**
   - Priority fixes needed
   - Follow-up testing required
   - Additional testing suggested

---

## 🚀 QUICK REFERENCE COMMANDS

**For AI Agents Running This Test Protocol**:

```bash
# Check all services
ssh contabo-vps "docker ps | grep cutting-edge"

# Check logs
ssh contabo-vps "docker logs cutting-edge-handoff-api --tail 50"
ssh contabo-vps "docker logs cutting-edge_chatbot_1 --tail 50"

# Test health endpoint
curl https://chat.cuttingedge.cihconsultingllc.com/api/health

# Test chat endpoint
curl -X POST https://chat.cuttingedge.cihconsultingllc.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Restart services
ssh contabo-vps "cd /root/cutting-edge && docker-compose restart handoff-api chatbot"

# Check nginx
ssh contabo-vps "nginx -t && systemctl status nginx"
```

---

## ✅ SUCCESS CRITERIA

**Test is considered PASSING if**:
- ✅ All 10 steps complete without critical failures
- ✅ At least 3 successful message exchanges
- ✅ No browser crashes
- ✅ No console errors (or only non-critical warnings)
- ✅ Response times under 30 seconds
- ✅ Works on at least 2 major browsers

**Test is FAILING if**:
- ❌ Any step results in browser crash
- ❌ Messages fail to send/receive
- ❌ Console shows critical errors
- ❌ Response times exceed 60 seconds
- ❌ Navigation redirects fail

---

## 📚 RELATED DOCUMENTATION

- **Fix Report**: `/Users/jhazy/AI_Projects/Cutting Edge/OLLAMA_FIX_SUCCESS_REPORT.md`
- **Master Tracker**: `/Users/jhazy/AI_Projects/Cutting Edge/MASTER_TASK_TRACKER.md`
- **Chatbot Docs**: `/Users/jhazy/AI_Projects/Cutting Edge/docs/chatbot/`
- **Deployment Docs**: `/Users/jhazy/AI_Projects/Cutting Edge/docs/deployment/`

---

**Last Updated**: 2026-02-12 00:30:00 EST
**Status**: Ready for Execution
**Next Review**: After test completion

---

*This testing protocol is designed to systematically verify all aspects of the chatbot functionality, from the main website button through to actual AI responses. Follow each step carefully and document any deviations from expected behavior.*
