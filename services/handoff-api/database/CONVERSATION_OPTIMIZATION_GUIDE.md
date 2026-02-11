# Conversation Storage Optimization Guide

## Overview

This document describes the high-performance conversation storage system implemented in migration 003. The system is designed for < 100ms response times with automatic conversation storage and retrieval.

**Performance Targets:**
- Single conversation insert: < 10ms
- Batch insert (100 conversations): < 100ms
- User conversation lookup: < 5ms
- Vector similarity search: < 50ms

---

## Architecture

### Core Table: `conversations`

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL,
  channel VARCHAR(50) NOT NULL,
  summary TEXT,
  full_conversation TEXT,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

**Design Decisions:**
1. **UUID Primary Key**: Distributed system safe, no sequence contention
2. **Composite Indexes**: Cover most query patterns without table lookups
3. **Partial Indexes**: Save space and improve speed for common filters
4. **HNSW Vector Index**: Fast approximate nearest neighbor search
5. **Soft Deletes**: Preserve data for analytics while excluding from queries

---

## Index Strategy

### Query Pattern Coverage

| Query Pattern | Index Used | Performance |
|--------------|------------|-------------|
| `WHERE user_id = ? ORDER BY created_at DESC` | `idx_conversations_user_created` | < 5ms |
| `WHERE user_id = ? AND channel = ?` | `idx_conversations_user_channel_created` | < 5ms |
| `WHERE embedding IS NOT NULL ORDER BY embedding <=> ?` | `idx_conversations_embedding_hnsw` | < 50ms |
| `WHERE status = 'active' AND deleted_at IS NULL` | `idx_conversations_active` | < 5ms |
| `WHERE metadata->>'shop_id' = '1'` | `idx_conversations_metadata` | < 10ms |

### Index Breakdown

#### 1. Composite Indexes (High Priority)

**User conversations by date:**
```sql
CREATE INDEX idx_conversations_user_created
ON conversations(user_id, created_at DESC);
```
- **Covers**: Get user's recent conversations
- **Size**: ~10% of table size
- **Performance**: Index-only scan, no table lookup

**User conversations by channel and date:**
```sql
CREATE INDEX idx_conversations_user_channel_created
ON conversations(user_id, channel, created_at DESC);
```
- **Covers**: Filtered user queries (e.g., "web conversations only")
- **Size**: ~15% of table size
- **Performance**: Composite index supports multi-column filtering

**Channel performance monitoring:**
```sql
CREATE INDEX idx_conversations_channel_created
ON conversations(channel, created_at DESC);
```
- **Covers**: Analytics by channel
- **Size**: ~5% of table size
- **Use case**: "Get all telegram conversations from last hour"

#### 2. Partial Indexes (Space Optimization)

**Active conversations only:**
```sql
CREATE INDEX idx_conversations_active
ON conversations(user_id, last_message_at DESC)
WHERE status = 'active' AND deleted_at IS NULL;
```
- **Size**: ~20% of full index (only active records)
- **Performance**: Smaller index = faster scans
- **Use case**: Dashboard queries for active conversations

**Vector search optimization:**
```sql
CREATE INDEX idx_conversations_embedding_hnsw
ON conversations USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
```
- **Size**: Only records with embeddings
- **Performance**: HNSW approximate search (O(log n))
- **Use case**: Semantic similarity search

**Soft delete filtering:**
```sql
CREATE INDEX idx_conversations_deleted_at
ON conversations(deleted_at) WHERE deleted_at IS NULL;
```
- **Size**: Only non-deleted records
- **Performance**: Automatically excludes deleted data

#### 3. GIN Index (JSONB Queries)

**Metadata queries:**
```sql
CREATE INDEX idx_conversations_metadata
ON conversations USING GIN (metadata);
```
- **Covers**: Queries on metadata fields (shop_id, tags, etc.)
- **Performance**: Fast JSONB containment queries
- **Use case**: "Find all conversations for shop_id = 1"

---

## Connection Pooling

### Current Configuration

```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size
  max: 20,                          // Max connections
  min: 2,                           // Min connections (add this)
  idleTimeoutMillis: 30000,         // Close idle clients after 30s

  // Timeouts
  connectionTimeoutMillis: 2000,    // Error after 2s if can't connect
  statement_timeout: 10000,         // Add: Kill queries > 10s

  // Performance
  maxUses: 7500,                    // Add: Recycle connections after 7500 uses
});
```

### Recommended Updates for High Performance

Add to your `/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api/src/utils/db.ts`:

