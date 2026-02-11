# P1 Security Test Suite

Comprehensive security test suite for Phase 2.5 Learning System P1 security fixes.

## Overview

This test suite validates **P1 (Priority 1) security fixes** for the handoff-api:
- **RBAC** (Role-Based Access Control)
- **Input Validation** (Length, Format, Range)
- **SQL Injection Prevention**
- **Privilege Escalation Prevention**
- **DoS (Denial of Service) Prevention**

## Test Statistics

- **Total Tests**: 105+
- **Test Files**: 7
- **Categories**: 6
- **Execution Time**: < 5 minutes

## Test Categories

### 1. RBAC Security Tests (20 tests)
**File**: `p1-rbac-security.test.ts`

Tests for role-based access control implementation:
- Role Permission Tests (10 tests)
  - Verify `app_reader` cannot INSERT/UPDATE/DELETE
  - Verify `app_writer` can INSERT/SELECT but not DELETE
  - Verify `app_admin` has full permissions
- Function Execution Tests (5 tests)
  - Verify functions execute with proper permissions
  - Verify SECURITY DEFINER functions work correctly
- Row-Level Security Tests (5 tests)
  - Verify users can only see their shop data
  - Verify RLS prevents cross-shop data access

### 2. Input Validation Tests (30 tests)
**File**: `p1-input-validation.test.ts`

Tests for input validation implementation:
- Length Validation Tests (10 tests)
  - Text field max length enforcement
  - Empty string handling
  - Unicode character handling
- Format Validation Tests (10 tests)
  - UUID format validation
  - ENUM validation (feedback_type, status, priority)
  - JSONB format validation
- Range Validation Tests (10 tests)
  - Rating range (1-5)
  - Confidence score range (0-100)
  - Shop ID positive integers

### 3. SQL Injection Prevention Tests (15 tests)
**File**: `p1-sql-injection.test.ts`

Tests for SQL injection prevention:
- Classic injection attempts (DROP TABLE, UNION, etc.)
- Parameterized query verification
- Stored procedure safety
- JSONB parameter safety
- Time-based blind SQL injection
- Second-order SQL injection

### 4. Privilege Escalation Prevention Tests (10 tests)
**File**: `p1-privilege-escalation.test.ts`

Tests for privilege escalation prevention:
- Cannot elevate own role with SET ROLE
- Cannot GRANT own permissions
- Cannot bypass RLS with functions
- Cannot modify system catalogs
- Horizontal privilege escalation prevention

### 5. DoS Prevention Tests (10 tests)
**File**: `p1-dos-prevention.test.ts`

Tests for denial of service prevention:
- Rejects oversized input
- Rate limiting
- Query timeout prevention
- Connection pool limits
- Memory exhaustion prevention
- Resource cleanup after errors

### 6. Security Integration Tests (10 tests)
**File**: `p1-security-integration.test.ts`

End-to-end security integration tests:
- Complete feedback flow with security
- Multi-layer security validation
- Transaction rollback integrity
- Concurrent access with security
- Security audit trail completeness

### 7. Security Performance Tests (10 tests)
**File**: `p1-security-performance.test.ts`

Performance benchmarks for security measures:
- RBAC overhead < 1ms per query
- Input validation < 5ms per insert
- 1000 inserts < 30 seconds
- Batch operations < 100ms for 100 records
- Concurrent access performance

## Installation

```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api
npm install
```

## Running Tests

### Run All Security Tests
```bash
npm test tests/security
```

### Run Specific Test File
```bash
npm test tests/security/p1-rbac-security.test.ts
```

### Run with Coverage
```bash
npm run test:coverage tests/security
```

### Run in Watch Mode
```bash
npm run test:watch tests/security
```

## Test Configuration

