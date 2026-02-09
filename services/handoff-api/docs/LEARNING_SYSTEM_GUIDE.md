# Learning System Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [How Feedback Triggers Learning](#how-feedback-triggers-learning)
4. [How Corrections Are Applied](#how-corrections-are-applied)
5. [Conflict Resolution](#conflict-resolution)
6. [Configuration Options](#configuration-options)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Performance Tuning](#performance-tuning)
9. [Monitoring and Alerts](#monitoring-and-alerts)

---

## System Overview

The Learning System is a continuous improvement engine that automatically captures user feedback and business owner corrections to enhance the AI's knowledge base over time.

### Key Features

- **Automatic Feedback Capture**: Triggers learning entries from negative user feedback
- **Owner Correction Workflow**: Business owners can correct AI responses in real-time
- **Intelligent Staging**: Learning queue with approval workflow before knowledge base updates
- **Priority-Based Processing**: Urgent corrections are auto-approved and fast-tracked
- **Conflict Detection**: Vector similarity detection prevents duplicate knowledge
- **Analytics & Tracking**: Comprehensive metrics on learning effectiveness

### Core Tables

| Table | Purpose |
|-------|---------|
| `conversation_feedback` | User reactions (thumbs up/down, ratings) |
| `owner_corrections` | Business owner corrections during handoff |
| `learning_queue` | Staging area for proposed knowledge updates |
| `response_analytics` | Performance metrics and A/B testing data |
| `voice_transcripts` | Voice communication with sentiment analysis |

---

## Architecture

### High-Level Flow

```mermaid
graph TB
    A[User Conversation] --> B[AI Response]
    B --> C{User Feedback?}
    C -->|Negative| D[conversation_feedback]
    C -->|Positive| E[Analytics Only]
    B --> F{Owner Handoff?}
    F -->|Correction Needed| G[owner_corrections]
    D --> H[Trigger: Auto-Create Learning Entry]
    G --> H
    H --> I[learning_queue]
    I --> J{Priority Check}
    J -->|Urgent| K[Auto-Approved]
    J -->|Normal/High| L[Pending Review]
    L --> M[Admin Review]
    M -->|Approved| N[Batch Process]
    K --> N
    N --> O[knowledge_base_rag]
    O --> P[Improved AI Responses]
    P --> A
```

### Database Triggers

The system uses three automated triggers:

1. **Negative Feedback Trigger** (`trg_feedback_learning`)
   - Fires on INSERT to `conversation_feedback`
   - Creates `learning_queue` entry for thumbs_down or ratings ≤ 2
   - Confidence score: 50 (requires review)

2. **Owner Correction Trigger** (`trg_corrections_learning`)
   - Fires on INSERT to `owner_corrections`
   - Creates `learning_queue` entry with priority-based confidence
   - Auto-approves urgent corrections (confidence: 95)

3. **Timestamp Update Trigger** (`trg_learning_queue_updated_at`)
   - Fires on UPDATE to `learning_queue`
   - Auto-updates `updated_at` timestamp

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant AI as AI Assistant
    participant O as Owner
    participant DB as Database
    participant LQ as Learning Queue
    participant KB as Knowledge Base

    U->>AI: Asks question
    AI->>U: Provides answer

    Note over U: User unsatisfied
    U->>DB: Submit negative feedback
    DB->>LQ: Trigger creates entry
    LQ->>LQ: Status: pending (50% confidence)

    Note over O: Owner handoff
    O->>DB: Submit correction
    DB->>LQ: Trigger creates entry
    LQ->>LQ: Status: approved (urgent) or pending (normal)

    Note over LQ: Batch processing
    LQ->>KB: Apply approved items
    KB->>AI: Updated knowledge
    AI->>U: Improved responses
```

---

## How Feedback Triggers Learning

### Negative Feedback Detection

The system automatically detects negative feedback through database triggers:

```sql
-- Trigger fires on INSERT to conversation_feedback
CREATE TRIGGER trg_feedback_learning
AFTER INSERT ON conversation_feedback
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_negative_feedback();
```

### Trigger Conditions

Learning entries are auto-created for:
- `feedback_type = 'thumbs_down'`
- `rating <= 2` (for star_rating type)

### What Gets Captured

When negative feedback is detected, the trigger captures:

```javascript
{
  source_type: 'feedback',
  source_id: feedback UUID,
  shop_id: from conversation metadata,
  proposed_content: 'Review needed for conversation with negative feedback...',
  category: 'feedback_review',
  confidence_score: 50,
  metadata: {
    feedback_id: 'uuid',
    feedback_type: 'thumbs_down',
    rating: 1,
    reason: 'User explanation...',
    conversation_id: 'uuid'
  },
  status: 'pending'
}
```

### Positive Feedback

Positive feedback (thumbs_up, 4-5 stars) does NOT trigger learning entries but is stored in analytics for:
- Response quality tracking
- A/B testing validation
- Performance metrics

---

## How Corrections Are Applied

### Owner Correction Flow

1. **Owner Submits Correction**
   ```javascript
   POST /api/feedback/correction
   {
     conversationId: 'uuid',
     originalResponse: 'Wrong AI answer',
     correctedAnswer: 'Correct answer',
     priority: 'urgent' // or 'high', 'normal', 'low'
   }
   ```

2. **Trigger Auto-Creates Learning Entry**
   - Confidence score based on priority:
     - urgent: 95 (auto-approved)
     - high: 85 (pending)
     - normal: 70 (pending)
     - low: 50 (pending)

3. **Review Process** (if not urgent)
   - Admin reviews pending items
   - Approves or rejects
   - Can edit content before approval

4. **Batch Processing**
   ```sql
   SELECT batch_process_learning(100); -- Process 100 items
   ```
   - Inserts approved items into `knowledge_base_rag`
   - Updates status to 'applied'
   - Records `applied_at` timestamp

### Priority Matrix

| Priority | Confidence | Status | Auto-Approved? | Processing Speed |
|----------|------------|--------|----------------|------------------|
| urgent | 95 | approved | Yes | Immediate (next batch) |
| high | 85 | pending | No | High priority queue |
| normal | 70 | pending | No | Standard queue |
| low | 50 | pending | No | Low priority queue |

---

## Conflict Resolution

### Duplicate Detection

The system uses vector similarity to detect potential duplicates:

```sql
SELECT * FROM check_similar_knowledge(
  p_shop_id := 1,
  p_content := 'Haircuts cost $30',
  p_embedding := '[...vector...]',
  p_threshold := 0.85
);
```

### Resolution Strategies

1. **Automatic Rejection**
   - Similarity ≥ 95%: Auto-reject as duplicate
   - Logs rejection reason in metadata

2. **Manual Review**
   - Similarity 85-94%: Flag for review
   - Shows similar entries to reviewer
   - Reviewer decides: merge, replace, or reject

3. **Merge Suggestions**
   - System suggests merged content
   - Preserves best parts of both entries
   - Requires final approval

### Version Tracking

Each learning entry tracks:
- `created_at`: When proposed
- `reviewed_at`: When approved/rejected
- `applied_at`: When added to knowledge base
- `reviewed_by`: Admin UUID who approved

### Rollback Procedures

To undo a learning update:

```sql
-- Find the applied learning entry
SELECT id, proposed_content, applied_at
FROM learning_queue
WHERE status = 'applied'
  AND id = 'uuid';

-- Find corresponding knowledge base entry
SELECT id, content, embedding
FROM knowledge_base_rag
WHERE metadata->>'learning_queue_id' = 'uuid';

-- Delete from knowledge base
DELETE FROM knowledge_base_rag
WHERE id = 'knowledge_uuid';

-- Update learning queue status
UPDATE learning_queue
SET status = 'rejected',
    metadata = metadata || jsonb_build_object(
      'rollback_reason', 'Admin rollback',
      'rollback_date', NOW()
    )
WHERE id = 'learning_uuid';
```

---

## Configuration Options

### Environment Variables

```bash
# Database Connection
DATABASE_URL=postgresql://user:pass@host:5432/db

# Server
PORT=3000

# Learning System
LEARNING_BATCH_SIZE=100
LEARNING_AUTO_PROCESS_INTERVAL=300  # seconds
LEARNING_SIMILARITY_THRESHOLD=0.85

# Embedding (if using external service)
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=768
```

### Database Settings

```sql
-- Adjust batch processing size
ALTER DATABASE SET statement_timeout = '60s';

-- Configure HNSW index parameters
CREATE INDEX idx_learning_embedding_hnsw
ON learning_queue
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Adjust for performance vs accuracy trade-off
-- m: 16-32 (higher = better recall, more memory)
-- ef_construction: 40-100 (higher = better quality, slower build)
```

### Trigger Configuration

Disable/enable triggers as needed:

```sql
-- Disable triggers (for bulk imports)
ALTER TABLE conversation_feedback DISABLE TRIGGER trg_feedback_learning;
ALTER TABLE owner_corrections DISABLE TRIGGER trg_corrections_learning;

-- Re-enable triggers
ALTER TABLE conversation_feedback ENABLE TRIGGER trg_feedback_learning;
ALTER TABLE owner_corrections ENABLE TRIGGER trg_corrections_learning;
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Learning Entries Not Created

**Symptoms**: Negative feedback submitted but no `learning_queue` entry

**Diagnosis**:
```sql
-- Check if trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trg_feedback_learning';

-- Test trigger manually
INSERT INTO conversation_feedback (conversation_id, feedback_type)
VALUES ('test-uuid', 'thumbs_down');

-- Check learning queue
SELECT * FROM learning_queue
WHERE source_type = 'feedback'
ORDER BY created_at DESC
LIMIT 5;
```

**Solutions**:
- Ensure trigger is enabled
- Check conversation has valid `metadata->>'shop_id'`
- Verify trigger function exists: `trigger_learning_from_negative_feedback()`

#### 2. Auto-Approval Not Working

**Symptoms**: Urgent corrections not auto-approved

**Diagnosis**:
```sql
-- Check urgent correction status
SELECT id, priority, status, confidence_score
FROM learning_queue
WHERE source_type = 'correction'
  AND metadata->>'priority' = 'urgent';
```

**Solutions**:
- Verify priority is exactly 'urgent' (case-sensitive)
- Check trigger function logic in `trigger_learning_from_corrections()`
- Ensure confidence_score is 95 for urgent priority

#### 3. Batch Processing Fails

**Symptoms**: Approved items not applied to knowledge base

**Diagnosis**:
```sql
-- Check for errors in learning queue
SELECT id, proposed_content, metadata->>'error' as error
FROM learning_queue
WHERE status = 'approved'
  AND metadata ? 'error';

-- Test batch process
SELECT batch_process_learning(1);
```

**Solutions**:
- Check error messages in metadata
- Verify knowledge_base_rag table exists
- Ensure embedding column accepts VECTOR(768)
- Check for foreign key constraints

#### 4. Duplicate Entries

**Symptoms**: Similar knowledge being added multiple times

**Diagnosis**:
```sql
-- Find potential duplicates
SELECT
  lq1.id as entry1,
  lq2.id as entry2,
  (1 - (lq1.embedding <=> lq2.embedding))::NUMERIC as similarity
FROM learning_queue lq1
JOIN learning_queue lq2
  ON lq1.shop_id = lq2.shop_id
  AND lq1.id < lq2.id
WHERE (1 - (lq1.embedding <=> lq2.embedding)) > 0.90
ORDER BY similarity DESC;
```

**Solutions**:
- Adjust `LEARNING_SIMILARITY_THRESHOLD`
- Implement `check_similar_knowledge()` before insert
- Review and merge duplicates manually

### Performance Issues

#### Slow Learning Queue Queries

**Optimization**:
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM learning_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 50;

-- Add partial index if missing
CREATE INDEX idx_learning_pending
ON learning_queue(shop_id, created_at ASC)
WHERE status = 'pending';

-- Vacuum table
VACUUM ANALYZE learning_queue;
```

#### High Memory Usage

**Symptoms**: HNSW indexes consuming too much memory

**Solutions**:
```sql
-- Reduce HNSW m parameter
DROP INDEX idx_learning_embedding_hnsw;
CREATE INDEX idx_learning_embedding_hnsw
ON learning_queue
USING hnsw (embedding vector_cosine_ops)
WITH (m = 12, ef_construction = 40);  -- Reduced from 16/64
```

---

## Performance Tuning

### Batch Processing Optimization

#### Optimal Batch Sizes

| Operation | Recommended Batch Size | Frequency |
|-----------|----------------------|-----------|
| High-priority items | 10-50 | Every 1 minute |
| Normal items | 100-500 | Every 5 minutes |
| Low-priority items | 500-1000 | Every 15 minutes |

#### Scheduling Batch Processing

```bash
# Using cron
*/1 * * * * psql -c "SELECT batch_process_learning(10)"  # High priority
*/5 * * * * psql -c "SELECT batch_process_learning(100)" # Normal
*/15 * * * * psql -c "SELECT batch_process_learning(500)" # Low priority
```

### Index Optimization

#### Critical Indexes

```sql
-- Most frequently queried
CREATE INDEX idx_learning_status_created
ON learning_queue(status, created_at ASC);

-- For duplicate detection
CREATE INDEX idx_learning_embedding_hnsw
ON learning_queue
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- For shop-specific queries
CREATE INDEX idx_learning_shop_status
ON learning_queue(shop_id, status);
```

#### Partial Indexes for Performance

```sql
-- Only pending items (most queried)
CREATE INDEX idx_learning_pending_only
ON learning_queue(created_at ASC)
WHERE status = 'pending';

-- Only high-confidence approved items
CREATE INDEX idx_learning_approved_high_conf
ON learning_queue(confidence_score DESC, created_at ASC)
WHERE status = 'approved' AND confidence_score >= 80;
```

### Materialized View Refresh

```sql
-- Refresh daily metrics
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_learning_metrics;

-- Refresh performance metrics
REFRESH MATERIALIZED VIEW CONCURRENTLY response_performance_metrics;

-- Schedule refresh
*/10 * * * * psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY daily_learning_metrics"
```

---

## Monitoring and Alerts

### Key Metrics to Monitor

#### Learning Queue Health

```sql
-- Pending items count
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'applied') as applied,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM learning_queue;

-- Average age of pending items
SELECT
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) / 3600 as avg_hours_pending
FROM learning_queue
WHERE status = 'pending';

-- Items by priority
SELECT
  metadata->>'priority' as priority,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM learning_queue
WHERE source_type = 'correction'
GROUP BY metadata->>'priority'
ORDER BY COUNT(*) DESC;
```

#### Feedback Trends

```sql
-- Daily feedback volume
SELECT
  DATE(created_at) as date,
  feedback_type,
  COUNT(*) as count
FROM conversation_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), feedback_type
ORDER BY date DESC, feedback_type;

-- Negative feedback rate
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE feedback_type = 'thumbs_down' OR rating <= 2) as negative,
  COUNT(*) as total,
  ROUND(100.0 * negative / NULLIF(total, 0), 2) as negative_rate