```typescript
const pool = new Pool({
  // ... existing config ...

  // ADD THESE:
  min: 2,                           // Maintain 2 connections ready
  statement_timeout: 10000,         // Kill slow queries (> 10s)
  query_timeout: 10000,             // Alternative timeout method
  maxUses: 7500,                    // Prevent connection bloat

  // Monitoring
  idleInTransactionSessionTimeout: 60000,  // Kill idle transactions

  // Application name for monitoring
  application_name: 'handoff-api',
});
```

### Pool Monitoring

```typescript
// Add to db.ts for monitoring
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    max: pool.options.max,
  };
}

// Log pool stats every 5 minutes
setInterval(() => {
  console.log('📊 Pool Stats:', getPoolStats());
}, 5 * 60 * 1000);
```

---

## Batch Insertion

### Function: `batch_insert_conversations`

**Purpose**: High-performance bulk insert with error handling

**Usage:**

```typescript
import { query } from './utils/db';

async function insertConversations(conversations: Conversation[]) {
  const result = await query(
    'SELECT * FROM batch_insert_conversations($1)',
    [JSON.stringify(conversations)]
  );

  return result.rows; // [{ id, success, error_message }, ...]
}
```

**Performance:**
- Single transaction for all inserts
- Error handling per row (continues on failure)
- Expected: 100 conversations in < 100ms

**Example:**

```typescript
const conversations = [
  {
    user_id: 123,
    channel: 'web',
    summary: 'Customer asked about pricing',
    full_conversation: 'Full transcript here...',
    metadata: { shop_id: 1, tags: ['pricing'] }
  },
  {
    user_id: 456,
    channel: 'telegram',
    summary: 'Support request',
    full_conversation: 'Full transcript here...',
    metadata: { shop_id: 2, urgent: true }
  }
];

const results = await insertConversations(conversations);
console.log(`Inserted ${results.filter(r => r.success).length} conversations`);
```

### Upsert Function: `upsert_conversation`

**Purpose**: Insert or update if exists

**Usage:**

```typescript
async function saveConversation(conversation: Conversation) {
  const result = await query(
    'SELECT upsert_conversation($1, $2, $3, $4, $5, $6, $7, $8) as id',
    [
      conversation.id,           // UUID or null for new
      conversation.user_id,
      conversation.channel,
      conversation.summary,
      conversation.full_conversation,
      conversation.embedding,
      conversation.metadata,
      conversation.status
    ]
  );

  return result.rows[0].id; // Returns conversation UUID
}
```

---

## Monitoring Views

### Materialized View: `conversation_metrics`

**Refresh Strategy:**
```bash
# Refresh every hour (via cron or pg_cron)
psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_metrics;"
```

**Sample Queries:**

```sql
-- Storage volume by day
SELECT
  date,
  channel,
  total_conversations,
  with_embeddings,
  active_conversations
FROM conversation_metrics
WHERE date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Embedding coverage rate
SELECT
  channel,
  SUM(with_embeddings)::FLOAT / NULLIF(SUM(total_conversations), 0) as embed_rate
FROM conversation_metrics
WHERE date > CURRENT_DATE - INTERVAL '7 days'
GROUP BY channel;
```

### Materialized View: `performance_stats`

**Refresh Strategy:**
```bash
# Refresh every 5 minutes
psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY performance_stats;"
```

**Sample Queries:**

```sql
-- Hourly insertion patterns
SELECT
  hour,
  channel,
  conversations_per_hour,
  unique_users,
  avg_seconds_between
FROM performance_stats
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY hour DESC;

-- Peak hours detection
SELECT
  EXTRACT(HOUR FROM hour) as hour_of_day,
  AVG(conversations_per_hour) as avg_conversations
FROM performance_stats
GROUP BY EXTRACT(HOUR FROM hour)
ORDER BY avg_conversations DESC
LIMIT 5;
```

---

## Performance Verification

### 1. Connection Pool Test

```bash
# Test pool settings
psql -c "SELECT * FROM pg_stat_activity WHERE application_name = 'handoff-api';"
```

### 2. Index Usage Test

```sql
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE user_id = 123
  AND status = 'active'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Should use: idx_conversations_active (partial index)
-- Expected: Index Only Scan, < 5ms
```

### 3. Vector Search Test

```sql
EXPLAIN ANALYZE
SELECT
  id,
  summary,
  (1 - (embedding <=> '[0.1, 0.2, ...]'::VECTOR(768))) as similarity
FROM conversations
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[0.1, 0.2, ...]'::VECTOR(768)
LIMIT 10;

-- Should use: idx_conversations_embedding_hnsw
-- Expected: Index Scan using hnsw, < 50ms
```

### 4. Batch Insert Test

