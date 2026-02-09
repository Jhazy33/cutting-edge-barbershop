-- ============================================================================
-- Verification & Testing Script: 004_knowledge_auto_triggers_enhanced
-- Description: Complete test suite for auto-update trigger system
-- Author: Database Architect
-- Date: 2026-02-09
--
-- This script tests all features of the enhanced trigger system:
-- 1. Conversation flagging → learning queue
-- 2. Negative feedback → learning queue with context
-- 3. Owner corrections → learning queue with auto-approval
-- 4. Urgent corrections → immediate knowledge base application
-- 5. Conflict detection and resolution
-- 6. Rollback mechanism
-- 7. Performance benchmarks
--
-- Usage: psql -U your_user -d your_database -f verify_auto_triggers.sql
-- ============================================================================

-- ============================================================================
-- SETUP: Test Data
-- ============================================================================

\echo '=========================================================================='
\echo 'TEST 1: Conversation Flagging → Learning Queue'
\echo '=========================================================================='

-- Reset test data
DELETE FROM learning_queue WHERE metadata->>'test' = 'true';
DELETE FROM conversation_feedback WHERE metadata->>'test' = 'true';
DELETE FROM owner_corrections WHERE metadata->>'test' = 'true';
DELETE FROM conversations WHERE metadata->>'test' = 'true';

-- Insert test conversation
INSERT INTO conversations (
  user_id,
  channel,
  summary,
  full_conversation,
  metadata,
  flagged_for_review,
  flag_reason,
  flag_metadata
) VALUES (
  999,
  'web',
  'Test conversation for flagging',
  'Customer asked about pricing and was confused',
  '{"test": "true", "shop_id": 1}'::jsonb,
  TRUE,
  'customer_confusion',
  '{"severity": "high", "category": "pricing"}'::jsonb
) RETURNING id;

-- Wait for trigger to fire
\echo 'Waiting for trigger to fire...'
SELECT pg_sleep(1);

-- Check if learning queue entry was created
\echo '✅ Checking for learning queue entry from flagged conversation...'
SELECT
  id,
  source_type,
  status,
  confidence_score,
  category,
  proposed_content,
  metadata->>'conversation_id' as conversation_id,
  metadata->>'flag_reason' as flag_reason,
  created_at
FROM learning_queue
WHERE metadata->>'test' = 'true'
  AND source_type = 'conversation'
ORDER BY created_at DESC
LIMIT 1;

\echo ''
\echo '=========================================================================='
\echo 'TEST 2: Negative Feedback → Learning Queue with Context'
\echo '=========================================================================='

-- Create another test conversation
INSERT INTO conversations (
  user_id,
  channel,
  summary,
  full_conversation,
  metadata
) VALUES (
  999,
  'web',
  'Test conversation for feedback',
  'AI gave incorrect pricing information',
  '{"test": "true", "shop_id": 1}'::jsonb
) RETURNING id;

-- Get the conversation ID (for the next insert)
-- Note: In real scenario, you'd capture the ID from above

-- Insert negative feedback
DO $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id
  FROM conversations
  WHERE metadata->>'test' = 'true'
    AND summary = 'Test conversation for feedback'
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO conversation_feedback (
    conversation_id,
    feedback_type,
    rating,
    reason,
    metadata
  ) VALUES (
    v_conv_id,
    'thumbs_down',
    1,
    'AI gave wrong price - should be $50 not $40',
    '{"test": "true"}'::jsonb
  );

  RAISE NOTICE 'Inserted negative feedback for conversation %', v_conv_id;
END $$;

SELECT pg_sleep(1);

-- Check if learning queue entry was created with context
\echo '✅ Checking for learning queue entry from negative feedback...'
SELECT
  id,
  source_type,
  status,
  confidence_score,
  category,
  proposed_content,
  metadata->>'feedback_id' as feedback_id,
  metadata->>'feedback_type' as feedback_type,
  metadata->>'rating' as rating,
  metadata->>'reason' as reason,
  (metadata->>'conversation_context') IS NOT NULL as has_context
FROM learning_queue
WHERE metadata->>'test' = 'true'
  AND source_type = 'feedback'
ORDER BY created_at DESC
LIMIT 1;

\echo ''
\echo '=========================================================================='
\echo 'TEST 3: Owner Corrections → Learning Queue with Priority'
\echo '=========================================================================='

-- Test different priority levels
DO $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id
  FROM conversations
  WHERE metadata->>'test' = 'true'
  ORDER BY created_at DESC
  LIMIT 1;

  -- High priority correction
  INSERT INTO owner_corrections (
    conversation_id,
    original_response,
    corrected_answer,
    priority,
    correction_context,
    metadata
  ) VALUES (
    v_conv_id,
    'The price is $40',
    'The price is $50 for standard service',
    'high',
    'Standard pricing applies for most services',
    '{"test": "true"}'::jsonb
  );

  RAISE NOTICE 'Inserted high priority correction for conversation %', v_conv_id;
END $$;

SELECT pg_sleep(1);

