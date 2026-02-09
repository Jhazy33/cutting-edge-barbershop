# Knowledge Auto-Triggers Test Suite - Quick Start Guide

## Overview

This test suite validates the **knowledge base auto-update trigger system** that automatically:
- Creates learning queue entries from feedback and corrections
- Auto-approves high-confidence items (confidence >= 90)
- Applies approved items to knowledge_base_rag
- Detects and resolves conflicts
- Maintains comprehensive audit logs

---

## Prerequisites

### 1. Database Setup

```bash
# Verify database connection
psql -h 109.199.118.38 -U postgres -d postgres -c "SELECT 1"

# Verify pgvector extension
psql -h 109.199.118.38 -U postgres -d postgres -c "SELECT extname FROM pg_extension WHERE extname = 'vector'"

# Verify triggers exist
psql -h 109.199.118.38 -U postgres -d postgres -c "
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'learning_queue'
ORDER BY trigger_name;
"
```

### 2. Apply Migrations

```bash
# From handoff-api directory
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api

# Apply migration 002 (learning tables)
psql -h 109.199.118.38 -U postgres -d postgres -f database/migrations/002_create_learning_tables.sql

# Apply migration 004 (auto triggers)
psql -h 109.199.118.38 -U postgres -d postgres -f database/migrations/004_knowledge_auto_triggers.sql
```

### 3. Environment Configuration

Ensure `.env` file exists with:
```env
DB_HOST=109.199.118.38
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your_password>
```

---

## Running Tests

### Basic Test Execution

```bash
# Run all trigger tests
npm test -- tests/knowledge-auto-triggers.test.ts

# Run with verbose output
npm test -- tests/knowledge-auto-triggers.test.ts --reporter=verbose

# Run specific test suite
npm test -- tests/knowledge-auto-triggers.test.ts -t "Feedback"
npm test -- tests/knowledge-auto-triggers.test.ts -t "Corrections"
npm test -- tests/knowledge-auto-triggers.test.ts -t "Performance"
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage -- tests/knowledge-auto-triggers.test.ts

# View HTML coverage report
open coverage/index.html
```

### Watch Mode (Development)

```bash
# Run tests in watch mode
npm test:watch -- tests/knowledge-auto-triggers.test.ts
```

---

## Test Structure

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| **Unit Tests** | 40+ | Individual trigger functionality |
| **Integration Tests** | 10 | Complete trigger chains |
| **Performance Tests** | 10 | Execution time benchmarks |
| **Edge Case Tests** | 15 | Unusual input handling |
| **Security Tests** | 10 | SQL injection, validation |

### Test File Locations

```
tests/
├── knowledge-auto-triggers.test.ts    # Main test suite (95 tests)
├── helpers/
│   └── trigger-test-utils.ts          # Test utilities
└── fixtures/
    └── trigger-test-data.sql          # Test data fixtures
```

---

## Understanding Test Output

### Success Example

```
✓ should create learning entry for thumbs_down feedback
✓ should auto-approve learning entry with confidence >= 90
✓ should execute feedback trigger in < 50ms
✓ should prevent SQL injection in proposed_content

Test Files  1 passed (1)
     Tests  95 passed (95)
  Start at  17:00:00
  Duration  2.5s
```

### Failure Example

```
✗ should create learning entry for thumbs_down feedback
AssertionError: Expected 'pending' to be 'approved'

Test Files  1 failed (1)
     Tests  94 passed | 1 failed
```

---

## Manual Testing with SQL

### Test Feedback Trigger

```sql
-- 1. Create test conversation
INSERT INTO conversations (id, user_id, summary, metadata)
VALUES ('test_manual_001', 'test_user', 'Test conversation', '{"shop_id": 1}');

-- 2. Insert negative feedback (should create learning entry)
INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
VALUES ('test_manual_001', 'thumbs_down', 'Test reason');

-- 3. Check learning queue
SELECT * FROM learning_queue
WHERE source_type = 'feedback'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Cleanup
DELETE FROM learning_queue WHERE source_id IN (
  SELECT id FROM conversation_feedback WHERE conversation_id = 'test_manual_001'
);
DELETE FROM conversation_feedback WHERE conversation_id = 'test_manual_001';
DELETE FROM conversations WHERE id = 'test_manual_001';
```

### Test Corrections Trigger

```sql
-- 1. Create test conversation
INSERT INTO conversations (id, user_id, summary, metadata)
VALUES ('test_manual_002', 'test_user', 'Test', '{"shop_id": 1}');

-- 2. Insert urgent correction (should auto-approve and apply)
INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
VALUES ('test_manual_002', 'Wrong answer', 'Correct answer', 'urgent');

-- 3. Check learning queue (should be approved)
SELECT * FROM learning_queue
WHERE source_type = 'correction'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Check knowledge base (should be applied)
SELECT * FROM knowledge_base_rag
WHERE source = 'learning_queue'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Cleanup
DELETE FROM knowledge_base_rag WHERE source = 'learning_queue';
DELETE FROM learning_queue WHERE source_type = 'correction';
DELETE FROM owner_corrections WHERE conversation_id = 'test_manual_002';
DELETE FROM conversations WHERE id = 'test_manual_002';
```

