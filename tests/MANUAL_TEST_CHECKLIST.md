# VPS Chatbot Integration - Manual Test Checklist

## Test Environment
- **Main Website**: https://cuttingedge.cihconsultingllc.com
- **Chatbot UI**: https://chat.cuttingedge.cihconsultingllc.com
- **RAG API**: https://api.cihconsultingllc.com
- **Ollama API**: https://ai.cihconsultingllc.com
- **Test Date**: _______________
- **Tester**: _______________
- **Browser/Version**: _______________

---

## 1. Main Website Tests

### 1.1 Homepage Accessibility
- [ ] Navigate to https://cuttingedge.cihconsultingllc.com
- [ ] Verify page loads completely (< 3 seconds)
- [ ] Verify no console errors in DevTools
- [ ] Verify SSL certificate is valid (HTTPS)
- [ ] Verify responsive design on mobile viewport

### 1.2 Digital Concierge Modal
- [ ] Locate and click "Need Help" button
- [ ] Verify modal appears with overlay
- [ ] Verify modal title is "Digital Client"
- [ ] Verify Chat Mode description is "Text with our 24/7 Digital Assistant"
- [ ] Verify Close button works
- [ ] Verify clicking overlay closes modal

### 1.3 Navigation to Chatbot
- [ ] Click Chat Mode link in modal
- [ ] Verify redirects to https://chat.cuttingedge.cihconsultingllc.com
- [ ] Verify new page loads completely

---

## 2. Chatbot UI Tests

### 2.1 Initial Load
- [ ] Verify chatbot loads at https://chat.cuttingedge.cihconsultingllc.com
- [ ] Verify page title is "Digital Concierge" or similar
- [ ] Verify "Sovereign AI • Local Ollama" badge is visible
- [ ] Verify "Secure Link" status indicator shows green
- [ ] Verify placeholder questions are displayed
- [ ] Verify page has Sky/Slate color theme

