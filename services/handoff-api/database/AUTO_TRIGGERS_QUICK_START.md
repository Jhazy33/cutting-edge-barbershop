# Auto-Triggers Quick Start Guide

**Version**: 1.0.0
**Last Updated**: 2026-02-09

---

## What This Does

The auto-update trigger system automatically learns from:
- ❌ **Negative feedback** (thumbs down, 1-2 stars)
- ✏️ **Owner corrections** (business fixes AI mistakes)
- 🚩 **Flagged conversations** (manually marked for review)

And automatically:
- Creates learning queue entries
- Approves high-confidence items (≥90%)
- Applies urgent corrections immediately
- Detects conflicts using vector similarity
- Logs everything to audit trail

---

## Quick Test (5 Minutes)

### 1. Test Negative Feedback

```sql
-- Insert a test conversation
INSERT INTO conversations (user_id, channel, summary, metadata)
VALUES (999, 'web', 'Customer asked about pricing', '{"shop_id": 1}')
RETURNING id;

-- Replace UUID below with actual conversation ID
INSERT INTO conversation_feedback (conversation_id, feedback_type, rating, reason)
VALUES ('YOUR-CONVERSATION-UUID', 'thumbs_down', 1, 'AI gave wrong price');

-- Check learning queue (should have 1 entry)
SELECT * FROM learning_queue
WHERE source_type = 'feedback'
ORDER BY created_at DESC LIMIT 1;
```

### 2. Test Urgent Correction

```sql
-- Insert urgent correction
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority
) VALUES (
  'YOUR-CONVERSATION-UUID',
  'The price is $40',
  'The price is $50 for standard service',
  'urgent'
);

-- Check knowledge base (should be applied immediately)
SELECT * FROM knowledge_base_rag
WHERE metadata->>'priority' = 'urgent'
ORDER BY created_at DESC LIMIT 1;
```

### 3. Test Flagged Conversation

```sql
-- Flag a conversation for review
UPDATE conversations
SET flagged_for_review = TRUE,
    flag_reason = 'customer_complaint',
    flag_metadata = '{"severity": "high"}'::jsonb
WHERE id = 'YOUR-CONVERSATION-UUID';

-- Check learning queue
SELECT * FROM learning_queue
WHERE source_type = 'conversation'
ORDER BY created_at DESC LIMIT 1;
```

### 4. Test Rollback

```sql
-- Find a knowledge base ID to rollback
SELECT id, LEFT(content, 50) as content
FROM knowledge_base_rag
ORDER BY created_at DESC LIMIT 5;

-- Rollback it (replace UUID)
SELECT rollback_knowledge_change('YOUR-KB-ID', 'test_user');

-- Verify it was rolled back (should not exist)
SELECT * FROM knowledge_base_rag WHERE id = 'YOUR-KB-ID';
```

---

## Confidence Scores

| Source | Confidence | Auto-Approve |
|--------|-----------|--------------|
| 1-star feedback | 60 | ❌ No |
| Thumbs down with reason | 55 | ❌ No |
| Thumbs down without reason | 50 | ❌ No |
| Urgent correction | 95 | ✅ Yes |
| High priority correction | 85 | ❌ No |
| Normal priority correction | 70 | ❌ No |
| Low priority correction | 50 | ❌ No |
| Critical flagged conversation | 80 | ❌ No |
| High flagged conversation | 70 | ❌ No |
| Normal flagged conversation | 60 | ❌ No |

**Auto-approval threshold**: 90+ confidence score

---

## Learning Queue Status Flow

```
pending → approved → applied
   ↓
rejected (manual review)
```

**Status meanings**:
- `pending`: Waiting for review
- `approved`: Approved for application (auto or manual)
- `applied`: Applied to knowledge base
- `rejected`: Rejected by reviewer

---

## Common Queries

### View All Pending Learning

```sql
SELECT
  id,
  source_type,
  confidence_score,
  LEFT(proposed_content, 50) as content_preview,
  created_at
FROM learning_queue
WHERE status = 'pending'
ORDER BY confidence_score DESC, created_at ASC;
```

### View Learning from Feedback