### Test Auto-Approve Trigger

```sql
-- Insert high confidence learning (should auto-approve)
INSERT INTO learning_queue (shop_id, source_type, proposed_content, confidence_score, status)
VALUES (1, 'manual', 'High confidence knowledge', 95, 'pending');

-- Check if auto-approved
SELECT id, status, reviewed_at, metadata->>'auto_approved' as auto_approved
FROM learning_queue
WHERE proposed_content = 'High confidence knowledge';

-- Cleanup
DELETE FROM learning_queue WHERE proposed_content = 'High confidence knowledge';
```

---

## Performance Benchmarks

### Expected Execution Times

| Trigger | Target | Actual |
|---------|--------|--------|
| Feedback → Queue | < 50ms | ~20-30ms |
| Corrections → Queue | < 50ms | ~20-30ms |
| Auto-Approve | < 20ms | ~5-10ms |
| Apply to KB | < 100ms | ~30-80ms |

### Measuring Performance

```sql
-- Enable timing
\timing on

-- Test trigger performance
INSERT INTO conversation_feedback (conversation_id, feedback_type)
VALUES ('test_conv', 'thumbs_down');

-- Check execution time in output
```

---

## Troubleshooting

### Issue: "password authentication failed"

**Solution**: Check `.env` file credentials
```bash
# Verify credentials
cat .env | grep DB_PASSWORD

# Test connection manually
psql -h 109.199.118.38 -U postgres -d postgres -c "SELECT 1"
```

### Issue: "relation does not exist"

**Solution**: Apply database migrations
```bash
psql -h 109.199.118.38 -U postgres -d postgres \
  -f database/migrations/002_create_learning_tables.sql

psql -h 109.199.118.38 -U postgres -d postgres \
  -f database/migrations/004_knowledge_auto_triggers.sql
```

### Issue: Tests timeout

**Solution**: Increase test timeout in vitest.config.ts
```typescript
export default defineConfig({
  test: {
    testTimeout: 30000, // Increase to 30 seconds
    hookTimeout: 30000
  }
});
```

### Issue: Trigger not firing

**Solution**: Verify triggers exist
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'learning_queue'
ORDER BY trigger_name;
```

Expected output:
```
trg_auto_approve_learning
trg_apply_approved_learning
trg_audit_learning_changes
trg_ensure_learning_embedding
trg_learning_queue_timestamp
```

---

## Cleanup Commands

### Clean All Test Data

```sql
-- Delete in correct order (respect foreign keys)
DELETE FROM knowledge_base_rag WHERE source = 'learning_queue';
DELETE FROM learning_audit_log WHERE performed_by = 'system';
DELETE FROM voice_transcripts WHERE conversation_id LIKE 'test_%';
DELETE FROM owner_corrections WHERE conversation_id LIKE 'test_%';
DELETE FROM conversation_feedback WHERE conversation_id LIKE 'test_%';
DELETE FROM learning_queue WHERE source_type IN ('feedback', 'correction');
DELETE FROM conversations WHERE id LIKE 'test_%';
```

### Clean Specific Shop

```sql
DELETE FROM knowledge_base_rag WHERE shop_id = 1 AND source = 'learning_queue';
DELETE FROM learning_queue WHERE shop_id = 1;
DELETE FROM learning_audit_log WHERE record_id IN (
  SELECT id FROM learning_queue WHERE shop_id = 1
);
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Trigger Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
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
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: ./services/handoff-api

      - name: Apply migrations
        run: |
          psql -h localhost -U postgres -d postgres \
            -f database/migrations/002_create_learning_tables.sql
          psql -h localhost -U postgres -d postgres \
            -f database/migrations/004_knowledge_auto_triggers.sql
        working-directory: ./services/handoff-api

      - name: Run tests
        run: npm test -- tests/knowledge-auto-triggers.test.ts
        working-directory: ./services/handoff-api

      - name: Generate coverage
        run: npm run test:coverage -- tests/knowledge-auto-triggers.test.ts
        working-directory: ./services/handoff-api

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./services/handoff-api/coverage/lcov.info
```

---

## Additional Resources

- **Full Test Report**: `tests/KNOWLEDGE_AUTO_TRIGGERS_TEST_REPORT.md`
- **Migration Scripts**: `database/migrations/004_knowledge_auto_triggers.sql`
- **Test Utilities**: `tests/helpers/trigger-test-utils.ts`
- **Test Fixtures**: `tests/fixtures/trigger-test-data.sql`

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm test -- tests/knowledge-auto-triggers.test.ts` | Run all tests |
| `npm test:watch -- tests/knowledge-auto-triggers.test.ts` | Watch mode |
| `npm run test:coverage -- tests/knowledge-auto-triggers.test.ts` | Coverage report |
| `psql -h 109.199.118.38 -U postgres` | Connect to DB |
| `\dt` | List tables |
| `\df+ function_name` | Show function definition |
| `EXPLAIN ANALYZE query` | Performance analysis |

---

**Last Updated**: 2026-02-09
**Test Version**: 1.0.0
**Total Tests**: 95
