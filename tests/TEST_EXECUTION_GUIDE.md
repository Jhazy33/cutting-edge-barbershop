# VPS Chatbot Integration - Test Execution Guide

## Overview
This guide provides step-by-step instructions for executing the complete test suite for the VPS Chatbot Integration deployment.

## Prerequisites

### Required Tools
- Bash shell (macOS/Linux)
- curl (HTTP client)
- bc (calculator for benchmarks)
- Modern web browser (Chrome/Firefox/Safari)
- SSH access to VPS (for database tests)

### Optional Tools
- jq (JSON parser for API testing)
- PostgreSQL client (psql)

## Test Suite Structure

```
tests/
├── vps-chatbot-test-suite.sh          # Automated integration tests
├── performance-benchmark.sh            # Performance benchmarks
├── MANUAL_TEST_CHECKLIST.md           # Manual testing checklist
└── TEST_EXECUTION_GUIDE.md            # This file
```

---

## Phase 1: Automated Tests

### 1.1 Pre-Flight Checks

Before running tests, verify all services are accessible:

```bash
# Check main website
curl -I https://cuttingedge.cihconsultingllc.com

# Check chatbot UI
curl -I https://chat.cuttingedge.cihconsultingllc.com

# Check RAG API
curl -I https://api.cihconsultingllc.com/api/health

# Check Ollama API
curl -H "X-Ollama-Key: CE_AGENT_2026_SECRET" \
  https://ai.cihconsultingllc.com/api/tags
```

**Expected Results:**
- All endpoints return HTTP 200
- Ollama API returns JSON with model list including "gemma:2b"

### 1.2 Run Automated Test Suite

Execute the automated test suite:

```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge
./tests/vps-chatbot-test-suite.sh
```

**What It Tests:**
1. Main website accessibility and content
2. Chatbot UI availability and elements
3. API health endpoints
4. RAG knowledge search functionality
5. CORS configuration
6. Security headers and HTTPS enforcement
7. Performance metrics (load times)
8. Ollama API authentication

**Expected Output:**
```
==========================================
VPS Chatbot Integration - Test Suite
==========================================
Starting tests at [date]

[TEST] Main website loads
[PASS] Main website loads - HTTP 200

...

==========================================
Test Summary
==========================================
Total Tests: 14
Passed: 12
Failed: 0
Warnings: 2

Pass Rate: 85%

✓ Deployment is HEALTHY
```

### 1.3 Interpret Automated Test Results

**Pass Rate ≥ 80%**: Deployment is HEALTHY
- Minor warnings acceptable
- Proceed to manual testing

**Pass Rate 50-79%**: Deployment has ISSUES
- Review failed tests
- Fix critical issues before proceeding

**Pass Rate < 50%**: Deployment is CRITICAL
- Major failures detected
- Do not proceed to manual testing

---

## Phase 2: Performance Benchmarks

### 2.1 Run Performance Benchmarks

Execute the performance benchmark script:

```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge
./tests/performance-benchmark.sh
```

**What It Measures:**
1. DNS lookup times
2. TCP connection times
3. TLS/SSL handshake times
4. Server processing times
5. Content download times
6. API response times (with min/max/avg)
7. Response sizes
8. Performance target compliance

**Expected Output:**
```
==========================================
Main Website Performance
==========================================
[INFO] DNS lookup time for cuttingedge.cihconsultingllc.com
  DNS Lookup: 45ms
  TCP Connection: 23ms
  TLS Handshake: 67ms
  Server Processing: 234ms
  Content Download: 12ms

Main Site Load Time: 450ms (average of 5 requests)
Main Site Response Size: 125KB

...

==========================================
Performance Targets Assessment
==========================================

Performance Targets vs Actual:

Main Site Load Time (< 3000ms): PASS (450ms)
Chatbot Load Time (< 2000ms): PASS (380ms)
API Response Time (< 500ms): PASS (125ms)
Knowledge Search (< 1000ms): PASS (340ms)
```

### 2.2 Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Main Site Load Time | < 3s | < 5s | ≥ 5s |
| Chatbot Load Time | < 2s | < 3s | ≥ 3s |
| API Response Time | < 500ms | < 1000ms | ≥ 1000ms |
| Knowledge Search | < 1000ms | < 2000ms | ≥ 2000ms |
| First Token Latency | < 2s | < 3s | ≥ 3s |