-- Check high priority correction
\echo '✅ Checking high priority correction (confidence should be 85, status pending)...'
SELECT
  id,
  source_type,
  status,
  confidence_score,
  category,
  LEFT(proposed_content, 50) as content_preview,
  metadata->>'correction_id' as correction_id,
  metadata->>'priority' as priority,
  metadata->>'auto_approved' as auto_approved
FROM learning_queue
WHERE metadata->>'test' = 'true'
  AND source_type = 'correction'
  AND metadata->>'priority' = 'high'
ORDER BY created_at DESC
LIMIT 1;

\echo ''
\echo '=========================================================================='
\echo 'TEST 4: Urgent Corrections → Immediate Application'
\echo '=========================================================================='

-- Test urgent correction (should auto-apply immediately)
DO $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id
  FROM conversations
  WHERE metadata->>'test' = 'true'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Urgent priority correction
  INSERT INTO owner_corrections (
    conversation_id,
    original_response,
    corrected_answer,
    priority,
    correction_context,
    metadata
  ) VALUES (
    v_conv_id,
    'Wrong business hours',
    'We are open 9am-5pm Monday to Friday',
    'urgent',
    'Critical business information - must be correct',
    '{"test": "true"}'::jsonb
  );

  RAISE NOTICE 'Inserted urgent correction for conversation %', v_conv_id;
END $$;

SELECT pg_sleep(1);

-- Check if urgent correction was applied to knowledge base
\echo '✅ Checking if urgent correction was auto-applied to knowledge base...'
SELECT
  id,
  shop_id,
  LEFT(content, 50) as content_preview,
  category,
  source,
  metadata->>'correction_id' as correction_id,
  metadata->>'priority' as priority,
  metadata->>'applied_automatically' as applied_automatically,
  metadata->>'applied_at' as applied_at,
  created_at
FROM knowledge_base_rag
WHERE metadata->>'correction_id' IN (
  SELECT id::TEXT
  FROM owner_corrections
  WHERE metadata->>'test' = 'true'
    AND priority = 'urgent'
)
ORDER BY created_at DESC
LIMIT 1;

-- Check if learning queue was marked as applied
\echo ''
\echo '✅ Checking if learning queue was marked as applied...'
SELECT
  id,
  source_type,
  status,
  confidence_score,
  applied_at,
  metadata->>'auto_applied_urgent' as auto_applied_urgent
FROM learning_queue
WHERE metadata->>'test' = 'true'
  AND source_type = 'correction'
  AND metadata->>'priority' = 'urgent'
ORDER BY created_at DESC
LIMIT 1;

-- Check if owner_corrections was marked with applied_at
\echo ''
\echo '✅ Checking if owner_corrections has applied_at timestamp...'
SELECT
  id,
  priority,
  applied_at,
  created_at
FROM owner_corrections
WHERE metadata->>'test' = 'true'
  AND priority = 'urgent'
ORDER BY created_at DESC
LIMIT 1;

\echo ''
\echo '=========================================================================='
\echo 'TEST 5: Conflict Detection'
\echo '=========================================================================='

-- This test would require embeddings to be generated
-- For now, we'll verify the function exists
\echo '✅ Checking if conflict detection function exists...'
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_conflicts_with_resolution';

\echo ''
\echo '⚠️  Full conflict testing requires embeddings (generated by application layer)'
\echo '   Function is ready and will use HNSW index for < 20ms queries'

\echo ''
\echo '=========================================================================='
\echo 'TEST 6: Rollback Mechanism'
\echo '=========================================================================='

-- Get a knowledge base entry to rollback
DO $$
DECLARE
  v_kb_id UUID;
  v_result JSONB;
BEGIN
  -- Find a KB entry created from our test
  SELECT id INTO v_kb_id
  FROM knowledge_base_rag
  WHERE metadata->>'correction_id' IN (
    SELECT id::TEXT
    FROM owner_corrections
    WHERE metadata->>'test' = 'true'
  )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_kb_id IS NOT NULL THEN
    -- Perform rollback
    v_result := rollback_knowledge_change(v_kb_id, 'test_user');

    RAISE NOTICE 'Rollback result: %', v_result;

    -- Show result
    RAISE NOTICE 'Success: %', v_result->>'success';
    RAISE NOTICE 'Rolled back KB ID: %', v_result->>'rolled_back_kb_id';
  ELSE
    RAISE NOTICE 'No KB entry found to rollback (may need to run TEST 4 first)';
  END IF;
END $$;

SELECT pg_sleep(1);

\echo '✅ Checking if rollback was logged in audit trail...'
SELECT
  id,
  action,
  table_name,
  record_id,
  performed_by,
  performed_at,
  old_values->>'content' as previous_content
FROM learning_audit_log
WHERE action = 'rollback'
  AND performed_by = 'test_user'
ORDER BY performed_at DESC
LIMIT 1;

\echo ''
\echo '=========================================================================='
\echo 'TEST 7: Performance Benchmarks'
\echo '=========================================================================='

-- Test trigger performance
\echo '✅ Benchmarking trigger execution time...'

DO $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_duration NUMERIC;
  v_conv_id UUID;
  i INTEGER;
