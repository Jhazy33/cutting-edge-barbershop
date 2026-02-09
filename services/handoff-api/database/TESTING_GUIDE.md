# Phase 2.5 Learning System - Testing Suite

Complete testing infrastructure for the Phase 2.5 continuous learning AI system.

## Overview

This testing suite provides comprehensive validation of the learning system database objects, including tables, indexes, functions, triggers, and materialized views.

**Location:** `/Users/jhazy/AI_Projects/Cutting Edge/services/handoff-api/database/`

---

## 📁 Testing Files

### 1. `verify_learning_tables.sql`
**Purpose:** Comprehensive verification of all database objects

**What it checks:**
- ✅ All 5 tables created with correct columns
- ✅ All 26 indexes (including partial and HNSW vector indexes)
- ✅ All 5 functions (triggers + utility functions)
- ✅ All 3 triggers (feedback, correction, timestamp)
- ✅ All 2 materialized views (daily metrics, response performance)
- ✅ All 4 foreign key constraints
- ✅ All 8 check constraints
- ✅ pgvector extension installed
- ✅ Table and column comments

**Usage:**
```bash
psql -U postgres -d your_database -f verify_learning_tables.sql
```

**Expected Output:** Detailed verification report showing all objects exist with correct properties.

---

### 2. `test_data_learning.sql`
**Purpose:** Insert comprehensive test data for validation

**What it inserts:**
- ✅ 5 test conversations (parent records)
- ✅ 5 conversation feedback records (mixed types/ratings)
- ✅ 4 owner corrections (all priority levels: low, normal, high, urgent)
- ✅ 3 voice transcripts (all sentiments: positive, negative, neutral)
- ✅ 6 response analytics records (with conversions and A/B tests)
- ✅ 3 manual learning queue entries (pending, approved, rejected)
- ✅ Auto-generated learning queue entries from triggers

**Usage:**
```bash
# Begin transaction for easy rollback
psql -U postgres -d your_database

# Insert test data
\i test_data_learning.sql

# Verify data
SELECT * FROM conversation_feedback;
SELECT * FROM owner_corrections;
SELECT * FROM voice_transcripts;
SELECT * FROM response_analytics;
SELECT * FROM learning_queue;

# Rollback to discard test data, or COMMIT to keep it
ROLLBACK;
```

**Test Data Coverage:**
- **Edge Cases:** NULL values, boundary values (1-5 stars, 0-100 confidence)
- **Data Types:** UUID, VARCHAR, TEXT, INTEGER, BOOLEAN, JSONB, VECTOR, TIMESTAMPTZ
- **Relationships:** All foreign key constraints tested
- **Triggers:** Negative feedback and corrections auto-generate learning entries
- **Sentiment Analysis:** All sentiment types (positive, neutral, negative)
- **Priority Levels:** All correction priorities (low, normal, high, urgent)

---

### 3. `test_triggers.sql`
**Purpose:** Comprehensive trigger functionality testing

**What it tests:**
- ✅ **Negative Feedback Trigger** → Creates learning_queue entry
- ✅ **Low Rating Trigger** (≤2 stars) → Creates learning_queue entry
- ✅ **Positive Feedback** → Does NOT create learning entry (expected)
- ✅ **Owner Correction Trigger** → Creates learning_queue entry
- ✅ **Urgent Priority** → Auto-approves learning entry (confidence=95)
- ✅ **Confidence Score Mapping** → Correct scores by priority level
- ✅ **Updated At Timestamp** → Auto-updates on record modification
- ✅ **Trigger Metadata** → Validates correct metadata population
- ✅ **Cascade Delete** → Tests foreign key cascade behavior

**Usage:**
```bash
# Begin transaction for easy rollback
psql -U postgres -d your_database

# Run trigger tests
\i test_triggers.sql

# Review test results in output
# Rollback to discard test data, or COMMIT to keep it
ROLLBACK;
```

**Test Coverage:**
- **Test 1:** Thumbs down feedback → learning_queue entry created
- **Test 2:** 1-star rating → learning_queue entry created
- **Test 3:** Thumbs up & 5-star → NO learning entries (correct)
- **Test 4:** Normal priority correction → status=pending, confidence=70
- **Test 5:** Urgent priority correction → status=approved, confidence=95
- **Test 6:** Priority mapping: low=50, normal=70, high=85, urgent=95
- **Test 7:** Updated_at timestamp auto-updates on modification
- **Test 8:** Metadata validation for feedback and correction triggers
- **Test 9:** Cascade delete from conversations table

