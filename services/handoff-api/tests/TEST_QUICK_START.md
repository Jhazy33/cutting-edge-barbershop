# Conversation Storage Tests - Quick Start Guide

## Prerequisites

### 1. Database Setup
Ensure PostgreSQL is running and configured in `.env`:

```bash
# Add to .env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Iverson1975Strong

# Or your actual database credentials
```

### 2. Install Dependencies
```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api
npm install
```

### 3. Run Database Migrations
```bash
# Apply database schema
psql -h localhost -U postgres -d postgres -f src/scripts/setup_rag_schema.sql
```

---

## Running Tests

### Quick Test Run
```bash
npm test
```

### Run Specific Test Suite
```bash
# Unit tests only
npx vitest run tests/conversation-storage.test.ts

# Integration tests only
npx vitest run tests/integration/auto-storage-integration.test.ts

# Performance tests only
npx vitest run tests/performance/storage-benchmark.test.ts
```

### Run with Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

---

## Test Files Overview

### 1. Unit Tests (`tests/conversation-storage.test.ts`)
- **56 test cases**
- **Focus**: Individual function testing
- **Duration**: ~2-5 seconds
- **Database**: Yes (with mocks for external APIs)

**What it tests**:
- ✅ Store/retrieve conversations
- ✅ Embedding generation
- ✅ Knowledge base operations
- ✅ Input validation
- ✅ Error handling
- ✅ Security (SQL injection, XSS)
- ✅ Concurrent access

### 2. Integration Tests (`tests/integration/auto-storage-integration.test.ts`)
- **20 test cases**
- **Focus**: End-to-end workflows
- **Duration**: ~10-30 seconds
- **Database**: Yes (real database)

**What it tests**:
- ✅ Full conversation-to-knowledge workflow
- ✅ Feedback-to-learning workflow
- ✅ Middleware integration
- ✅ Database persistence
- ✅ Cross-service integration

### 3. Performance Tests (`tests/performance/storage-benchmark.test.ts`)
- **31 test cases**
- **Focus**: Performance benchmarks
- **Duration**: ~30-60 seconds
- **Database**: Yes (real database)

**What it tests**:
- ✅ Single operation performance (< 10ms targets)
- ✅ Batch operations (< 500ms targets)
- ✅ Load tests (100 concurrent operations)
- ✅ Sustained load (1000+ operations)

---

## Expected Test Results

### All Tests Passing
```
✓ conversation-storage.test.ts (56 tests)
✓ auto-storage-integration.test.ts (20 tests)
✓ storage-benchmark.test.ts (31 tests)

Total: 107 tests passed
Coverage: 95%+
```

### Performance Benchmarks
```
✓ Single conversation storage: < 10ms
✓ Batch insert (10): < 100ms
✓ Embedding generation: < 200ms
✓ Knowledge extraction: < 500ms
✓ Load test (100 concurrent): < 5000ms
✓ Sustained load (1000 ops): < 30000ms
```

---

## Troubleshooting

### Database Connection Error
```
❌ password authentication failed for user "postgres"
```

**Solution**: Update `.env` with correct database credentials:
```bash
DB_HOST=your_host
DB_PORT=your_port
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

### Missing Tables
```
❌ relation "conversation_memory" does not exist
```

**Solution**: Run database migrations:
```bash
psql -h localhost -U postgres -d postgres -f src/scripts/setup_rag_schema.sql
```

### Ollama API Errors (Expected)
Tests mock Ollama API calls, so no Ollama service needed. If you see:
```
✓ Ollama API error handling (expected)
```
This is **normal** - tests are verifying error handling.

---

## Test Coverage

### Files Covered
- ✅ `src/services/memoryService.ts` - 100%
- ✅ `src/services/embeddingCache.ts` - Mocked
- ✅ `src/services/performanceMonitor.ts` - Mocked
- ✅ Integration workflows - Full coverage

### Coverage Report
```bash
npm run test:coverage

# Output:
% Coverage report
Lines    Pct    Functions    Pct    Branches    Pct
-----    -----    ----------   -----   ----------  -----
 450     95%+    45           100%    120         90%+
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## Test Development Workflow

### Adding New Tests
1. Create test following AAA pattern:
   ```typescript
   it('should do something when condition', async () => {
     // Arrange: Set up test data
     const mockEmbedding = Array(768).fill(0.1);
     vi.mocked(global.fetch).mockResolvedValueOnce({
       ok: true,
       json: async () => ({ embedding: mockEmbedding })
     } as Response);

     // Act: Execute code
     const result = await storeConversation('user', 'channel', 'test', 'summary');

     // Assert: Verify outcome
     expect(result).toBeDefined();
   });
   ```

2. Run specific test:
   ```bash
   npx vitest run tests/conversation-storage.test.ts -t "should do something"
   ```

3. Verify coverage:
   ```bash
   npm run test:coverage
   ```

---

## Key Test Patterns

### Mocking Ollama API
```typescript
const mockEmbedding = Array(768).fill(0.1);
vi.mocked(global.fetch).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
} as Response);
```

### Database Cleanup
```typescript
beforeEach(async () => {
  await cleanupTestData();
});

afterEach(async () => {
  await cleanupTestData();
});
```

### Performance Testing
```typescript
const startTime = Date.now();
await operation();
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(100); // ms
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npx vitest run tests/conversation-storage.test.ts` | Unit tests |
| `npx vitest run tests/integration/auto-storage-integration.test.ts` | Integration tests |
| `npx vitest run tests/performance/storage-benchmark.test.ts` | Performance tests |

---

## Support

### Test Failures
1. Check database connection
2. Verify database schema
3. Review error messages
4. Check `.env` configuration

### Performance Issues
1. Close other applications
2. Check database performance
3. Verify system resources
4. Run tests individually

### Questions?
- Review test code: `tests/conversation-storage.test.ts`
- Check documentation: `tests/CONVERSATION_STORAGE_TEST_REPORT.md`
- Run with verbose: `npx vitest run --verbose`

---

**Last Updated**: 2025-02-09
**Test Count**: 107 tests (56 unit + 20 integration + 31 performance)
**Coverage Target**: 95%+
**Status**: ✅ Ready to Run
