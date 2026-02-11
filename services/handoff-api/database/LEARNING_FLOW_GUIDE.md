# Learning Flow Documentation

## Overview

This document describes the complete learning pipeline for how the AI system improves over time through user feedback, owner corrections, and conversation analytics.

---

## Learning Pipelines

### Pipeline 1: User Feedback → Knowledge Update

**Flow Diagram:**

```
┌─────────────────┐
│ User interacts  │
│ with AI bot     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Conversation    │
│ stored in       │
│ conversation_   │
│ memory          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User provides   │
│ feedback        │
│ (thumbs down)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ conversation_feedback record        │
│ - feedback_type: 'thumbs_down'      │
│ - rating: 1-2 stars                 │
│ - reason: "Wrong information"       │
└────────┬────────────────────────────┘
         │
         │ [TRIGGER: trg_feedback_learning]
         ▼
┌─────────────────────────────────────┐
│ learning_queue record created       │
│ - source_type: 'feedback'           │
│ - status: 'pending'                 │
│ - confidence_score: 50              │
│ - proposed_content: Review needed   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Admin reviews dashboard             │
│ - Sees pending items                │
│ - Reviews conversation context      │
│ - Approves/Rejects                  │
└────────┬────────────────────────────┘
         │
         ▼ [If approved]
┌─────────────────────────────────────┐
│ learning_queue.status = 'approved'  │
│ - Set reviewed_at timestamp         │
│ - Set reviewed_by admin ID          │
└────────┬────────────────────────────┘
         │
         ▼ [Batch process or manual]
┌─────────────────────────────────────┐
│ Insert into knowledge_base_rag      │
│ - shop_id                           │
│ - content: Corrected information    │
│ - category: 'feedback_correction'   │
│ - embedding: Generated from content │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ learning_queue.status = 'applied'   │
│ - Set applied_at timestamp          │
└─────────────────────────────────────┘
```

**Key Points:**
- Negative feedback (thumbs down, 1-2 stars) auto-generates learning queue entry
- Positive feedback (thumbs up, 4-5 stars) does NOT generate learning entry
- Admin must approve feedback-based learning (low confidence)
- System learns what NOT to do from negative feedback

---

### Pipeline 2: Owner Correction → Immediate Knowledge Update

**Flow Diagram:**

```
┌─────────────────┐
│ AI responds     │
│ incorrectly     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Handoff to      │
│ business owner  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Owner reviews conversation          │
│ - Sees AI mistake                   │
│ - Provides correct answer           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ owner_corrections record created    │
│ - original_response: AI answer      │
│ - corrected_answer: Right answer    │
│ - priority: 'high' or 'urgent'      │
│ - correction_context: When to use   │
└────────┬────────────────────────────┘
         │
         │ [TRIGGER: trg_corrections_learning]
         ▼
┌─────────────────────────────────────┐
│ learning_queue record created       │
│ - source_type: 'correction'         │
│ - confidence_score: 85-95           │
│ - status: 'approved' (if urgent)    │
│           or 'pending' (if normal)  │
└────────┬────────────────────────────┘
         │
         ├─[If urgent]────────────────────┐
         │                                 │
         ▼                                 │
┌─────────────────────────────────────┐ │
│ Auto-applied to knowledge_base_rag  │ │
│ - No manual review needed           │ │
│ - Immediate knowledge update        │ │
└────────┬────────────────────────────┘ │
         │                             │
         ▼                             │
┌─────────────────────────────────────┐ │
│ owner_corrections.applied_at = NOW()│ │
└─────────────────────────────────────┘ │
         │                             │
         └─────────────────────────────┘
         │
         └─[If normal/high]────────────┐
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │ Admin review       │
                               │ optional but       │
                               │ recommended        │
                               └─────────┬───────────┘
                                         │
                                         ▼
                               ┌─────────────────────┐
                               │ Apply to knowledge  │
                               │ base if approved    │
                               └─────────────────────┘
```

**Key Points:**
- Owner corrections have HIGH confidence (85-95)
- Urgent corrections are auto-applied immediately
- Normal/high corrections can be reviewed or auto-applied
- This is the fastest way to improve AI knowledge
- Corrections capture the "right way" to answer

---

### Pipeline 3: Voice Transcript → Sentiment-Based Learning

**Flow Diagram:**

```
┌─────────────────┐
│ Customer calls  │
│ or voice chat   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Voice transcription service         │
│ - Speech-to-text                    │
│ - Sentiment analysis                │
│ - Entity extraction                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ voice_transcripts record created    │
│ - transcript: Full text             │
│ - sentiment: 'negative'             │
│ - entities: Extracted info          │
│ - learning_insights: AI findings    │
└────────┬────────────────────────────┘
         │
         │ [If sentiment = 'negative']
         ▼
┌─────────────────────────────────────┐
│ Optional: Create learning_queue     │
│ - source_type: 'transcript'         │
│ - Low confidence (30-40)            │
│ - Requires manual review            │
└─────────────────────────────────────┘
```