Tests use the following database configuration (from `.env`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
```

## Test Setup

### Before All Tests
- Connect to database
- Create test roles (app_reader, app_writer, app_admin)
- Grant test permissions
- Clean up existing test data

### Before Each Test
- Clean up test data from all tables
- Ensure clean state

### After All Tests
- Clean up test data
- Close database connections

## Test Roles

The test suite creates three test roles:

### app_reader
- Permissions: SELECT only
- Purpose: Read-only access
- Tests: Verify cannot INSERT/UPDATE/DELETE

### app_writer
- Permissions: SELECT, INSERT, UPDATE
- Purpose: Application user
- Tests: Verify cannot DELETE or GRANT

### app_admin
- Permissions: ALL PRIVILEGES
- Purpose: Administrative access
- Tests: Verify full permissions

## Test Data

All test data uses identifiable prefixes:
- Conversation IDs: `sec_test_*`
- User IDs: Negative integers (e.g., -1, -2)
- This allows easy cleanup without affecting production data

## Coverage Report

After running tests with coverage, view the report:
```bash
open coverage/index.html
```

## Expected Test Results

### All Tests Should Pass
```
✓ P1 RBAC Security Tests (20)
✓ P1 Input Validation Tests (30)
✓ P1 SQL Injection Prevention Tests (15)
✓ P1 Privilege Escalation Prevention Tests (10)
✓ P1 DoS Prevention Tests (10)
✓ P1 Security Integration Tests (10)
✓ P1 Security Performance Tests (10)

Total: 105 tests passed in < 5 minutes
```

## Troubleshooting

### Database Connection Failed
**Error**: `Connection refused` or `password authentication failed`

**Solution**:
1. Verify PostgreSQL is running
2. Check `.env` file credentials
3. Verify database exists

### Role Already Exists
**Error**: `role "app_reader" already exists`

**Solution**:
```sql
DROP ROLE IF EXISTS app_reader, app_writer, app_admin;
```

### Test Data Cleanup Failed
**Error**: `permission denied` during cleanup

**Solution**:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Tests Timeout
**Error**: Tests take too long or timeout

**Solution**:
1. Check database performance
2. Verify indexes are created
3. Check connection pool settings

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test tests/security
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: postgres
          DB_USER: postgres
          DB_PASSWORD: test_password
```

## Security Test Patterns

### Pattern 1: RBAC Testing
```typescript
test('app_reader cannot INSERT', async () => {
  await expect(async () => {
    await executeAsRole('app_reader',
      'INSERT INTO table (...) VALUES (...)'
    );
  }).rejects.toThrow(/permission denied/i);
});
```

### Pattern 2: Input Validation Testing
```typescript
test('Invalid input rejected', async () => {
  await expect(async () => {
    await insertTestFeedback({ rating: 6 });
  }).rejects.toThrow(/rating must be between/i);
});
```

### Pattern 3: SQL Injection Testing
```typescript
test('SQL injection blocked', async () => {
  const injection = "'; DROP TABLE table; --";
  await insertTestFeedback({ reason: injection });

  // Verify stored as text, not executed
  const result = await db.query(
    'SELECT * FROM table WHERE reason = $1',
    [injection]
  );
  expect(result.rows.length).toBe(1);
});
```

### Pattern 4: Performance Testing
```typescript
test('Operation completes quickly', async () => {
  const start = Date.now();
  await operation();
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(1000);
});
```

## Best Practices

### 1. Always Clean Up Test Data
```typescript
beforeEach(async () => {
  await cleanupTestData();
});
```

### 2. Use Parameterized Queries
```typescript
// Good
await db.query('SELECT * FROM table WHERE id = $1', [id]);

// Bad (vulnerable to SQL injection)
await db.query(`SELECT * FROM table WHERE id = '${id}'`);
```

### 3. Test Both Success and Failure Cases
```typescript
test('Valid input accepted', async () => {
  await expect(insertValidData()).resolves.not.toThrow();
});

test('Invalid input rejected', async () => {
  await expect(insertInvalidData()).rejects.toThrow();
});
```

### 4. Use Descriptive Test Names
```typescript
// Good
test('app_reader cannot INSERT into conversation_feedback', async () => {});

// Bad
test('test1', async () => {});
```

## Contributing

When adding new security tests:
1. Follow the existing test patterns
2. Add tests to the appropriate category
3. Update this README with new test descriptions
4. Ensure tests run in < 5 minutes total
5. Clean up all test data

## License

MIT

## Authors

- Security Test Suite (2026)
- Phase 2.5 Learning System

## Version History

- **v1.0.0** (2026-02-09): Initial P1 security test suite (105+ tests)

---

**Last Updated**: 2026-02-09
**Total Tests**: 105+
**Execution Time**: < 5 minutes
**Coverage**: P1 Security Fixes (RBAC, Input Validation, SQL Injection, Privilege Escalation, DoS)