---

## Phase 3: Manual Testing

### 3.1 Prepare Manual Test Environment

1. Open `tests/MANUAL_TEST_CHECKLIST.md` in your editor or print it
2. Open a new browser window in incognito/private mode
3. Open browser DevTools (F12 or Cmd+Option+I)
4. Switch to Console tab to monitor for errors
5. Switch to Network tab to monitor API calls

### 3.2 Execute Manual Test Checklist

Follow the checklist in order:

**Section 1: Main Website Tests**
- Test homepage accessibility
- Test Digital Concierge modal
- Test navigation to chatbot

**Section 2: Chatbot UI Tests**
- Test initial load and appearance
- Test chat interface elements
- Test suggested questions

**Section 3: Chat Functionality Tests**
- Test basic chat flow
- Test network requests (critical!)
- Test knowledge base integration
- Test multiple conversations
- Test error handling

**Section 4: Database Tests**
- Test conversation storage
- Test feedback system (if implemented)

**Section 5: Performance Tests**
- Measure load times manually
- Measure response latency

**Section 6: Cross-Browser Tests**
- Test in Chrome/Edge
- Test in Firefox
- Test in Safari (if available)
- Test on mobile devices

**Section 7: Security Tests**
- Test HTTPS enforcement
- Test API authentication
- Test CORS configuration
- Test input validation

**Section 8: Edge Cases**
- Test empty input
- Test rapid messages
- Test session persistence

**Section 9: Accessibility Tests**
- Test keyboard navigation
- Test screen reader compatibility

**Section 10: Visual Regression Tests**
- Verify theme and styling
- Test responsive breakpoints

### 3.3 Document Test Results

As you complete each section:
- Check off completed items with [x]
- Record measurements in provided spaces
- Document any bugs or issues in Bug Report section
- Note any visual differences or inconsistencies

---

## Phase 4: Database Verification

### 4.1 Connect to Database

```bash
# SSH to VPS
ssh contabo-vps

# Connect to PostgreSQL in Docker
docker exec -it cutting-edge-cutting-edge-db-1 psql -U jhazy -d nexxt_db
```

### 4.2 Verify Conversation Storage

Run these queries to verify data is being saved:

```sql
-- Check recent conversations
SELECT id, user_id, summary, created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 5;

-- Count total conversations
SELECT COUNT(*) FROM conversations;

-- Check conversation messages
SELECT id, conversation_id, role, content
FROM conversation_messages
ORDER BY created_at DESC
LIMIT 10;

-- Check feedback (if submitted)
SELECT * FROM conversation_feedback
ORDER BY created_at DESC
LIMIT 5;
```

### 4.3 Verify Knowledge Base

```sql
-- Check knowledge base entries
SELECT category, COUNT(*) as count
FROM knowledge_base
GROUP BY category;

-- Search for specific knowledge
SELECT content, category, similarity
FROM knowledge_base
WHERE content LIKE '%haircut%'
LIMIT 5;
```

---

## Phase 5: Security Verification

### 5.1 Check HTTPS Enforcement

```bash
# Test HTTP to HTTPS redirect
curl -I http://cuttingedge.cihconsultingllc.com
```

**Expected:** HTTP 301 redirect to HTTPS

### 5.2 Check SSL Certificate

```bash
# Check certificate details
curl -vI https://cuttingedge.cihconsultingllc.com 2>&1 | grep -A 10 "SSL certificate"
```

**Expected:** Valid certificate from Let's Encrypt or similar

### 5.3 Check API Authentication

```bash
# Test without auth key (should fail)
curl https://ai.cihconsultingllc.com/api/tags

# Test with auth key (should succeed)
curl -H "X-Ollama-Key: CE_AGENT_2026_SECRET" \
  https://ai.cihconsultingllc.com/api/tags
```

**Expected:**
- First request: 401/403 or error
- Second request: 200 with model list

### 5.4 Check CORS Headers

```bash
# Test CORS preflight
curl -I -X OPTIONS https://chat.cuttingedge.cihconsultingllc.com \
  -H "Origin: https://cuttingedge.cihconsultingllc.com" \
  -H "Access-Control-Request-Method: POST"
```