**Key Points:**
- Voice transcripts are primarily for analysis
- Negative sentiment CAN generate learning queue entries
- Most value is in sentiment trends and entity extraction
- Voice data helps identify recurring issues

---

### Pipeline 4: Response Analytics → A/B Testing

**Flow Diagram:**

```
┌─────────────────┐
│ AI generates    │
│ response        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ response_analytics record created   │
│ - response_text: What was said      │
│ - response_type: Category           │
│ - ab_test_variant: 'A' or 'B'       │
│ - user_engagement_score: 0-100      │
│ - led_to_conversion: boolean        │
│ - response_time_ms: milliseconds    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Materialized view aggregates data   │
│ - response_performance_metrics      │
│ - Daily averages                    │
│ - Conversion rates                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Analytics dashboard shows           │
│ - Which responses work best         │
│ - A/B test winners                  │
│ - Conversion rates by type          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Winning responses added to          │
│ knowledge_base as templates         │
│ - High-conversion patterns          │
│ - Best practices extracted          │
└─────────────────────────────────────┘
```

**Key Points:**
- Analytics track what WORKS, not what's wrong
- A/B testing identifies optimal responses
- High-conversion patterns become knowledge
- Continuous improvement cycle

---

## Conflict Resolution

### Scenario 1: Duplicate Detection

When learning_queue entry is created, check for similar existing knowledge:

```sql
SELECT * FROM check_similar_knowledge(
  shop_id := 1,
  p_content := 'Store closes at 6pm on Sundays',
  p_embedding := <vector>,
  p_threshold := 0.85
);
```

**Resolution Strategies:**

1. **If similarity > 0.95**: Almost certainly duplicate
   - Skip creating new entry
   - Add to existing entry's metadata

2. **If similarity 0.85-0.95**: Likely duplicate
   - Flag for manual review
   - Show both entries to admin

3. **If similarity < 0.85**: New information
   - Proceed with normal flow

### Scenario 2: Contradictory Information

When two knowledge entries contradict each other:

```sql
-- Example: Knowledge says "Open 24/7" but correction says "Closes at 10pm"
```

**Resolution:**

1. Check timestamps and sources
2. Prefer owner_corrections over general knowledge
3. Prefer more recent entries
4. Flag for admin if confidence scores are similar
5. Keep both with metadata about context

### Scenario 3: Multiple Feedback Sources

Same conversation gets multiple feedback sources:

```
Conversation → thumbs_down feedback + owner_correction
```

**Resolution:**

1. Owner correction takes precedence (higher confidence)
2. Link feedback to correction via `source_id`
3. When correction applied, mark feedback as resolved
4. Avoid duplicate knowledge entries

---

## Batch Processing

### Scheduled Batch Job

Runs every hour to process approved learning items:

```sql
SELECT batch_process_learning(p_batch_size := 100);
```

**Process:**

1. Select approved items sorted by confidence (high first)
2. For each item:
   - Check for duplicates using `check_similar_knowledge()`
   - If no duplicate, insert into `knowledge_base_rag`
   - Update learning_queue status to 'applied'
   - Handle errors gracefully, log in metadata
3. Return count of successfully processed items

### Error Handling

```sql
-- Items with errors are NOT deleted
UPDATE learning_queue
SET metadata = metadata || jsonb_build_object(
  'error', 'Duplicate entry found',
  'duplicate_id', 'abc-123',
  'error_time', NOW()
)
WHERE id = 'xyz-789';
```

**Admin can:**
- Review items with errors
- Fix issues
- Retry processing
- Or mark as 'rejected'

---

## Learning Velocity Monitoring

### Key Metrics

Track these to ensure system is learning effectively:

```sql
-- Daily learning velocity
SELECT
  DATE(created_at) as date,
  source_type,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'applied') as applied,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM learning_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), source_type
ORDER BY date DESC;
```

**Healthy System:**
- Pending items < 100 (not overwhelmed)
- Applied items increasing (learning happening)
- Rejected items < 20% (quality is good)
- Time from pending → applied < 24 hours

**Warning Signs:**
- Pending items growing (need more reviewers)
- High rejection rate (quality issues)
- No applied items (pipeline broken)
- Old pending items (> 7 days) (stuck queue)

---

## Admin Workflow

### Daily Review Process

1. **Check Dashboard**
   ```sql
   -- Get pending items ordered by priority
   SELECT id, source_type, confidence_score, proposed_content, created_at
   FROM learning_queue
   WHERE status = 'pending'
   ORDER BY
     CASE source_type
       WHEN 'correction' THEN 1
       WHEN 'feedback' THEN 2
       WHEN 'transcript' THEN 3
       ELSE 4
     END,
     confidence_score DESC,
     created_at ASC
   LIMIT 50;
   ```

2. **Review Item Details**
   ```sql
   -- Get full context for an item
   SELECT
     lq.*,
     cf.feedback_type,
     cf.rating,
     cf.reason,
     cm.transcript,
     cm.summary
   FROM learning_queue lq
   LEFT JOIN conversation_feedback cf ON lq.source_id = cf.id
   LEFT JOIN conversation_memory cm ON cf.conversation_id = cm.id
   WHERE lq.id = 'xyz-789';
   ```