FROM conversation_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Correction Effectiveness

```sql
-- Corrections by category
SELECT
  category,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (created_at - applied_at))) / 3600 as avg_hours_to_apply
FROM learning_queue
WHERE source_type = 'correction'
  AND applied_at IS NOT NULL
GROUP BY category
ORDER BY count DESC;

-- Auto-approval rate
SELECT
  metadata->>'priority' as priority,
  COUNT(*) FILTER (WHERE status = 'approved') as auto_approved,
  COUNT(*) as total,
  ROUND(100.0 * auto_approved / NULLIF(total, 0), 2) as auto_approval_rate
FROM learning_queue
WHERE source_type = 'correction'
GROUP BY metadata->>'priority'
ORDER BY priority;
```

### Alert Thresholds

Configure alerts for these conditions:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Pending items age | > 24 hours | > 72 hours | Check batch processing |
| Negative feedback rate | > 15% | > 25% | Review AI responses |
| Failed batch processes | > 5/hour | > 20/hour | Check for errors |
| Duplicate detection rate | > 10% | > 20% | Review threshold |
| Learning queue size | > 10,000 | > 50,000 | Scale processing |

### Logging

Enable detailed logging:

```javascript
// In feedbackService.ts
console.log(`✅ Feedback submitted: ${feedbackId} (type: ${feedbackType})`);
console.log(`✅ Owner correction submitted: ${correctionId} (priority: ${priority})`);
console.log(`✅ Retrieved ${result.rows.length} pending corrections`);
console.log(`✅ Correction approved: ${learningQueueId} by ${reviewedBy}`);
```

