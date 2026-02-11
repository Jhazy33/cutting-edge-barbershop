# Learning Database Quick Reference

## Overview

This database enables continuous AI learning through feedback, corrections, and analytics. It integrates with the existing RAG system (`knowledge_base_rag`, `conversation_memory`).

---

## Quick Start

### Run Migration

```bash
# From services/handoff-api
psql -h localhost -U postgres -d cutting_edge -f database/migrations/002_create_learning_tables.sql

# Or with connection string
psql $DATABASE_URL -f database/migrations/002_create_learning_tables.sql
```

### Verify Installation

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%learning%'
   OR table_name = 'conversation_feedback'
   OR table_name = 'owner_corrections'
   OR table_name = 'voice_transcripts'
   OR table_name = 'response_analytics';

-- Expected: 5 tables
```

---

## Table Summary

| Table | Purpose | Rows (est) | Growth Rate |
|-------|---------|------------|-------------|
| `conversation_feedback` | User reactions | 10K/day | High |
| `owner_corrections` | Business owner corrections | 100/day | Low |
| `learning_queue` | Knowledge staging | 5K/day | Medium |
| `response_analytics` | Performance metrics | 10K/day | High |
| `voice_transcripts` | Voice communication | 1K/day | Low |

---

## Common Queries

### Get Pending Learning Items

```sql
SELECT
  id,
  source_type,
  confidence_score,
  LEFT(proposed_content, 100) as content_preview,
  created_at
FROM learning_queue
WHERE status = 'pending'
ORDER BY
  CASE source_type
    WHEN 'correction' THEN 1
    WHEN 'feedback' THEN 2
    ELSE 3
  END,
  confidence_score DESC,
  created_at ASC
LIMIT 50;
```

### Find Unapplied Corrections

```sql
SELECT
  oc.id,
  oc.priority,
  LEFT(oc.corrected_answer, 100) as correction_preview,
  oc.created_at,
  cm.summary as conversation_summary
FROM owner_corrections oc
LEFT JOIN conversation_memory cm ON oc.conversation_id = cm.id
WHERE oc.applied_at IS NULL
ORDER BY oc.priority DESC, oc.created_at ASC;
```

### Check Learning Velocity

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'applied') as items_learned,
  AVG(confidence_score) FILTER (WHERE status = 'applied') as avg_confidence
FROM learning_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Find Negative Feedback

```sql
SELECT
  cf.id,
  cf.feedback_type,
  cf.rating,
  cf.reason,
  cm.summary as conversation_summary,
  cf.created_at
FROM conversation_feedback cf
LEFT JOIN conversation_memory cm ON cf.conversation_id = cm.id
WHERE cf.feedback_type = 'thumbs_down'
   OR cf.rating <= 2
