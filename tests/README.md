# VPS Chatbot Integration - Complete Test Suite

## Overview
Comprehensive testing suite for the VPS Chatbot Integration deployment, including automated tests, performance benchmarks, security audits, and manual testing checklists.

**Last Updated**: 2026-02-10
**Version**: 1.0
**Maintained By**: QA Test Engineer

---

## Test Suite Contents

### Automated Tests
1. **vps-chatbot-test-suite.sh** - Full integration test suite
   - Main website accessibility
   - Chatbot UI functionality
   - API health checks
   - RAG knowledge search
   - CORS configuration
   - Security headers
   - Performance metrics

2. **performance-benchmark.sh** - Performance benchmarks
   - DNS lookup times
   - TCP/TLS handshake times
   - Server processing times
   - API response times
   - Performance target compliance

3. **security-audit.sh** - Security vulnerability scan
   - HTTPS enforcement
   - Security headers
   - API authentication
   - CORS configuration
   - Input validation
   - Rate limiting
   - Sensitive data exposure
   - Information disclosure

### Manual Tests
4. **MANUAL_TEST_CHECKLIST.md** - Comprehensive manual testing guide
   - 10 test sections
   - 80+ individual test cases
   - Cross-browser testing
   - Mobile testing
   - Accessibility testing
   - Visual regression testing

### Documentation
5. **TEST_EXECUTION_GUIDE.md** - Step-by-step execution guide
6. **README.md** - This file

---

## Quick Start

### 1. Run All Automated Tests

```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge

# Run integration tests
./tests/vps-chatbot-test-suite.sh

# Run performance benchmarks
./tests/performance-benchmark.sh

# Run security audit
./tests/security-audit.sh
```

### 2. Complete Manual Testing

```bash
# Open manual checklist
open tests/MANUAL_TEST_CHECKLIST.md

# Or open in editor
code tests/MANUAL_TEST_CHECKLIST.md
```

Follow the checklist section by section, documenting results as you go.

---

## Test Execution Workflow

### Phase 1: Pre-Flight Checks (5 minutes)

Verify all services are accessible:

```bash
# Quick health checks
curl -I https://cuttingedge.cihconsultingllc.com
curl -I https://chat.cuttingedge.cihconsultingllc.com
curl -I https://api.cihconsultingllc.com/api/health
curl -H "X-Ollama-Key: CE_AGENT_2026_SECRET" \
  https://ai.cihconsultingllc.com/api/tags
```

**Expected**: All return HTTP 200, Ollama returns model list

### Phase 2: Automated Tests (15 minutes)

```bash
./tests/vps-chatbot-test-suite.sh
```

**Pass Criteria**: ≥ 80% pass rate

### Phase 3: Performance Benchmarks (10 minutes)

```bash
./tests/performance-benchmark.sh
```

**Pass Criteria**: All performance targets met

### Phase 4: Security Audit (10 minutes)

```bash
./tests/security-audit.sh
```

**Pass Criteria**: No critical security vulnerabilities

### Phase 5: Manual Testing (60-90 minutes)

Open `MANUAL_TEST_CHECKLIST.md` and complete:
- Section 1: Main Website Tests (10 min)
- Section 2: Chatbot UI Tests (10 min)
- Section 3: Chat Functionality Tests (20 min)
- Section 4: Database Tests (10 min)
- Section 5: Performance Tests (5 min)
- Section 6: Cross-Browser Tests (20 min)
- Section 7: Security Tests (10 min)
- Section 8: Edge Cases (5 min)
- Section 9: Accessibility Tests (5 min)
- Section 10: Visual Regression Tests (10 min)

---

## Test Results

### Automated Test Reports

After running tests, reports are saved to:

```
tests/
├── test-results-YYYYMMDD_HHMMSS.txt          # Integration test results
├── benchmark-results-YYYYMMDD_HHMMSS.txt     # Performance benchmarks
├── security-report-YYYYMMDD_HHMMSS.txt       # Security audit results
└── MANUAL_TEST_CHECKLIST.md                  # Manual test results (filled)
```

### Interpreting Results

**Integration Tests**:
- **PASS (≥80%)**: Deployment healthy, proceed to manual testing
- **CONDITIONAL (50-79%)**: Issues found, review and fix before proceeding
- **FAIL (<50%)**: Critical issues, do not proceed

**Performance Benchmarks**:
- **Target**: All metrics within target ranges
- **Acceptable**: Within 20% of target
- **Critical**: >20% over target

**Security Audit**:
- **Excellent (≥90%)**: Strong security posture
- **Good (70-89%)**: Minor improvements needed
- **Fair (50-69%)**: Improvements recommended
- **Poor (<50%)**: Immediate action required

**Manual Tests**:
- **PASS (≥90%)**: Ready for production
- **CONDITIONAL (70-89%)**: Can deploy with known issues
- **FAIL (<70%)**: Not ready for production

---

## Production Readiness Criteria

### Ready for Production (YES)

All of the following:
- [ ] Automated test pass rate ≥ 80%
- [ ] No critical security vulnerabilities
- [ ] All performance targets met (or within 20%)
- [ ] Manual test pass rate ≥ 90%
- [ ] Cross-browser compatibility verified
- [ ] No critical bugs

### Conditional Deployment (CONDITIONAL)