Query audit log:

```sql
-- Recent changes
SELECT
  action,
  table_name,
  performed_at,
  performed_by
FROM learning_audit_log
WHERE performed_at > NOW() - INTERVAL '7 days'
ORDER BY performed_at DESC
LIMIT 100;
```

---

## Quick Start

### 5-Minute Setup

1. **Verify Tables Exist**
   ```bash
   psql -f database/migrations/002_create_learning_tables.sql
   ```

2. **Test Triggers**
   ```bash
   psql -f database/test_triggers.sql
   ```

3. **Submit Test Feedback**
   ```bash
   curl -X POST http://localhost:3000/api/feedback/rating \
     -H "Content-Type: application/json" \
     -d '{
       "conversationId": "your-uuid",
       "feedbackType": "thumbs_down",
       "reason": "Test feedback"
     }'
   ```

4. **Check Learning Queue**
   ```bash
   curl http://localhost:3000/api/feedback/pending?shopId=1
   ```

5. **Approve and Apply**
   ```bash
   curl -X POST http://localhost:3000/api/feedback/approve \
     -H "Content-Type: application/json" \
     -d '{
       "learningQueueId": "learning-uuid",
       "reviewedBy": "admin"
     }'
   ```

---

## Best Practices

1. **Review Negative Feedback Daily**
   - Identify patterns in user dissatisfaction
   - Proactively correct common issues

2. **Use Urgent Priority Sparingly**
   - Reserve for critical business information
   - Overuse reduces urgency meaning

3. **Batch Process Regularly**
   - Prevent queue backlog
   - Keep knowledge base fresh

4. **Monitor Duplicate Rate**
   - High rates indicate need for better detection
   - Adjust similarity threshold as needed

5. **Track Learning Effectiveness**
   - Monitor response quality improvements
   - A/B test new learning before full deployment

6. **Maintain Audit Trail**
   - All changes logged automatically
   - Essential for compliance and debugging

---

## Related Documentation

- [API Reference](./LEARNING_API_REFERENCE.md) - Complete API documentation
- [Conflict Resolution](./CONFLICT_RESOLUTION_GUIDE.md) - Detailed conflict handling
- [Database Triggers](../database/LEARNING_TRIGGERS_README.md) - Trigger implementation
- [Diagrams](./LEARNING_SYSTEM_DIAGRAMS.md) - Visual architecture diagrams
- [Testing Guide](../database/TESTING_GUIDE.md) - Testing procedures