### 2.2 Chat Interface
- [ ] Verify message input field is present
- [ ] Verify send button is present and disabled when input is empty
- [ ] Verify send button enables when text is entered
- [ ] Verify Shift+Enter creates new line (doesn't send)
- [ ] Verify Enter sends message

### 2.3 Suggested Questions
- [ ] Click on "What services do you offer?" suggestion
- [ ] Verify text populates input field
- [ ] Verify message is sent to chat
- [ ] Verify response is generated

---

## 3. Chat Functionality Tests

### 3.1 Basic Chat Flow
- [ ] Send message: "What are your hours?"
- [ ] Verify user message appears in chat
- [ ] Verify "Analyzing..." loading indicator appears
- [ ] Verify assistant response is generated
- [ ] Verify response is relevant to question
- [ ] Verify response appears with streaming effect

### 3.2 Network Requests (Check DevTools Network Tab)
- [ ] Verify POST request to `https://api.cihconsultingllc.com/api/knowledge/search`
- [ ] Verify request body includes: query, shopId, limit, threshold
- [ ] Verify response includes search results
- [ ] Verify POST request to `https://ai.cihconsultingllc.com/api/chat`
- [ ] Verify request includes X-Ollama-Key header
- [ ] Verify request includes model: "gemma:2b"
- [ ] Verify response uses streaming (multiple chunks)

### 3.3 Knowledge Base Integration
- [ ] Send message: "How much is a haircut?"
- [ ] Verify response includes pricing information
- [ ] If sources are available, verify they are displayed
- [ ] Verify response is accurate based on knowledge base

### 3.4 Multiple Conversations
- [ ] Send 3-4 different questions
- [ ] Verify all messages appear in correct order
- [ ] Verify conversation history persists
- [ ] Verify scroll automatically goes to latest message

### 3.5 Error Handling
- [ ] Disconnect internet connection
- [ ] Send a message
- [ ] Verify error message is displayed
- [ ] Reconnect internet
- [ ] Verify chat still works

---

## 4. Database & Learning System Tests

### 4.1 Conversation Storage
- [ ] Complete a conversation with 2-3 messages
- [ ] SSH to VPS: `ssh contabo-vps`
- [ ] Connect to database: `docker exec -it cutting-edge-cutting-edge-db-1 psql -U jhazy -d nexxt_db`
- [ ] Run query: `SELECT id, user_id, summary, created_at FROM conversations ORDER BY created_at DESC LIMIT 5;`
- [ ] Verify new conversation is saved

### 4.2 Feedback System (if implemented)
- [ ] Look for thumbs up/down buttons after response
- [ ] Click thumbs up
- [ ] Verify feedback is recorded in database
- [ ] Run query: `SELECT * FROM conversation_feedback ORDER BY created_at DESC LIMIT 5;`

---

## 5. Performance Tests

### 5.1 Load Times
- [ ] Clear browser cache
- [ ] Navigate to main site
- [ ] Measure time to interactive: __________ seconds
- [ ] Navigate to chatbot
- [ ] Measure time to interactive: __________ seconds

### 5.2 Response Latency
- [ ] Send first message
- [ ] Measure time to first token: __________ seconds
- [ ] Measure time to complete response: __________ seconds
- [ ] Send second message
- [ ] Measure time to first token: __________ seconds
- [ ] Measure time to complete response: __________ seconds

---

## 6. Cross-Browser Tests

### 6.1 Chrome/Edge
- [ ] Repeat tests 1-5 in Chrome
- [ ] Verify all functionality works
- [ ] Note any visual differences: __________

### 6.2 Firefox
- [ ] Repeat tests 1-5 in Firefox
- [ ] Verify all functionality works
- [ ] Note any visual differences: __________

### 6.3 Safari (if on Mac)
- [ ] Repeat tests 1-5 in Safari
- [ ] Verify all functionality works
- [ ] Note any visual differences: __________

### 6.4 Mobile Safari (iOS)
- [ ] Open chatbot on iPhone
- [ ] Verify responsive layout
- [ ] Verify keyboard doesn't hide input
- [ ] Verify chat is usable on mobile

### 6.5 Mobile Chrome (Android)
- [ ] Open chatbot on Android phone
- [ ] Verify responsive layout
- [ ] Verify keyboard doesn't hide input
- [ ] Verify chat is usable on mobile

---

## 7. Security Tests

### 7.1 HTTPS Enforcement
- [ ] Try accessing http://cuttingedge.cihconsultingllc.com
- [ ] Verify redirect to https://

### 7.2 API Authentication
- [ ] Open DevTools Console
- [ ] Try fetching without auth key:
  ```javascript
  fetch('https://ai.cihconsultingllc.com/api/tags')
    .then(r => r.json())
    .then(console.log)
  ```
- [ ] Verify request is denied or returns error

### 7.3 CORS Configuration
- [ ] Open DevTools Console
- [ ] Try cross-origin request from different domain
- [ ] Verify CORS errors are present (expected)

### 7.4 Input Validation
- [ ] Try sending very long message (10,000+ characters)
- [ ] Verify appropriate error or truncation
- [ ] Try sending special characters: `<script>alert('xss')</script>`
- [ ] Verify input is sanitized (no alert appears)

---

## 8. Edge Cases

### 8.1 Empty Input
- [ ] Try sending empty message
- [ ] Verify send button remains disabled
- [ ] Try sending only spaces
- [ ] Verify message is not sent

### 8.2 Rapid Messages
- [ ] Send 5 messages quickly in succession
- [ ] Verify all messages are processed
- [ ] Verify responses are in correct order

### 8.3 Session Persistence
- [ ] Send a message
- [ ] Refresh page
- [ ] Verify conversation is lost (expected for now)
- [ ] Note: Session persistence is planned for future

---

## 9. Accessibility Tests

### 9.1 Keyboard Navigation
- [ ] Navigate using Tab key
- [ ] Verify focus indicators are visible
- [ ] Verify Enter sends message
- [ ] Verify Shift+Enter creates new line

### 9.2 Screen Reader (basic check)
- [ ] Enable VoiceOver (Mac) or NVDA (Windows)
- [ ] Navigate to chatbot
- [ ] Verify input field has proper label
- [ ] Verify messages are announced

---

## 10. Visual Regression Tests

### 10.1 Theme Verification
- [ ] Verify dark theme (slate-950 background)
- [ ] Verify accent colors (sky-400, sky-500)
- [ ] Verify proper contrast ratios
- [ ] Verify glass morphism effects
- [ ] Verify gradient backgrounds

### 10.2 Responsive Breakpoints
- [ ] Test at 1920x1080 (desktop)
- [ ] Test at 768x1024 (tablet)
- [ ] Test at 375x667 (mobile)
- [ ] Verify layout adapts correctly

---

## Bug Report

### Critical Issues (Blocker)
1. _____________________________
2. _____________________________

### High Priority Issues
1. _____________________________
2. _____________________________

### Medium Priority Issues
1. _____________________________
2. _____________________________

### Low Priority Issues
1. _____________________________
2. _____________________________

---

## Overall Assessment

### Production Readiness
- [ ] **YES** - Ready for production deployment
- [ ] **NO** - Critical issues must be fixed
- [ ] **CONDITIONAL** - Can deploy with known issues

### Confidence Score
Rate your confidence in the deployment (1-10): __________

### Recommendations
1. _____________________________
2. _____________________________
3. _____________________________

---

## Sign-Off

**Tester Name**: _______________
**Test Date**: _______________
**Test Duration**: _______________
**Browser(s) Tested**: _______________
**Overall Status**: PASS / FAIL / CONDITIONAL

**Signature**: _______________
