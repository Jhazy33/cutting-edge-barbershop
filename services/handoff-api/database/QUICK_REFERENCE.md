# Learning System Testing - Quick Reference

Fast commands for testing the Phase 2.5 learning system.

**Location:** `/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api/database/`

---

## ⚡ Quick Commands

### Run All Tests (Recommended)
```bash
cd /Users/jhazy/AI_Projects/Cutting\ Edge/services/handoff-api/database
./run_all_tests.sh
```

### Verify Migration Only
```bash
psql -U postgres -d postgres -f verify_learning_tables.sql
```

### Insert Test Data Only
```bash
psql -U postgres -d postgres << EOF
BEGIN;
\i test_data_learning.sql
COMMIT;
EOF
```

### Test Triggers Only
```bash
psql -U postgres -d postgres << EOF
BEGIN;
\i test_triggers.sql
ROLLBACK;  # Discards test data
EOF
```

### Cleanup Test Data
```bash
./cleanup_test_data.sh
```

---

## 📊 Quick Verification Queries

### Check Table Counts
```sql
SELECT
  'conversation_feedback' as table_name, COUNT(*) as count FROM conversation_feedback
UNION ALL
SELECT 'owner_corrections', COUNT(*) FROM owner_corrections
UNION ALL
SELECT 'voice_transcripts', COUNT(*) FROM voice_transcripts
UNION ALL
SELECT 'response_analytics', COUNT(*) FROM response_analytics
UNION ALL
SELECT 'learning_queue', COUNT(*) FROM learning_queue;
```

### View Learning Queue
```sql
SELECT
  status,
  source_type,
  COUNT(*) as count,
  ROUND(AVG(confidence_score), 1) as avg_confidence
FROM learning_queue
GROUP BY status, source_type
ORDER BY status, source_type;
```

### Check High-Confidence Items
```sql
SELECT
  id,
  source_type,
  status,
  confidence_score,
  LEFT(proposed_content, 60) as preview
FROM learning_queue
WHERE confidence_score >= 80
ORDER BY confidence_score DESC;
```

### Test Trigger Results
```sql
-- Feedback-triggered entries
SELECT COUNT(*)
FROM learning_queue
WHERE source_type = 'feedback';

-- Correction-triggered entries
SELECT COUNT(*)
FROM learning_queue
WHERE source_type = 'correction';

-- Auto-approved urgent items
SELECT COUNT(*)
FROM learning_queue
WHERE status = 'approved' AND source_type = 'correction';
```

---

## 🔧 Database Connection

### Local Database
```bash
psql -U postgres -d postgres
```

### Remote Database (VPS)
```bash
psql -h 109.199.118.38 -U postgres -d postgres
```

### Using Connection String
```bash
psql "postgresql://postgres:Iverson1975Strong@109.199.118.38:5432/postgres"
```

---

## 📁 File Structure

```
database/
├── migrations/
│   └── 002_create_learning_tables.sql    # Main migration
├── verify_learning_tables.sql             # Verification script
├── test_data_learning.sql                 # Test data insertion
├── test_triggers.sql                      # Trigger testing
├── run_all_tests.sh                       # Run all tests (executable)
├── cleanup_test_data.sh                   # Cleanup test data (executable)
├── TESTING_GUIDE.md                       # Complete guide
└── QUICK_REFERENCE.md                     # This file
```

---

## 🎯 Test Results Expected

### Tables: 5
- ✅ conversation_feedback
- ✅ owner_corrections
- ✅ learning_queue
- ✅ response_analytics
- ✅ voice_transcripts

### Indexes: 26
- ✅ 4 conversation_feedback indexes
- ✅ 5 owner_corrections indexes
- ✅ 6 learning_queue indexes
- ✅ 6 response_analytics indexes
- ✅ 5 voice_transcripts indexes

### Functions: 5
- ✅ trigger_learning_from_negative_feedback()
- ✅ trigger_learning_from_corrections()
- ✅ update_learning_queue_timestamp()
- ✅ check_similar_knowledge()
- ✅ batch_process_learning()

### Triggers: 3
- ✅ trg_feedback_learning
- ✅ trg_corrections_learning
- ✅ trg_learning_queue_updated_at

### Materialized Views: 2
- ✅ daily_learning_metrics
- ✅ response_performance_metrics

---

## 🚨 Common Issues

### Issue: Tests fail with "relation does not exist"
**Solution:** Run migration first
```bash
psql -U postgres -d postgres -f migrations/002_create_learning_tables.sql
```

### Issue: Triggers not firing
**Solution:** Check triggers are enabled
```sql
SELECT trigger_name, tgenabled
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Enable if needed
ALTER TABLE conversation_feedback ENABLE TRIGGER trg_feedback_learning;
ALTER TABLE owner_corrections ENABLE TRIGGER trg_corrections_learning;
```

### Issue: Permission denied
**Solution:** Grant permissions
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO your_user;
```

---

## 📈 Performance Monitoring

### Check Materialized View Refresh Time
```sql
\timing on
REFRESH MATERIALIZED VIEW daily_learning_metrics;
REFRESH MATERIALIZED VIEW response_performance_metrics;
\timing off
```

### Monitor Trigger Performance
```sql
SELECT
  schemaname,
  tablename,
  tgname,
  pg_stat_get_tuples_returned(c.oid) as tuples_returned
FROM pg_stat_user_tables t
JOIN pg_trigger tg ON tg.tgrelid = t.relid
JOIN pg_class c ON c.oid = t.relid
WHERE tg.tgname LIKE '%learning%'
ORDER BY tuples_returned DESC;
```

### Check Index Usage
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename LIKE '%learning%'
   OR tablename LIKE '%feedback%'
   OR tablename LIKE '%correction%'
   OR tablename LIKE '%transcript%'
   OR tablename LIKE '%analytics%'
ORDER BY idx_scan DESC;
```

---

## 🔍 Debug Queries

### Find Orphaned Learning Queue Entries
```sql
SELECT lq.*
FROM learning_queue lq
LEFT JOIN conversation_feedback cf ON lq.source_id = cf.id AND lq.source_type = 'feedback'
LEFT JOIN owner_corrections oc ON lq.source_id = oc.id AND lq.source_type = 'correction'
WHERE lq.source_type IN ('feedback', 'correction')
  AND cf.id IS NULL
  AND oc.id IS NULL;
```

### Check for Duplicate Learning Entries
```sql
SELECT
  source_type,
  source_id,
  COUNT(*) as duplicate_count
FROM learning_queue
WHERE source_id IS NOT NULL
GROUP BY source_type, source_id
HAVING COUNT(*) > 1;
```

### Verify Foreign Key Integrity
```sql
SELECT
  'conversation_feedback' as table_name,
  COUNT(*) as orphaned_count
FROM conversation_feedback cf
LEFT JOIN conversations c ON cf.conversation_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT
  'owner_corrections' as table_name,
  COUNT(*) as orphaned_count
FROM owner_corrections oc
LEFT JOIN conversations c ON oc.conversation_id = c.id
WHERE c.id IS NULL;
```

---

## 📝 Notes

- All SQL scripts use transactions for safety
- Test data includes realistic scenarios
- Trigger tests validate positive and negative cases
- Bash scripts require execution permission: `chmod +x *.sh`
- Default database: postgres, user: postgres, host: localhost

---

**Last Updated:** 2025-02-09
**Testing Suite Version:** 1.0.0
