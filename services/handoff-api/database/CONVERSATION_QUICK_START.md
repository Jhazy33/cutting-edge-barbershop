# Conversation Storage Quick Start

## Installation

```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api

# Run migration
psql -h localhost -U postgres -d postgres \
  -f database/migrations/003_optimize_conversation_storage.sql

# Verify installation
psql -h localhost -U postgres -d postgres \
  -f database/verify_conversation_optimization.sql
```

---

## Basic Usage

### Insert Single Conversation

```typescript
import { query } from './utils/db';

const result = await query(
  `INSERT INTO conversations (user_id, channel, summary, metadata)
   VALUES ($1, $2, $3, $4)
   RETURNING *`,
  [123, 'web', 'Customer asked about pricing', { shop_id: 1 }]
);

console.log(result.rows[0]);
```

### Batch Insert Conversations

```typescript
import { query } from './utils/db';

const conversations = [
  { user_id: 123, channel: 'web', summary: 'Test 1', metadata: {} },
  { user_id: 456, channel: 'telegram', summary: 'Test 2', metadata: {} }
];

const result = await query(
  'SELECT * FROM batch_insert_conversations($1)',
  [JSON.stringify(conversations)]
);

// Returns: [{ id, success, error_message }, ...]
```

### Get User Conversations

```typescript
import { query } from './utils/db';

const result = await query(
  `SELECT * FROM conversations
   WHERE user_id = $1
     AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT 20`,
  [userId]
);
```

### Semantic Search (with Embeddings)

```typescript
import { query } from './utils/db';

const result = await query(
  `SELECT
     id,
     summary,
     (1 - (embedding <=> $1)) as similarity
   FROM conversations
   WHERE embedding IS NOT NULL
     AND user_id = $2
     AND deleted_at IS NULL
   ORDER BY embedding <=> $1
   LIMIT 10`,
  [queryVector, userId]
);
```

---

## Common Queries

### Get Active Conversations

```sql
SELECT * FROM conversations
WHERE status = 'active'
  AND deleted_at IS NULL
ORDER BY last_message_at DESC
LIMIT 20;
```

### Get Conversations by Channel

```sql
SELECT * FROM conversations
WHERE user_id = 123
  AND channel = 'telegram'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Get Conversations by Shop (metadata)

```sql
SELECT * FROM conversations
WHERE metadata->>'shop_id' = '1'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Get Conversation Statistics

```sql
SELECT * FROM get_conversation_stats(
  p_user_id := NULL,  -- All users, or specify user_id
  p_days := 30        -- Last 30 days
);
```

---

## Performance Tips

1. **Use batch inserts** for bulk operations
2. **Add embeddings** after insert if not needed immediately
3. **Use partial indexes** by filtering on `status` and `deleted_at`
4. **Schedule view refreshes** during off-peak hours
5. **Monitor pool stats** to prevent exhaustion

---

## Functions Reference

### `batch_insert_conversations(JSONB)`

Fast bulk insert with error handling.

```typescript
const conversations = [
  { user_id, channel, summary, metadata },
  ...
];

const result = await query(
  'SELECT * FROM batch_insert_conversations($1)',
  [JSON.stringify(conversations)]
);
// Returns: [{ id, success, error_message }, ...]
```

### `upsert_conversation(...)`

Insert or update conversation by ID.

```typescript
const result = await query(
  'SELECT upsert_conversation($1, $2, $3, $4, $5, $6, $7, $8) as id',
  [id, user_id, channel, summary, full_conversation, embedding, metadata, status]
);
// Returns: { id: UUID }
```

### `get_conversation_stats(user_id, days)`

Get usage statistics.

```typescript
const result = await query(
  'SELECT * FROM get_conversation_stats($1, $2)',
  [userId, 30]
);
// Returns: [{ metric_name, metric_value }, ...]
```

---

## Indexes

### Available Indexes

- `idx_conversations_user_created` - User conversations by date
- `idx_conversations_user_channel_created` - User + channel filtering
- `idx_conversations_active` - Active conversations only (partial)
- `idx_conversations_embedding_hnsw` - Vector search (partial, HNSW)
- `idx_conversations_metadata` - JSONB metadata queries (GIN)

### Performance

- User lookup: **< 5ms**
- Vector search: **< 50ms**
- Batch insert: **< 100ms** for 100 conversations

---

## Monitoring

### Check Index Usage

```sql
SELECT
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'conversations'
ORDER BY idx_scan DESC;
```

### Check Table Size

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('conversations')) as total_size,
  pg_size_pretty(pg_indexes_size('conversations')) as indexes_size;
```

### Refresh Materialized Views

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_metrics;
REFRESH MATERIALIZED VIEW CONCURRENTLY performance_stats;
```

---

## Troubleshooting

### Slow Queries

```sql
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;
```

### Missing Indexes

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'conversations'
ORDER BY indexname;
```

### Connection Pool Issues

```typescript
import { getPoolStats } from './utils/db';

console.log(getPoolStats());
// { totalCount, idleCount, waitingCount, max }
```

---

## Rollback

```sql
BEGIN;

DROP MATERIALIZED VIEW performance_stats CASCADE;
DROP MATERIALIZED VIEW conversation_metrics CASCADE;

DROP FUNCTION get_conversation_stats(INTEGER, INTEGER);
DROP FUNCTION upsert_conversation();
DROP FUNCTION batch_insert_conversations(JSONB);
DROP FUNCTION update_conversation_timestamps();

DROP TABLE conversations CASCADE;

COMMIT;
```

---

## Documentation

- [CONVERSATION_OPTIMIZATION_GUIDE.md](./CONVERSATION_OPTIMIZATION_GUIDE.md) - Complete optimization guide
- [003_optimize_conversation_storage.sql](./migrations/003_optimize_conversation_storage.sql) - Migration file
- [verify_conversation_optimization.sql](./verify_conversation_optimization.sql) - Verification script