ORDER BY cf.created_at DESC
LIMIT 20;
```

### Response Performance by Type

```sql
SELECT
  response_type,
  COUNT(*) as total_responses,
  ROUND(AVG(user_engagement_score), 2) as avg_engagement,
  ROUND(SUM(CASE WHEN led_to_conversion THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100, 2) as conversion_rate,
  ROUND(AVG(response_time_ms), 0) as avg_response_time_ms
FROM response_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY response_type
ORDER BY conversion_rate DESC;
```

### Check for Similar Knowledge (Duplicate Detection)

```sql
SELECT * FROM check_similar_knowledge(
  p_shop_id := 1,
  p_content := 'Store closes at 6pm on Sundays',
  p_embedding := '[0.1, 0.2, ...]', -- Your 768-dim vector
  p_threshold := 0.85
);
```

### Batch Process Learning Queue

```sql
SELECT batch_process_learning(p_batch_size := 100);
-- Returns: number of items processed
```

---

## Manual Operations

### Approve Learning Item

```sql
UPDATE learning_queue
SET
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = 'admin-uuid-here'
WHERE id = 'item-uuid-here';
```

### Reject Learning Item

```sql
UPDATE learning_queue
SET
  status = 'rejected',
  reviewed_at = NOW(),
  reviewed_by = 'admin-uuid-here',
  metadata = metadata || jsonb_build_object(
    'rejection_reason',
    'Duplicate of existing knowledge'
  )
WHERE id = 'item-uuid-here';
```

### Manually Add Learning

```sql
INSERT INTO learning_queue (
  source_type,
  shop_id,
  proposed_content,
  category,
  confidence_score,
  status,
  metadata
) VALUES (
  'manual',
  1,
  'New store policy: No returns after 30 days',
  'policies',
  100,
  'approved',
  '{"added_by": "admin", "reason": "policy update"}'::jsonb
);
```

### Mark Correction as Applied

```sql
UPDATE owner_corrections
SET applied_at = NOW()
WHERE id = 'correction-uuid-here';
```

---

## Monitoring Queries

### System Health Check

```sql
-- Pending queue depth
SELECT COUNT(*) as pending_count
FROM learning_queue
WHERE status = 'pending';

-- Unapplied corrections
SELECT COUNT(*) as unapplied_corrections
FROM owner_corrections
WHERE applied_at IS NULL;

-- Recent learning velocity
SELECT COUNT(*) as items_learned_last_24h
FROM learning_queue
WHERE status = 'applied'
  AND applied_at > NOW() - INTERVAL '24 hours';

-- Error rate
SELECT
  COUNT(*) FILTER (WHERE metadata ? 'error') as error_count,
  COUNT(*) as total_count,
  ROUND(COUNT(*) FILTER (WHERE metadata ? 'error')::NUMERIC / COUNT(*) * 100, 2) as error_percentage
FROM learning_queue
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Stuck Items Alert

```sql
-- Find items pending > 7 days
SELECT
  id,
  source_type,
  confidence_score,
  created_at,
  NOW() - created_at as age
FROM learning_queue
WHERE status IN ('pending', 'approved')
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at ASC;
```

### Materialized View Refresh

```sql
-- Daily learning metrics
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_learning_metrics;

-- Response performance
REFRESH MATERIALIZED VIEW CONCURRENTLY response_performance_metrics;
```

---

## Triggers (Automatic)

### 1. Negative Feedback → Learning Queue

**When:** User gives thumbs down or 1-2 star rating

**What happens:**
```sql
-- Automatic trigger creates learning_queue entry
-- source_type: 'feedback'
-- confidence_score: 50
-- status: 'pending'
```

**To disable:**
```sql
DROP TRIGGER IF EXISTS trg_feedback_learning ON conversation_feedback;
```

### 2. Owner Correction → Learning Queue

**When:** Business owner creates a correction

**What happens:**
```sql
-- Automatic trigger creates learning_queue entry
-- source_type: 'correction'
-- confidence_score: 70-95 (based on priority)
-- status: 'approved' if urgent, 'pending' otherwise
```

**To disable:**
```sql
DROP TRIGGER IF EXISTS trg_corrections_learning ON owner_corrections;
```

### 3. Update Timestamp

**When:** Any update to learning_queue

**What happens:**
```sql
-- Automatically sets updated_at = NOW()
```

---

## Indexes

### All Indexes

```sql
-- List all indexes for learning tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'conversation_feedback',
    'owner_corrections',
    'learning_queue',
    'response_analytics',
    'voice_transcripts'
  )
ORDER BY tablename, indexname;
```

### HNSW Vector Indexes

```sql
-- For similarity search
idx_learning_embedding_hnsw  -- learning_queue
idx_transcripts_embedding_hnsw -- voice_transcripts
```

### Partial Indexes (Performance)

```sql
-- Only index unapplied corrections
idx_corrections_pending (WHERE applied_at IS NULL)

-- Only index pending learning items
idx_learning_pending (WHERE status = 'pending')

-- Only index negative sentiment
idx_transcripts_negative (WHERE sentiment = 'negative')
```

---

## Functions Reference

### check_similar_knowledge()

Check for duplicate/similar knowledge before inserting.

```sql
SELECT * FROM check_similar_knowledge(
  p_shop_id INTEGER,
  p_content TEXT,
  p_embedding VECTOR(768),
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE (id UUID, content TEXT, similarity NUMERIC);
```

### batch_process_learning()

Process approved learning queue items in batch.

```sql
SELECT batch_process_learning(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS INTEGER (count processed);
```

### trigger_learning_from_negative_feedback()

Trigger function (auto-called on negative feedback).

### trigger_learning_from_corrections()

Trigger function (auto-called on owner corrections).

---

## Rollback

If you need to undo this migration:

```sql
-- WARNING: This will DELETE ALL DATA in these tables

BEGIN;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS response_performance_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS daily_learning_metrics CASCADE;

-- Drop audit log
DROP TABLE IF EXISTS learning_audit_log CASCADE;

-- Drop tables (order matters for foreign keys)
DROP TABLE IF EXISTS learning_queue CASCADE;
DROP TABLE IF EXISTS voice_transcripts CASCADE;
DROP TABLE IF EXISTS response_analytics CASCADE;
DROP TABLE IF EXISTS owner_corrections CASCADE;
DROP TABLE IF EXISTS conversation_feedback CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS check_similar_knowledge(INTEGER, TEXT, VECTOR, NUMERIC);
DROP FUNCTION IF EXISTS batch_process_learning(INTEGER);
DROP FUNCTION IF EXISTS trigger_learning_from_negative_feedback();
DROP FUNCTION IF EXISTS trigger_learning_from_corrections();
DROP FUNCTION IF EXISTS update_learning_queue_timestamp();

COMMIT;
```

---

## Data Retention

### Recommended Cleanup Jobs

```sql
-- Archive old feedback (keep 1 year)
DELETE FROM conversation_feedback
WHERE created_at < NOW() - INTERVAL '1 year';

-- Archive old analytics (keep 6 months)
DELETE FROM response_analytics
WHERE created_at < NOW() - INTERVAL '6 months';

-- Archive old transcripts (keep 2 years)
DELETE FROM voice_transcripts
WHERE created_at < NOW() - INTERVAL '2 years';

-- Archive applied learning items (keep 1 year)
DELETE FROM learning_queue
WHERE status = 'applied'
  AND applied_at < NOW() - INTERVAL '1 year';
```

---

## Performance Tips

1. **Use EXPLAIN ANALYZE** before running complex queries
2. **Batch operations** instead of single-row inserts
3. **Use CONCURRENTLY** for index creation in production
4. **Partition tables** when they exceed 10M rows
5. **Refresh materialized views** during off-peak hours
6. **Monitor query performance** with `pg_stat_statements`

---

## Troubleshooting

### Issue: Learning queue growing too large

**Check:**
```sql
SELECT COUNT(*), status FROM learning_queue GROUP BY status;
```

**Fix:**
```sql
-- Batch process approved items
SELECT batch_process_learning(500);

-- Reject old pending items
UPDATE learning_queue
SET status = 'rejected',
    reviewed_at = NOW()
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 days';
```

### Issue: Duplicate knowledge entries

**Check:**
```sql
SELECT content, COUNT(*) as count
FROM knowledge_base_rag
WHERE shop_id = 1
GROUP BY content
HAVING COUNT(*) > 1;
```

**Fix:**
```sql
-- Use check_similar_knowledge() before inserting
-- Increase threshold to 0.90 for stricter duplicate detection
```

### Issue: Slow queries

**Check:**
```sql
EXPLAIN ANALYZE
SELECT * FROM learning_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 100;
```

**Fix:**
- Ensure partial index exists: `idx_learning_pending`
- Vacuum analyze table: `VACUUM ANALYZE learning_queue;`
- Check index usage with `pg_stat_user_indexes`

---

## Testing Suite

### Quick Test

```bash
# Run all tests (verification + data + triggers)
./run_all_tests.sh

# Or run individually
psql -U postgres -d postgres -f verify_learning_tables.sql
psql -U postgres -d postgres -f test_data_learning.sql
psql -U postgres -d postgres -f test_triggers.sql
```

### Testing Files

| File | Purpose |
|------|---------|
| `verify_learning_tables.sql` | Verify all objects created |
| `test_data_learning.sql` | Insert comprehensive test data |
| `test_triggers.sql` | Test all trigger functionality |
| `run_all_tests.sh` | Execute complete test suite |
| `cleanup_test_data.sh` | Remove test data |
| `TESTING_GUIDE.md` | Complete testing documentation |
| `QUICK_REFERENCE.md` | Fast command reference |

### Test Coverage

- ✅ 5 tables with all columns
- ✅ 26 indexes (including HNSW vector indexes)
- ✅ 5 functions (triggers + utility)
- ✅ 3 triggers (feedback, correction, timestamp)
- ✅ 2 materialized views
- ✅ 4 foreign key constraints
- ✅ 8 check constraints
- ✅ 15+ edge cases and scenarios

**See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for complete testing documentation.**

---

## Related Documentation

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Complete testing suite documentation
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Fast command reference
- [DELIVERABLES.md](./DELIVERABLES.md) - Testing deliverables overview
- [Learning Schema Design](./learning_schema_design.md) - Complete schema documentation
- [Learning Flow Guide](./LEARNING_FLOW_GUIDE.md) - Detailed learning pipelines
- [RAG Schema](../../src/scripts/setup_rag_schema.ts) - Existing RAG system

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the learning flow documentation
3. Run health check queries
4. Check PostgreSQL logs
5. Review [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing issues