3. **Check for Similar Knowledge**
   ```sql
   -- Before approving, check for duplicates
   SELECT * FROM check_similar_knowledge(
     shop_id := 1,
     p_content := 'proposed content here',
     p_embedding := <vector>,
     p_threshold := 0.85
   );
   ```

4. **Approve or Reject**
   ```sql
   -- Approve
   UPDATE learning_queue
   SET
     status = 'approved',
     reviewed_at = NOW(),
     reviewed_by = 'admin-uuid'
   WHERE id = 'xyz-789';

   -- Reject
   UPDATE learning_queue
   SET
     status = 'rejected',
     reviewed_at = NOW(),
     reviewed_by = 'admin-uuid',
     metadata = metadata || jsonb_build_object('rejection_reason', 'Duplicate entry')
   WHERE id = 'xyz-789';
   ```

5. **Batch Process**
   ```sql
   -- Apply all approved items
   SELECT batch_process_learning(100);
   ```

---

## Integration with Existing RAG System

### How Learning Updates RAG

1. **Direct Insertion**
   ```sql
   -- When learning is applied, it becomes knowledge
   INSERT INTO knowledge_base_rag (shop_id, content, category, embedding, metadata)
   VALUES (1, 'Store closes at 6pm on Sundays', 'hours', <vector>, '{"source": "learning_queue"}');
   ```

2. **Semantic Search**
   - Future queries use RAG to search knowledge
   - Newly learned content is now searchable
   - Embeddings enable semantic matching

3. **Feedback Loop**
   ```
   RAG provides answer → User feedback → Learning queue → New knowledge → Better RAG answers
   ```

### Knowledge Sources

The system tracks where knowledge came from:

```sql
-- Query knowledge by source
SELECT
  category,
  COUNT(*) as count,
  metadata->>'source' as source
FROM knowledge_base_rag
WHERE shop_id = 1
GROUP BY category, metadata->>'source'
ORDER BY count DESC;
```

**Sources:**
- `initial`: Original knowledge base
- `learning_queue`: Learned from feedback/corrections
- `manual`: Manually added by admin

---

## Performance Optimization

### 1. Index Strategy

All tables have indexes optimized for query patterns:
- Foreign keys for JOINs
- Status fields for filtering
- Created_at for time-series queries
- HNSW indexes for vector similarity

### 2. Partitioning (Future)

For high-volume tables (> 10M rows), implement partitioning:

```sql
-- Partition conversation_feedback by month
CREATE TABLE conversation_feedback (
  id UUID,
  -- ... columns
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE conversation_feedback_2025_02 PARTITION OF conversation_feedback
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 3. Materialized Views

Refresh strategies:

```sql
-- Refresh daily metrics (run nightly)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_learning_metrics;

-- Refresh response performance (run hourly)
REFRESH MATERIALIZED VIEW CONCURRENTLY response_performance_metrics;
```

### 4. Connection Pooling

Use PgBouncer for high concurrency:
- Transaction pooling mode
- Pool size: 20-50 connections
- Timeout: 30 seconds

---

## Monitoring and Alerts

### Health Check Queries

```sql
-- 1. Queue health
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  MAX(created_at) FILTER (WHERE status = 'pending') as oldest_pending
FROM learning_queue;

-- 2. Learning velocity (last 7 days)
SELECT
  COUNT(*) FILTER (WHERE status = 'applied') as items_learned
FROM learning_queue
WHERE created_at > NOW() - INTERVAL '7 days';

-- 3. Error rate
SELECT
  COUNT(*) FILTER (WHERE metadata ? 'error') as error_count,
  COUNT(*) as total_count
FROM learning_queue
WHERE created_at > NOW() - INTERVAL '7 days';

-- 4. Response performance
SELECT
  response_type,
  AVG(user_engagement_score) as avg_engagement,
  SUM(CASE WHEN led_to_conversion THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as conversion_rate
FROM response_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY response_type
ORDER BY conversion_rate DESC;
```

### Alert Thresholds

Set up alerts for:
- Pending items > 500 (queue overwhelmed)
- Oldest pending > 48 hours (stuck items)
- Error rate > 10% (processing issues)
- No learning for 24 hours (pipeline broken)
- Conversion rate drops > 20% (quality issue)

---

## Summary

The learning system has 4 main pipelines:

1. **User Feedback** → Low confidence → Requires review → Knowledge
2. **Owner Corrections** → High confidence → Often auto-applied → Knowledge
3. **Voice Transcripts** → Analysis → Optional learning → Insights
4. **Response Analytics** → A/B testing → Best practices → Knowledge

Key features:
- Automatic duplicate detection
- Confidence-based auto-approval
- Batch processing for efficiency
- Complete audit trail
- Performance monitoring

The system continuously improves through:
- Learning from mistakes (negative feedback)
- Capturing corrections (owner input)
- Measuring success (analytics)
- Scaling with batch processing