```sql
-- Test with 100 conversations
DO $$
DECLARE
  v_start TIMESTAMP;
  v_duration INTERVAL;
  v_count INTEGER := 0;
BEGIN
  v_start := CLOCK_TIMESTAMP();

  -- Insert 100 test conversations
  FOR i IN 1..100 LOOP
    INSERT INTO conversations (user_id, channel, summary, metadata)
    VALUES (i, 'web', 'Test conversation ' || i, '{"test": true}'::jsonb);
    v_count := v_count + 1;
  END LOOP;

  v_duration := CLOCK_TIMESTAMP() - v_start;
  RAISE NOTICE 'Inserted % conversations in % (avg: % per conversation)',
    v_count,
    v_duration,
    (EXTRACT(EPOCH FROM v_duration) * 1000)::INTEGER / v_count;
END $$;

-- Expected: < 100ms total (< 1ms per conversation)
```

---

## Verification Queries

### Check Index Usage

```sql
-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'conversations'
ORDER BY idx_scan DESC;
```

### Check Table Size

```sql
-- Table and index sizes
SELECT
  pg_size_pretty(pg_total_relation_size('conversations')) as total_size,
  pg_size_pretty(pg_relation_size('conversations')) as table_size,
  pg_size_pretty(pg_indexes_size('conversations')) as indexes_size;
```

### Check Slow Queries

```sql
-- Enable pg_stat_statements first
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries on conversations
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%conversations%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Common Query Patterns

### Get Recent User Conversations

```sql
SELECT
  id,
  channel,
  summary,
  created_at,
  last_message_at
FROM conversations
WHERE user_id = 123
  AND deleted_at IS NULL
ORDER BY last_message_at DESC
LIMIT 20;

-- Uses: idx_conversations_user_created
-- Performance: < 5ms
```

### Get Active Conversations by Channel

```sql
SELECT
  id,
  user_id,
  summary,
  last_message_at
FROM conversations
WHERE user_id = 123
  AND channel = 'telegram'
  AND status = 'active'
  AND deleted_at IS NULL
ORDER BY last_message_at DESC;

-- Uses: idx_conversations_active (partial index)
-- Performance: < 5ms
```

### Semantic Similarity Search

```sql
SELECT
  id,
  summary,
  (1 - (embedding <=> $query_vector)) as similarity
FROM conversations
WHERE embedding IS NOT NULL
  AND user_id = 123
  AND deleted_at IS NULL
ORDER BY embedding <=> $query_vector
LIMIT 10;

-- Uses: idx_conversations_embedding_hnsw
-- Performance: < 50ms
```

---

## Troubleshooting

### Issue: Slow conversation lookups

**Check:**
```sql
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;
```

**Fix:**
- Ensure `idx_conversations_user_created` exists
- Run `VACUUM ANALYZE conversations;`
- Check for missing index statistics

### Issue: Batch insert is slow

**Check:**
```sql
-- Check for foreign key locks
SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';
```

**Fix:**
- Use single transaction for batch inserts
- Disable triggers temporarily if needed
- Increase `statement_timeout` for large batches

### Issue: Vector search is slow

**Check:**
```sql
-- Verify HNSW index exists
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_conversations_embedding_hnsw';
```

**Fix:**
- Ensure embedding column has data (not NULL)
- Check HNSW parameters: `m = 16, ef_construction = 64`
- Increase `ef_search` if needed for accuracy

---

## Rollback

If you need to undo this migration:

```sql
BEGIN;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS performance_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS conversation_metrics CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_conversation_stats(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS upsert_conversation();
DROP FUNCTION IF EXISTS batch_insert_conversations(JSONB);
DROP FUNCTION IF EXISTS update_conversation_timestamps();

-- Drop table (cascades to indexes/triggers)
DROP TABLE IF EXISTS conversations CASCADE;

COMMIT;
```

---

## Related Documentation

- [Learning System README](./README.md) - Learning database integration
- [Migration 002](./migrations/002_create_learning_tables.sql) - Learning tables
- [RAG Schema](../src/scripts/setup_rag_schema.ts) - Vector search setup

---

## Performance Checklist

- [ ] Connection pool configured with `min: 2`, `statement_timeout: 10000`
- [ ] All indexes verified with `EXPLAIN ANALYZE`
- [ ] Batch insert tested with 100 conversations (< 100ms)
- [ ] Vector search tested with HNSW index (< 50ms)
- [ ] Materialized views refresh scheduled (cron/pg_cron)
- [ ] Monitoring queries set up for index usage
- [ ] Connection pool stats logged every 5 minutes
- [ ] Slow query logging enabled (> 100ms threshold)

---

**Expected Performance After Optimization:**
- Single conversation insert: **< 10ms**
- Batch insert (100): **< 100ms**
- User conversation lookup: **< 5ms**
- Vector similarity search: **< 50ms**
- Dashboard queries (active conversations): **< 10ms**