**Expected:** CORS headers present in response

---

## Phase 6: Production Readiness Assessment

### 6.1 Review Test Results

Compile results from all test phases:

**Automated Tests:**
- Pass Rate: _____%
- Critical Failures: _____
- Warnings: _____

**Performance Benchmarks:**
- Main Site Load Time: _____ms (Target: < 3000ms)
- Chatbot Load Time: _____ms (Target: < 2000ms)
- API Response Time: _____ms (Target: < 500ms)
- Knowledge Search: _____ms (Target: < 1000ms)

**Manual Tests:**
- Total Tests: _____
- Passed: _____
- Failed: _____

**Cross-Browser Tests:**
- Chrome/Edge: PASS / FAIL
- Firefox: PASS / FAIL
- Safari: PASS / FAIL
- Mobile: PASS / FAIL

**Security Tests:**
- HTTPS: PASS / FAIL
- API Auth: PASS / FAIL
- CORS: PASS / FAIL
- Input Validation: PASS / FAIL

### 6.2 Production Readiness Criteria

**Ready for Production (YES):**
- Automated test pass rate ≥ 80%
- No critical security vulnerabilities
- All performance targets met
- Manual tests pass ≥ 90%
- Cross-browser compatibility verified

**Conditional Deployment (CONDITIONAL):**
- Automated test pass rate 60-79%
- Minor security issues (non-critical)
- Some performance targets missed (< 20% over)
- Manual tests pass 70-89%
- Known workarounds for issues

**Not Ready (NO):**
- Automated test pass rate < 60%
- Critical security vulnerabilities
- Major performance issues (> 20% over targets)
- Manual tests pass < 70%
- Critical functionality broken

### 6.3 Sign-Off

Complete the sign-off section in `MANUAL_TEST_CHECKLIST.md`:

- Tester Name: _______________
- Test Date: _______________
- Test Duration: _______________
- Browser(s) Tested: _______________
- Overall Status: PASS / FAIL / CONDITIONAL
- Signature: _______________

---

## Troubleshooting

### Common Issues

**Issue: Tests fail with "Connection refused"**
- Cause: Services not running
- Fix: Check PM2 status on VPS: `ssh contabo-vps 'pm2 status'`

**Issue: API returns 401/403 errors**
- Cause: Missing or incorrect API key
- Fix: Verify X-Ollama-Key header is set correctly

**Issue: Chatbot loads but can't send messages**
- Cause: CORS or network issue
- Fix: Check browser console for specific errors

**Issue: Database tests fail**
- Cause: Database container not running or wrong credentials
- Fix: Check Docker status and connection string

### Getting Help

If tests fail and you can't resolve the issue:

1. Check the test output logs
2. Review error messages in browser console
3. Check service logs: `ssh contabo-vps 'pm2 logs --err'`
4. Verify environment variables are set correctly

---

## Test Reports

After completing all tests, you will have:

1. **Automated Test Report**: `tests/test-results-YYYYMMDD_HHMMSS.txt`
2. **Performance Benchmark Report**: `tests/benchmark-results-YYYYMMDD_HHMMSS.txt`
3. **Manual Test Checklist**: `tests/MANUAL_TEST_CHECKLIST.md` (filled out)

Archive these reports for future reference and regression testing.

---

## Next Steps

After successful testing:

1. Deploy to production (if not already live)
2. Monitor logs for any issues
3. Set up automated monitoring (if available)
4. Schedule periodic regression tests
5. Document any known issues or limitations

---

## Quick Reference

### Run All Tests
```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge
./tests/vps-chatbot-test-suite.sh
./tests/performance-benchmark.sh
# Then complete manual checklist
```

### Check Service Status
```bash
ssh contabo-vps 'pm2 status'
```

### View Logs
```bash
ssh contabo-vps 'pm2 logs --err'
```

### Database Access
```bash
ssh contabo-vps 'docker exec -it cutting-edge-cutting-edge-db-1 psql -U jhazy -d nexxt_db'
```

---

**Last Updated**: 2026-02-10
**Test Suite Version**: 1.0
**Maintained By**: QA Test Engineer