---

## 🚀 Quick Start

### Option 1: Verify Migration Success
```bash
# After running migration 002_create_learning_tables.sql
psql -U postgres -d your_database -f verify_learning_tables.sql
```

### Option 2: Insert Test Data
```bash
psql -U postgres -d your_database << EOF
BEGIN;
\i test_data_learning.sql
-- Review data
\echo 'Review data above, then:'
SELECT 'ROLLBACK;' or 'COMMIT;' to finish;
EOF
```

### Option 3: Test Triggers
```bash
psql -U postgres -d your_database << EOF
BEGIN;
\i test_triggers.sql
-- Review test results
\echo 'Review results above, then:'
SELECT 'ROLLBACK;' or 'COMMIT;' to finish;
EOF
```

### Option 4: Full Test Suite (Recommended)
```bash
psql -U postgres -d your_database << EOF
-- Step 1: Verify migration
\i verify_learning_tables.sql

-- Step 2: Insert test data
BEGIN;
\i test_data_learning.sql
COMMIT;

-- Step 3: Test triggers
BEGIN;
\i test_triggers.sql
ROLLBACK;
EOF
```

---

## 📊 Expected Results

### Verification Script
```
✓ Table: conversation_feedback exists
✓ Table: owner_corrections exists
✓ Table: learning_queue exists
✓ Table: response_analytics exists
✓ Table: voice_transcripts exists
✓ ALL TABLES CREATED SUCCESSFULLY

✓ conversation_feedback: 8 columns (expected 8)
✓ owner_corrections: 10 columns (expected 10)
✓ learning_queue: 13 columns (expected 13)
✓ response_analytics: 9 columns (expected 9)
✓ voice_transcripts: 10 columns (expected 10)

✓ Total indexes: 26 (expected ~26)
✓ Functions found: 5 (expected 5)
✓ Triggers found: 3 (expected 3)
✓ Materialized views: 2 (expected 2)
✓ Foreign keys found: 4 (expected 4)
✓ pgvector extension installed
```

### Test Data Script
```
✓ 5 test conversations created
✓ 5 feedback records inserted
✓ 4 owner corrections inserted
✓ 3 voice transcripts inserted
✓ 6 analytics records inserted
✓ 3 manual learning queue entries inserted
✓ Auto-generated learning entries from triggers
```

### Trigger Tests
```
✓ SUCCESS: Trigger created learning_queue entry
✓ SUCCESS: Low rating trigger created learning_queue entry
✓ SUCCESS: Positive feedback correctly did NOT create entries
✓ SUCCESS: Correction trigger created learning_queue entry
✓ Auto-approval worked correctly!
✓ All confidence scores mapped correctly
✓ SUCCESS: updated_at timestamp auto-updated
✓ SUCCESS: Cascade delete worked correctly
```

---

## 🔍 Manual Verification Queries

After running test scripts, use these queries to manually verify:

### Check Learning Queue Entries
```sql
-- All learning entries with source info
SELECT
  id,
  status,
  source_type,
  category,
  confidence_score,
  created_at
FROM learning_queue
ORDER BY created_at DESC;
```

### View Trigger-Generated Entries
```sql
-- Feedback-triggered entries
SELECT
  lq.id,
  lq.status,
  lq.metadata->>'feedback_type' as feedback_type,
  lq.metadata->>'rating' as rating,
  lq.confidence_score
FROM learning_queue lq
WHERE lq.source_type = 'feedback'
ORDER BY lq.created_at DESC;

-- Correction-triggered entries
SELECT
  lq.id,
  lq.status,
  lq.metadata->>'priority' as priority,
  lq.confidence_score,
  lq.proposed_content
FROM learning_queue lq
WHERE lq.source_type = 'correction'
ORDER BY lq.confidence_score DESC;
```

### Verify Auto-Approval
```sql
-- Urgent corrections should be auto-approved
SELECT
  oc.id,
  oc.priority,
  lq.status,
  lq.confidence_score
FROM owner_corrections oc
JOIN learning_queue lq ON lq.source_id = oc.id
WHERE oc.priority = 'urgent';
```