```sql
SELECT
  lq.id,
  lq.confidence_score,
  LEFT(lq.proposed_content, 50) as content_preview,
  cf.feedback_type,
  cf.rating,
  cf.reason
FROM learning_queue lq
JOIN conversation_feedback cf ON cf.id = (lq.metadata->>'feedback_id')::UUID
WHERE lq.source_type = 'feedback'
ORDER BY lq.created_at DESC;
```

### View Learning from Corrections

```sql
SELECT
  lq.id,
  lq.status,
  lq.confidence_score,
  LEFT(lq.proposed_content, 50) as content_preview,
  oc.priority,
  LEFT(oc.original_response, 30) as original,
  oc.applied_at
FROM learning_queue lq
JOIN owner_corrections oc ON oc.id = (lq.metadata->>'correction_id')::UUID
WHERE lq.source_type = 'correction'
ORDER BY lq.created_at DESC;
```

### View Learning from Flagged Conversations

```sql
SELECT
  lq.id,
  lq.confidence_score,
  LEFT(lq.proposed_content, 50) as content_preview,
  c.flag_reason,
  c.flag_metadata->>'severity' as severity,
  c.summary
FROM learning_queue lq
JOIN conversations c ON c.id = (lq.metadata->>'conversation_id')::UUID
WHERE lq.source_type = 'conversation'
ORDER BY lq.created_at DESC;
```

### View Audit Trail

```sql
SELECT
  action,
  table_name,
  performed_by,
  performed_at,
  old_values,
  new_values
FROM learning_audit_log
WHERE performed_at > NOW() - INTERVAL '24 hours'
ORDER BY performed_at DESC;
```

### Check for Conflicts

```sql
-- Requires embeddings to be generated
SELECT * FROM check_conflicts_with_resolution('YOUR-LEARNING-ID', 0.85);
```

---

## Performance Tips

### 1. Use Batch Operations

```sql
-- Instead of multiple single inserts
INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
VALUES
  ('uuid1', 'wrong1', 'correct1', 'high'),
  ('uuid2', 'wrong2', 'correct2', 'normal'),
  ('uuid3', 'wrong3', 'correct3', 'urgent');
```

### 2. Indexes Exist For

- ✅ User conversation lookups
- ✅ Feedback type and ratings
- ✅ Correction priority
- ✅ Learning queue status and confidence
- ✅ Vector similarity (HNSW)
- ✅ Flagged conversations
- ✅ Audit log actions

### 3. Monitor Performance

```sql
-- Check trigger execution time
SELECT
  action,
  COUNT(*) as count,
  EXTRACT(EPOCH FROM (MAX(performed_at) - MIN(performed_at))) / 60 as minutes
FROM learning_audit_log
WHERE performed_at > NOW() - INTERVAL '1 hour'
GROUP BY action
ORDER BY count DESC;
```

---

## Troubleshooting

### Triggers Not Firing

```sql
-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%learning%';

-- Expected output:
-- trg_feedback_learning | conversation_feedback
-- trg_corrections_learning | owner_corrections
-- trg_conversation_review_learning | conversations
-- trg_auto_approve_learning | learning_queue
-- trg_apply_approved_learning | learning_queue
-- trg_audit_learning_changes | learning_queue
```

### Learning Queue Empty

```sql
-- Check if feedback/corrections exist
SELECT COUNT(*) FROM conversation_feedback WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT COUNT(*) FROM owner_corrections WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check if learning queue has any entries
SELECT COUNT(*) FROM learning_queue WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Urgent Corrections Not Applied

```sql
-- Check urgent corrections
SELECT
  oc.id,
  oc.priority,
  oc.applied_at,
  lq.status as learning_status
FROM owner_corrections oc
LEFT JOIN learning_queue lq ON lq.source_id = oc.id::TEXT AND lq.source_type = 'correction'
WHERE oc.priority = 'urgent'
ORDER BY oc.created_at DESC;
```

### Rollback Failed

```sql
-- Check audit log for rollback attempts
SELECT
  record_id,
  old_values,
  new_values,
  performed_by