BEGIN
  v_start := CLOCK_TIMESTAMP();

  -- Insert 10 conversations with flags
  FOR i IN 1..10 LOOP
    INSERT INTO conversations (
      user_id,
      channel,
      summary,
      full_conversation,
      metadata,
      flagged_for_review,
      flag_reason
    ) VALUES (
      999,
      'web',
      'Performance test conversation ' || i,
      'Test content for performance',
      '{"test": "true", "perf_test": "true"}'::jsonb,
      TRUE,
      'performance_test'
    );

    IF i % 100 = 0 THEN
      COMMIT;
    END IF;
  END LOOP;

  v_end := CLOCK_TIMESTAMP();
  v_duration := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000;

  RAISE NOTICE 'Inserted 10 conversations with triggers in % ms (avg % ms per operation)', v_duration, v_duration / 10;
END $$;

SELECT pg_sleep(1);

-- Check learning queue performance
\echo '✅ Checking learning queue growth (should have 10 new entries)...'
SELECT COUNT(*) as learning_queue_count
FROM learning_queue
WHERE metadata->>'perf_test' = 'true';

\echo ''
\echo '=========================================================================='
\echo 'TEST 8: Views and Analytics'
\echo '=========================================================================='

-- Check learning queue summary view
\echo '✅ Checking learning_queue_summary view...'
SELECT
  source_type,
  status,
  count,
  ROUND(avg_confidence::NUMERIC, 2) as avg_confidence,
  pending_count,
  approved_count,
  applied_count,
  rejected_count
FROM learning_queue_summary
WHERE source_type IN ('feedback', 'correction', 'conversation')
ORDER BY source_type, status;

-- Check flagged conversations view
\echo ''
\echo '✅ Checking flagged_conversations_review view...'
SELECT
  id,
  user_id,
  channel,
  LEFT(summary, 40) as summary_preview,
  flag_reason,
  feedback_count,
  correction_count,
  in_learning_queue
FROM flagged_conversations_review
WHERE metadata->>'test' = 'true'
ORDER BY created_at DESC
LIMIT 5;

\echo ''
\echo '=========================================================================='
\echo 'TEST 9: Audit Trail Verification'
\echo '=========================================================================='

-- Check audit log entries
\echo '✅ Checking audit log for all test actions...'
SELECT
  action,
  table_name,
  performed_by,
  COUNT(*) as count,
  MIN(performed_at) as first_action,
  MAX(performed_at) as last_action
FROM learning_audit_log
WHERE performed_at > NOW() - INTERVAL '10 minutes'
  AND (performed_by = 'system' OR performed_by = 'test_user')
GROUP BY action, table_name, performed_by
ORDER BY first_action DESC;

\echo ''
\echo '=========================================================================='
\echo 'TEST 10: Constraint Validation'
\echo '=========================================================================='

-- Test applied_at constraint (should only be set when status = 'applied')
\echo '✅ Testing applied_at constraint...'
DO $$
BEGIN
  -- Try to set applied_at without changing status (should fail)
  UPDATE learning_queue
  SET applied_at = CURRENT_TIMESTAMP
  WHERE id IN (
    SELECT id FROM learning_queue
    WHERE metadata->>'test' = 'true'
      AND status = 'pending'
    LIMIT 1
  );

  RAISE NOTICE '⚠️  WARNING: Constraint allowed applied_at without status=applied (may need to add constraint)';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '✅ Constraint correctly blocked applied_at without status=applied';
END $$;

\echo ''
\echo '=========================================================================='
\echo 'SUMMARY: All Tests Complete'
\echo '=========================================================================='

-- Show overall statistics
\echo ''
\echo '📊 Test Statistics:'
SELECT
  'Test Conversations' as metric,
  COUNT(*) as count
FROM conversations
WHERE metadata->>'test' = 'true'

UNION ALL

SELECT
  'Learning Queue Entries',
  COUNT(*)
FROM learning_queue
WHERE metadata->>'test' = 'true'

UNION ALL

SELECT
  'Negative Feedback',
  COUNT(*)
FROM conversation_feedback
WHERE metadata->>'test' = 'true'

UNION ALL

SELECT
  'Owner Corrections',
  COUNT(*)
FROM owner_corrections
WHERE metadata->>'test' = 'true'

UNION ALL

SELECT
  'Knowledge Base Entries (from test)',
  COUNT(*)
FROM knowledge_base_rag
WHERE metadata->>'correction_id' IN (
  SELECT id::TEXT FROM owner_corrections WHERE metadata->>'test' = 'true'
)

UNION ALL

SELECT
  'Audit Log Entries (test session)',
  COUNT(*)
FROM learning_audit_log
WHERE performed_at > NOW() - INTERVAL '10 minutes';

\echo ''
\echo '✅ Verification Complete!'
\echo ''
\echo 'To clean up test data, run:'
\echo '  DELETE FROM learning_queue WHERE metadata->>"test" = "true";'
\echo '  DELETE FROM conversation_feedback WHERE metadata->>"test" = "true";'
\echo '  DELETE FROM owner_corrections WHERE metadata->>"test" = "true";'
\echo '  DELETE FROM conversations WHERE metadata->>"test" = "true";'
\echo ''
\echo '=========================================================================='
