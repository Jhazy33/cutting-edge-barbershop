# Penetration Testing Suite - README

**Project**: Phase 2.5 Learning System - P1 Security Fixes
**Version**: 1.0
**Last Updated**: 2026-02-09

---

## Overview

This directory contains comprehensive penetration testing suites for validating the security of the Phase 2.5 Learning System. The tests simulate **65 aggressive attack scenarios** across 5 categories to verify the effectiveness of P1 security fixes (RBAC and Input Validation).

**⚠️ IMPORTANT**: These are WHITE HAT security tests. All attacks are simulated in a controlled environment to identify vulnerabilities before malicious actors can exploit them.

---

## Test Suites

### 1. SQL Injection Attacks (`sql-injection-attacks.test.ts`)

**Scenarios**: 20 attacks
**Categories**:
- Classic SQL Injection (5 attacks)
- Advanced SQL Injection (5 attacks)
- NoSQL/JSON Injection (5 attacks)
- File-Based Attacks (5 attacks)

**Tests**:
- Tautology attacks
- Union-based extraction
- Batch statement injection
- Time-based blind injection
- Second-order injection
- NoSQL operator injection
- Prototype pollution
- Path traversal
- Command injection

**Run**:
```bash
npm test -- sql-injection-attacks.test.ts
```

---

### 2. Privilege Escalation Attacks (`privilege-escalation-attacks.test.ts`)

**Scenarios**: 15 attacks
**Categories**:
- Role Manipulation (5 attacks)
- Permission Bypass (5 attacks)
- Data Access Violation (5 attacks)

**Tests**:
- SET ROLE escalation
- Session authorization bypass
- CREATE/ALTER/DROP ROLE
- GRANT/REVOKE operations
- DDL restrictions
- Row-Level Security (RLS) bypass
- Function security definer bypass
- Information schema access

**Run**:
```bash
npm test -- privilege-escalation-attacks.test.ts
```

---

### 3. Authentication Bypass Attacks (`auth-bypass-attacks.test.ts`)

**Scenarios**: 10 attacks
**Categories**:
- Authentication Weakness (5 attacks)
- Session Hijacking (5 attacks)

**Tests**:
- Empty/null passwords
- SQL injection in username
- Brute force attacks
- Connection flooding
- Session fixation
- Token manipulation
- Session forgery
- Expired session reuse

**Run**:
```bash
npm test -- auth-bypass-attacks.test.ts
```

---

### 4. Denial of Service Attacks (`dos-attacks.test.ts`)

**Scenarios**: 10 attacks
**Categories**:
- Resource Exhaustion (5 attacks)
- Computational Abuse (5 attacks)

**Tests**:
- Massive text insertion (100MB+)
- Deep recursion attacks
- Cartesian product attacks
- Lock starvation
- Long-running transactions
- Regex DoS (ReDoS)
- JSON bombs
- Hash collision attacks
- Memory exhaustion

**Run**:
```bash
npm test -- dos-attacks.test.ts
```

---

### 5. Data Exfiltration Attacks (`data-exfiltration-attacks.test.ts`)

**Scenarios**: 10 attacks
**Categories**:
- Direct Data Access (5 attacks)
- Side Channel Attacks (5 attacks)

**Tests**:
- Table enumeration
- Sensitive table access
- Cross-tenant data access
- Error message extraction
- UNION-based password extraction
- Timing-based exfiltration
- Out-of-band (OOB) exfiltration
- DNS exfiltration
- HTTP header leakage
- Response size analysis

**Run**:
```bash
npm test -- data-exfiltration-attacks.test.ts
```

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure Vitest is installed
npm install -D vitest @vitest/coverage-v8
```

### Running All Tests

```bash
# Run all penetration tests
npm test -- security/penetration-tests/

# Run with coverage
npm run test:coverage -- security/penetration-tests/

# Run in watch mode (development)
npm run test:watch -- security/penetration-tests/
```

### Running Specific Test Suites

```bash
# SQL Injection tests only
npm test -- sql-injection-attacks.test.ts

# Privilege Escalation tests only
npm test -- privilege-escalation-attacks.test.ts

# Authentication Bypass tests only
npm test -- auth-bypass-attacks.test.ts

# DoS tests only
npm test -- dos-attacks.test.ts

# Data Exfiltration tests only
npm test -- data-exfiltration-attacks.test.ts
```

---

## Interpreting Results

### Success Criteria

Each test suite validates that attacks are **BLOCKED** or **MITIGATED**:

```
✅ PASS: Attack blocked by security controls
❌ FAIL: Attack succeeded (vulnerability found!)
⚠️  WARN: Attack partially mitigated
```

### Expected Pass Rates

- **SQL Injection**: 20/20 blocked (100%)
- **Privilege Escalation**: 15/15 blocked (100%)
- **Authentication Bypass**: 10/10 blocked (100%)
- **DoS**: 8-10/10 mitigated (80-100%)
- **Data Exfiltration**: 10/10 blocked (100%)

### What to Do if Tests Fail

1. **Review the failure message** - Identify which attack succeeded
2. **Check the category** - CRITICAL failures require immediate attention
3. **Review code** - Find the vulnerability in the implementation
4. **Implement fix** - Apply appropriate security controls
5. **Re-test** - Verify the fix blocks the attack
6. **Document** - Update security documentation

---

## Test Architecture

### Mock vs Real Testing

**Current Implementation**: Uses mock database connections for safe testing.

**Production Testing**: To test against real database:

```typescript
// Replace mock connection with real connection
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'test_db',
  user: 'test_user',
  password: 'test_password'
});