FROM learning_audit_log
WHERE action = 'rollback'
ORDER BY performed_at DESC LIMIT 5;
```

---

## API Integration Examples

### Submit Feedback (Auto-triggers learning)

```typescript
// This INSERT automatically creates learning queue entry
await db.insert('conversation_feedback', {
  conversation_id: 'conv-uuid',
  feedback_type: 'thumbs_down',
  rating: 1,
  reason: 'AI gave incorrect pricing information'
});
```

### Submit Correction (Auto-approves if urgent)

```typescript
// This INSERT automatically creates learning queue entry
// If priority='urgent', it's applied immediately to knowledge base
await db.insert('owner_corrections', {
  conversation_id: 'conv-uuid',
  original_response: 'The price is $40',
  corrected_answer: 'The price is $50',
  priority: 'urgent'
});
```

### Flag Conversation (Auto-triggers learning)

```typescript
// This UPDATE automatically creates learning queue entry
await db.update('conversations', 'conv-uuid', {
  flagged_for_review: true,
  flag_reason: 'customer_complaint',
  flag_metadata: { severity: 'high', category: 'pricing' }
});
```

### Rollback Knowledge Change

```typescript
// Rollback a knowledge base entry
const result = await db.query(`
  SELECT rollback_knowledge_change($1, $2) as result
`, ['kb-uuid', 'admin@company.com']);

console.log(result.result);
// { success: true, rolled_back_kb_id: 'kb-uuid', ... }
```

---

## Monitoring Dashboard

### Daily Summary

```sql
SELECT
  DATE(created_at) as date,
  source_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'applied') as applied,
  ROUND(AVG(confidence_score), 2) as avg_confidence
FROM learning_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), source_type
ORDER BY date DESC, source_type;
```

### Pending Review Queue

```sql
SELECT
  source_type,
  COUNT(*) as pending_count,
  MIN(confidence_score) as min_confidence,
  MAX(confidence_score) as max_confidence,
  ROUND(AVG(confidence_score), 2) as avg_confidence
FROM learning_queue
WHERE status = 'pending'
GROUP BY source_type
ORDER BY pending_count DESC;
```

### Recent Knowledge Changes

```sql
SELECT
  kb.id,
  LEFT(kb.content, 50) as content_preview,
  kb.source,
  kb.metadata->>'learning_queue_id' as learning_queue_id,
  kb.metadata->>'confidence_score' as confidence,
  kb.created_at
FROM knowledge_base_rag kb
WHERE kb.created_at > NOW() - INTERVAL '24 hours'
ORDER BY kb.created_at DESC;
```

---

## Best Practices

### DO ✅

- Use appropriate confidence scores based on data quality
- Provide reasons for feedback to increase confidence
- Use 'urgent' priority only for critical corrections
- Monitor learning queue regularly
- Review and reject low-quality learning items
- Use rollback for incorrect automatic applications

### DON'T ❌

- Don't manually set confidence_score to 100 (reserved for system)
- Don't bypass trigger system (always use standard INSERT/UPDATE)
- Don't delete from learning_queue without audit trail
- Don't ignore pending items with high confidence
- Don't use 'urgent' priority for non-critical corrections
- Don't forget to monitor performance under load

---

## Clean Up Test Data

```sql
-- Remove all test data
DELETE FROM learning_queue WHERE metadata->>'test' = 'true';
DELETE FROM conversation_feedback WHERE metadata->>'test' = 'true';
DELETE FROM owner_corrections WHERE metadata->>'test' = 'true';
DELETE FROM conversations WHERE metadata->>'test' = 'true';

-- Verify cleanup
SELECT
  'learning_queue' as table_name, COUNT(*) as count FROM learning_queue WHERE metadata->>'test' = 'true'
UNION ALL
SELECT 'conversation_feedback', COUNT(*) FROM conversation_feedback WHERE metadata->>'test' = 'true'
UNION ALL
SELECT 'owner_corrections', COUNT(*) FROM owner_corrections WHERE metadata->>'test' = 'true'
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations WHERE metadata->>'test' = 'true';
```

---

## Next Steps

1. **Run the test suite**: `psql ... -f database/verify_auto_triggers.sql`
2. **Monitor for 24 hours**: Check learning queue growth
3. **Review auto-approved items**: Verify quality
4. **Adjust confidence thresholds**: If too many/false positives
5. **Set up monitoring**: Track performance metrics

---

## Support

For detailed documentation, see: `database/AUTO_TRIGGERS_DOCUMENTATION.md`

For questions or issues, contact the Database Architect.

---

**End of Quick Start Guide**