Meets most criteria with exceptions:
- [ ] Automated test pass rate 60-79%
- [ ] Minor security issues (non-critical)
- [ ] Some performance targets missed (< 20% over)
- [ ] Manual test pass rate 70-89%
- [ ] Known workarounds for issues
- [ ] Documented risks accepted

### Not Ready (NO)

Any of the following:
- [ ] Automated test pass rate < 60%
- [ ] Critical security vulnerabilities
- [ ] Major performance issues (> 20% over targets)
- [ ] Manual test pass rate < 70%
- [ ] Critical functionality broken
- [ ] Data loss or corruption

---

## Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Main Site Load Time | < 3s | < 5s | ≥ 5s |
| Chatbot Load Time | < 2s | < 3s | ≥ 3s |
| API Response Time | < 500ms | < 1000ms | ≥ 1000ms |
| Knowledge Search | < 1000ms | < 2000ms | ≥ 2000ms |
| First Token Latency | < 2s | < 3s | ≥ 3s |

---

## Security Checklist

### Critical Security Tests
- [ ] HTTPS enforced on all endpoints
- [ ] Valid SSL certificates
- [ ] API authentication required
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CORS properly configured
- [ ] No credentials in frontend code
- [ ] Error messages don't leak info
- [ ] Rate limiting configured

### Recommended Security Headers
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security (HSTS)
- [ ] Content-Security-Policy (CSP)
- [ ] X-XSS-Protection
- [ ] Referrer-Policy

---

## Troubleshooting

### Common Issues

**Tests fail with "Connection refused"**
```bash
# Check if services are running
ssh contabo-vps 'pm2 status'

# Restart services if needed
ssh contabo-vps 'pm2 restart all'
```

**API returns 401/403 errors**
```bash
# Verify API key is set correctly
grep -r "CE_AGENT_2026_SECRET" tests/

# Test API key manually
curl -H "X-Ollama-Key: CE_AGENT_2026_SECRET" \
  https://ai.cihconsultingllc.com/api/tags
```

**Database tests fail**
```bash
# Check database container
ssh contabo-vps 'docker ps | grep postgres'

# Connect to database
ssh contabo-vps 'docker exec -it cutting-edge-cutting-edge-db-1 psql -U jhazy -d nexxt_db'
```

**Chatbot can't send messages**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Verify API URLs are correct
5. Check CORS headers

---

## Continuous Testing

### Recommended Testing Schedule

**Daily** (Automated):
- Health check tests
- API endpoint tests
- Performance smoke tests

**Weekly** (Automated):
- Full integration test suite
- Performance benchmarks
- Security audit

**Monthly** (Manual):
- Full manual test checklist
- Cross-browser testing
- Mobile device testing
- Accessibility audit

**Quarterly**:
- Complete security audit
- Penetration testing
- Load testing
- Disaster recovery testing

### Setting Up Automated Tests

#### Cron Jobs (on VPS)

```bash
# Edit crontab
crontab -e

# Add daily health check (6 AM)
0 6 * * * /path/to/tests/vps-chatbot-test-suite.sh

# Add weekly performance test (Sunday 2 AM)
0 2 * * 0 /path/to/tests/performance-benchmark.sh

# Add weekly security audit (Sunday 4 AM)
0 4 * * 0 /path/to/tests/security-audit.sh
```

#### GitHub Actions (CI/CD)

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'  # Weekly

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Tests
        run: |
          chmod +x tests/vps-chatbot-test-suite.sh
          ./tests/vps-chatbot-test-suite.sh
```

---

## Support and Documentation

### Getting Help

1. **Review Test Output**: Check error messages and logs
2. **Check Service Logs**: `ssh contabo-vps 'pm2 logs --err'`
3. **Verify Configuration**: Check environment variables
4. **Consult Documentation**: Review project CLAUDE.md and TEST_EXECUTION_GUIDE.md

### Test Maintenance

**When to Update Tests**:
- New features added
- API endpoints changed
- Security requirements updated
- Performance targets adjusted
- Bug fixes implemented

**Version Control**:
- Commit test scripts with code changes
- Tag releases with test versions
- Maintain changelog for test updates
- Archive old test versions

---

## Test Team Responsibilities

### QA Test Engineer
- Maintain test suite
- Execute automated tests
- Coordinate manual testing
- Document test results
- Report bugs and issues
- Recommend improvements

### Development Team
- Fix reported bugs
- Address security vulnerabilities
- Optimize performance issues
- Implement missing features
- Review test recommendations

### DevOps Team
- Maintain test infrastructure
- Set up automated testing
- Monitor test results
- Deploy to production
- Handle incidents

---

## Glossary

- **RAG**: Retrieval-Augmented Generation (AI with knowledge base)
- **Ollama**: Local LLM runtime
- **CORS**: Cross-Origin Resource Sharing
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content-Security-Policy
- **XSS**: Cross-Site Scripting
- **SQLi**: SQL Injection

---

## Changelog

### Version 1.0 (2026-02-10)
- Initial test suite release
- Integration tests
- Performance benchmarks
- Security audit
- Manual test checklist
- Complete documentation

---

## License

This test suite is part of the Cutting Edge Barbershop project and follows the same license terms.

---

**Contact**: QA Test Engineer
**Last Updated**: 2026-02-10
**Version**: 1.0