async function executeQuery(sql: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { success: true, rows: result.rows };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    client.release();
  }
}
```

### Test Data

Tests use controlled test data that doesn't impact production:

```typescript
const TEST_SHOP_ID = 999;
const TEST_CONVERSATION_ID = '99999999-9999-9999-9999-999999999999';
```

---

## Security Coverage

### CWE Coverage

The test suite covers the following Common Weakness Enumerations (CWEs):

| CWE ID | Description | Coverage |
|--------|-------------|----------|
| CWE-89 | SQL Injection | ✅ Complete |
| CWE-269 | Improper Privilege Management | ✅ Complete |
| CWE-285 | Improper Authorization | ✅ Complete |
| CWE-521 | Weak Password Requirements | ✅ Complete |
| CWE-307 | Improper Restriction of Authentication | ✅ Complete |
| CWE-770 | Resource Allocation Without Limits | ✅ Complete |
| CWE-200 | Exposure of Sensitive Information | ✅ Complete |
| CWE-209 | Information Exposure via Error Messages | ✅ Complete |
| CWE-89 | SQL Injection (Advanced) | ✅ Complete |
| CWE-918 | Server-Side Request Forgery (SSRF) | ✅ Complete |
| CWE-1333 | Inefficient Regex Complexity | ✅ Complete |
| CWE-502 | Deserialization of Untrusted Data | ✅ Complete |
| CWE-833 | Lock Starvation | ✅ Complete |

### OWASP Top 10:2025 Coverage

| OWASP Category | Test Coverage |
|----------------|---------------|
| A01: Broken Access Control | ✅ Privilege Escalation, Data Exfiltration |
| A02: Security Misconfiguration | ✅ All categories |
| A03: Software Supply Chain | ⚠️  Not in scope (requires dependency scanning) |
| A04: Cryptographic Failures | ✅ Session management tests |
| A05: Injection | ✅ SQL Injection (20 scenarios) |
| A06: Insecure Design | ✅ Architecture tests |
| A07: Authentication Failures | ✅ Authentication Bypass (10 scenarios) |
| A08: Integrity Failures | ✅ Data validation tests |
| A09: Logging & Alerting | ⚠️  Partial (requires monitoring tests) |
| A10: Exceptional Conditions | ✅ DoS tests |

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Penetration Tests

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  penetration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run penetration tests
        run: npm test -- security/penetration-tests/
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: penetration-test-results
          path: coverage/
```

---

## Best Practices

### Before Running Tests

1. **Use Test Database** - Never run against production
2. **Backup Data** - Ensure test data is backed up
3. **Isolate Environment** - Use separate test environment
4. **Review Tests** - Understand what each test does

### During Testing

1. **Monitor Resources** - Watch CPU/memory during DoS tests
2. **Check Logs** - Review database logs for suspicious activity
3. **Document Findings** - Record any vulnerabilities discovered
4. **Stop If Issues** - Halt testing if critical issues found

### After Testing

1. **Review Results** - Analyze all test outputs
2. **Fix Vulnerabilities** - Patch any discovered issues
3. **Re-test** - Verify fixes are effective
4. **Update Documentation** - Document all changes
5. **Report Findings** - Share results with team

---

## Troubleshooting

### Common Issues

**Issue**: Tests timeout during DoS scenarios
**Solution**: Increase test timeout in vitest.config.js:
```javascript
testTimeout: 60000  // 60 seconds
```

**Issue**: Database connection errors
**Solution**: Verify DATABASE_URL and test database is running:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

**Issue**: Tests pass but should fail
**Solution**: Verify mock implementations match real database behavior

**Issue**: False positives
**Solution**: Review test data and adjust assertions

---

## Contributing

### Adding New Attack Scenarios

1. **Identify Threat Model** - What attack are you testing?
2. **Choose Category** - Which test suite does it belong to?
3. **Write Test** - Follow existing test patterns
4. **Document** - Add description and CWE reference
5. **Test** - Verify attack is properly detected
6. **Submit PR** - Include test results

### Test Template

```typescript
const newAttack: AttackScenario = {
  name: 'CATEGORY - Attack Name',
  category: 'Category Name',
  payload: 'attack-payload-here',
  expected: 'BLOCKED',
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
  description: 'Detailed description of the attack',
  cwe: 'CWE-XXX'
};
```

---

## Additional Resources

### Documentation

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

### Tools

- [Vitest](https://vitest.dev/) - Test runner
- [SQLMap](http://sqlmap.org/) - SQL injection testing
- [Metasploit](https://www.metasploit.com/) - Penetration testing framework

### Training

- [OWASP WebGoat](https://owasp.org/www-project-webgoat/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

---

## Support

For questions or issues with the penetration testing suite:

1. Review this README
2. Check the main project documentation
3. Open an issue in the project repository
4. Contact the security team

---

**Version**: 1.0
**Last Updated**: 2026-02-09
**Maintainer**: Security Auditor Agent

*Remember: These tests are for defensive security purposes only. Always obtain proper authorization before conducting penetration testing.*
