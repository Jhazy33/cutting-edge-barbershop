# Quick Start: Running Feedback API Tests

## One-Line Test Execution

```bash
cd services/handoff-api && npm install && npm test
```

## Step-by-Step Guide

### 1. Install Dependencies

```bash
cd services/handoff-api
npm install
```

This installs:
- `vitest@^1.0.0` - Test framework
- `@vitest/coverage-v8@^1.0.0` - Coverage reporting

### 2. Configure Environment

Create `.env` file if not exists:

```bash
# Example .env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

### 3. Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### 4. View Results

**Console Output**:
```
✓ POST /api/feedback/rating (25)
✓ POST /api/feedback/correction (20)
✓ POST /api/feedback/voice-correction (18)
✓ GET /api/feedback/pending (12)
✓ POST /api/feedback/approve (10)
✓ Integration Tests (6)
✓ Performance Tests (2)
✓ Security Tests (10)

Test Files  1 passed (1)
     Tests  80+ passed (80+)
  Start at  10:30:00
  Duration  2.5s
```

**Coverage Report** (if using `npm run test:coverage`):
```
-----------|---------|----------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------|---------|----------|---------|---------|-------------------
All files  |   95.2  |    92.1  |   96.5  |   95.8  |
 index.ts  |   98.5  |    95.0  |  100.0  |   98.5  |
 feedback...|   94.8  |    90.2  |   95.0  |   94.5  | 145-148
-----------|---------|----------|---------|---------|-------------------
```

## Common Commands

```bash
# Run specific test file
npx vitest tests/feedback-api.test.ts

# Run specific test suite
npx vitest -t "POST /api/feedback/rating"

# Run tests matching pattern
npx vitest -t "should reject"

# Run with verbose output
npx vitest --verbose

# Run with UI mode (requires @vitest/ui)
npx vitest --ui
```

## Troubleshooting

### "Cannot find module 'vitest'"
```bash
npm install
```

### "Database connection error"
```bash
# Check PostgreSQL is running
pg_isready

# Check your .env file
cat .env
```

### Tests timeout
```bash
# Increase timeout in vitest.config.ts
testTimeout: 30000,  # 30 seconds
```

### Port already in use
```bash
# Change port in .env
PORT=3001
```

## Test Structure Overview

```
tests/
├── feedback-api.test.ts    # Main test suite (80+ tests)
├── setup.ts                # DB helpers (cleanup, insert, verify)
├── test-data.ts            # Test fixtures (valid/invalid data)
└── README.md              # Detailed guide
```

## What Gets Tested

| Endpoint | Tests | Coverage |
|----------|-------|----------|
| POST /api/feedback/rating | 25 | Success, validation, triggers, errors |
| POST /api/feedback/correction | 20 | All priorities, auto-approval, DB triggers |
| POST /api/feedback/voice-correction | 18 | Sentiments, entities, confidence scores |
| GET /api/feedback/pending | 12 | Filtering, pagination, validation |
| POST /api/feedback/approve | 10 | Approve/reject workflow |
| Integration | 6 | End-to-end workflows |
| Performance | 2 | Response time thresholds |
| Security | 10+ | SQL injection, XSS, input sanitization |

## Expected Results

### All Tests Pass
```
✓ 80+ tests passed
✓ Coverage: 95%+
✓ Duration: < 10s
```

### Coverage Report
```
Statement Coverage: 95%+
Branch Coverage: 90%+
Function Coverage: 95%+
Line Coverage: 95%+
```

## Next Steps

1. ✅ Run `npm install`
2. ✅ Run `npm test`
3. ✅ Review results
4. ✅ Check coverage: `npm run test:coverage`
5. ✅ Fix any failures
6. ✅ Commit test code

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests
  run: |
    cd services/handoff-api
    npm install
    npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Support

- **Detailed Guide**: `tests/README.md`
- **Test Summary**: `tests/TEST_SUMMARY.md`
- **API Docs**: `docs/FEEDBACK_API.md`
- **Vitest Docs**: https://vitest.dev/

---

**Last Updated**: 2025-02-09
**Framework**: Vitest 1.0.0
**Node**: 20+