### Check Timestamp Updates
```sql
-- Verify updated_at trigger works
SELECT
  id,
  created_at,
  updated_at,
  updated_at > created_at as has_been_updated
FROM learning_queue
ORDER BY updated_at DESC
LIMIT 10;
```

### Test Materialized Views
```sql
-- Refresh materialized views
REFRESH MATERIALIZED VIEW daily_learning_metrics;
REFRESH MATERIALIZED VIEW response_performance_metrics;

-- View daily metrics
SELECT * FROM daily_learning_metrics ORDER BY date DESC;

-- View response performance
SELECT * FROM response_performance_metrics ORDER BY date DESC;
```

---

## 🐛 Troubleshooting

### Issue: Verification shows missing tables
**Solution:** Ensure migration 002_create_learning_tables.sql ran successfully:
```bash
psql -U postgres -d your_database -f migrations/002_create_learning_tables.sql
```

### Issue: Triggers not firing
**Solution:** Check triggers are enabled:
```sql
SELECT
  trigger_name,
  event_object_table,
  tgenabled
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('conversation_feedback', 'owner_corrections', 'learning_queue');

-- Enable if disabled
ALTER TABLE conversation_feedback ENABLE TRIGGER trg_feedback_learning;
ALTER TABLE owner_corrections ENABLE TRIGGER trg_corrections_learning;
ALTER TABLE learning_queue ENABLE TRIGGER trg_learning_queue_updated_at;
```

### Issue: Vector indexes not created
**Solution:** Ensure pgvector extension is installed:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If not installed
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: Learning queue entries not auto-generated
**Solution:** Verify conversation metadata has shop_id:
```sql
SELECT id, metadata FROM conversations WHERE id = 'your-conversation-id';

-- Trigger requires shop_id in metadata
UPDATE conversations
SET metadata = jsonb_set(metadata, '{shop_id}', '1')
WHERE id = 'your-conversation-id';
```

---

## 📋 Test Coverage Summary

| Component | Tests | Coverage |
|-----------|-------|----------|
| **Tables** | 5 | ✓ All verified |
| **Columns** | 50 | ✓ All data types |
| **Indexes** | 26 | ✓ Including partial/HNSW |
| **Functions** | 5 | ✓ All triggers + utility |
| **Triggers** | 3 | ✓ All tested |
| **Materialized Views** | 2 | ✓ Both created |
| **Foreign Keys** | 4 | ✓ Cascade tested |
| **Check Constraints** | 8 | ✓ All validated |
| **Data Types** | 8 | ✓ UUID, JSONB, VECTOR, etc. |
| **Edge Cases** | 15+ | ✓ NULLs, boundaries, etc. |
| **Trigger Logic** | 9 | ✓ All scenarios tested |

---

## 🎯 Success Criteria

All tests pass when:

✅ All 5 tables exist with correct columns
✅ All 26 indexes created (including 2 HNSW vector indexes)
✅ All 5 functions exist and are callable
✅ All 3 triggers fire correctly
✅ All 2 materialized views created successfully
✅ Negative feedback creates learning queue entries
✅ Owner corrections create learning queue entries
✅ Urgent corrections auto-approve (confidence=95)
✅ Priority levels map to correct confidence scores
✅ Updated_at timestamps auto-update on modification
✅ Foreign key cascade deletes work correctly
✅ Vector similarity search indexes functional
✅ Materialized views refresh successfully

---

## 📝 Notes

- All test scripts use transactions for easy rollback
- Test data includes realistic scenarios for validation
- Trigger tests validate both positive and negative cases
- Edge cases covered: NULL values, boundary conditions, cascade deletes
- All SQL is PostgreSQL-compatible and production-ready

---

## 🔄 Maintenance

To refresh test data:
```bash
psql -U postgres -d your_database << EOF
-- Clean existing test data
DELETE FROM learning_queue WHERE metadata ? 'test_trigger';
DELETE FROM conversation_feedback WHERE metadata ? 'test_trigger';
DELETE FROM owner_corrections WHERE metadata ? 'test_trigger';
DELETE FROM voice_transcripts WHERE metadata ? 'test_trigger';
DELETE FROM response_analytics WHERE ab_test_variant IS NOT NULL;

-- Re-insert fresh test data
BEGIN;
\i test_data_learning.sql
COMMIT;
EOF
```

---

**Last Updated:** 2025-02-09
**Author:** Database Architect
**Version:** 1.0.0
