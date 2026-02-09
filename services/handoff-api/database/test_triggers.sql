-- ============================================================================
-- Trigger Test Script: Phase 2.5 Learning System
-- Description: Comprehensive testing of all learning system triggers
-- Author: Database Architect
-- Date: 2025-02-09
--
-- This script tests:
--   - Negative feedback trigger → creates learning_queue entry
--   - Owner correction trigger → creates learning_queue entry
--   - Updated_at timestamp trigger → auto-updates on modification
--   - Trigger behavior with different priorities and statuses
--
-- Usage:
--   BEGIN;
--   \i test_triggers.sql
--   -- Review results
--   ROLLBACK;  -- Or COMMIT to keep test data
--
-- Expected Results:
--   - 2 feedback entries → 1 learning_queue entry (thumbs_down)
--   - 2 corrections → 2 learning_queue entries (1 auto-approved for urgent)
--   - 1 timestamp update test → updated_at changes
-- ============================================================================

\echo '=========================================='
\echo 'TESTING LEARNING SYSTEM TRIGGERS'
\echo '=========================================='
\echo ''

-- ============================================================================
-- BEGIN TRANSACTION (for easy rollback)
-- ============================================================================

BEGIN;

-- Disable triggers temporarily for setup
SET session_replication_role = 'replica';

-- ============================================================================
-- SETUP: Create test conversation
-- ============================================================================

\echo 'SETUP: Creating test conversation...'
\echo '----------------------------------------'

INSERT INTO conversations (id, user_id, summary, metadata, created_at)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  999,
  'Test conversation for trigger validation',
  '{"shop_id": 999, "test_mode": true}'::jsonb,
  '2025-02-09 10:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
SET session_replication_role = 'origin';

\echo '✓ Test conversation created'
\echo ''

-- ============================================================================
-- TEST 1: Negative Feedback Trigger
-- ============================================================================

\echo 'TEST 1: Negative Feedback Trigger'
\echo '----------------------------------------'
\echo 'Expected: Thumbs down feedback creates learning_queue entry'
\echo ''

-- Record learning_queue count before
WITH before_count AS (
  SELECT COUNT(*) as count FROM learning_queue
  WHERE source_type = 'feedback'
)
SELECT count INTO @learning_queue_before
FROM before_count;

\echo 'Learning queue count (feedback) before: ' || COALESCE(@learning_queue_before::TEXT, '0');

-- Insert thumbs_down feedback (should trigger learning)
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'thumbs_down',
  NULL,
  'Test negative feedback for trigger validation',
  '{"shop_id": 999, "test_trigger": true}'::jsonb
);

\echo '✓ Thumbs down feedback inserted'

-- Check if learning_queue entry was created
DO $$
DECLARE
  v_learning_count INTEGER;
  v_learning_id UUID;
  v_learning_status VARCHAR;
  v_learning_category VARCHAR;
BEGIN
  SELECT COUNT(*) INTO v_learning_count
  FROM learning_queue
  WHERE source_type = 'feedback'
    AND metadata->>'feedback_type' = 'thumbs_down';

  IF v_learning_count > 0 THEN
    RAISE NOTICE '✓ SUCCESS: Trigger created learning_queue entry';

    -- Show details
    SELECT id, status, category INTO v_learning_id, v_learning_status, v_learning_category
    FROM learning_queue
    WHERE source_type = 'feedback'
      AND metadata->>'feedback_type' = 'thumbs_down'
    LIMIT 1;

    RAISE NOTICE '  - Learning ID: %', v_learning_id;
    RAISE NOTICE '  - Status: %', v_learning_status;
    RAISE NOTICE '  - Category: %', v_learning_category;
  ELSE
    RAISE NOTICE '✗ FAILURE: Trigger did NOT create learning_queue entry';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 2: Low Rating Trigger (<= 2 stars)
-- ============================================================================

\echo 'TEST 2: Low Rating Trigger'
\echo '----------------------------------------'
\echo 'Expected: Rating <= 2 creates learning_queue entry'
\echo ''

-- Insert 1-star feedback (should trigger learning)
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'star_rating',
  1,
  'Test low rating for trigger validation',
  '{"shop_id": 999, "test_trigger": true}'::jsonb
);

\echo '✓ 1-star feedback inserted'

-- Verify learning_queue entry
DO $$
DECLARE
  v_learning_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_learning_count
  FROM learning_queue
  WHERE source_type = 'feedback'
    AND metadata->>'rating' = '1';

  IF v_learning_count > 0 THEN
    RAISE NOTICE '✓ SUCCESS: Low rating trigger created learning_queue entry';
  ELSE
    RAISE NOTICE '✗ FAILURE: Low rating trigger did NOT create entry';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 3: Positive Feedback (should NOT trigger)
-- ============================================================================

\echo 'TEST 3: Positive Feedback (No Trigger Expected)'
\echo '----------------------------------------'
\echo 'Expected: Thumbs up and high ratings do NOT create learning_queue'
\echo ''

-- Record count before
SELECT COUNT(*) INTO @positive_count_before
FROM learning_queue
WHERE source_type = 'feedback'
  AND (metadata->>'rating' = '5' OR metadata->>'feedback_type' = 'thumbs_up');

-- Insert positive feedback (should NOT trigger learning)
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'thumbs_up',
  NULL,
  'Test positive feedback - should not trigger',
  '{"shop_id": 999, "test_trigger": true}'::jsonb
);

-- Insert 5-star rating (should NOT trigger learning)
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'star_rating',
  5,
  'Test 5-star rating - should not trigger',
  '{"shop_id": 999, "test_trigger": true}'::jsonb
);

\echo '✓ Positive feedback inserted (thumbs_up and 5-star)'

-- Verify NO learning_queue entries were created
DO $$
DECLARE
  v_learning_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_learning_count
  FROM learning_queue
  WHERE source_type = 'feedback'
    AND (metadata->>'rating' = '5' OR metadata->>'feedback_type' = 'thumbs_up');

  IF v_learning_count = 0 THEN
    RAISE NOTICE '✓ SUCCESS: Positive feedback correctly did NOT create entries';
  ELSE
    RAISE NOTICE '✗ FAILURE: Positive feedback incorrectly created % entries', v_learning_count;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 4: Owner Correction Trigger (Normal Priority)
-- ============================================================================

\echo 'TEST 4: Owner Correction Trigger (Normal Priority)'
\echo '----------------------------------------'
\echo 'Expected: Correction creates learning_queue entry with status=pending'
\echo ''

-- Insert normal priority correction
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority,
  correction_context,
  metadata
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'Test original response that is wrong',
  'Test corrected answer that is accurate',
  'normal',
  'Testing normal priority correction trigger',
  '{"shop_id": 999, "test_trigger": true}'::jsonb
);

\echo '✓ Normal priority correction inserted'

-- Verify learning_queue entry
DO $$
DECLARE
  v_learning_count INTEGER;
  v_learning_status VARCHAR;
  v_confidence_score INTEGER;
BEGIN
  SELECT
    COUNT(*),
    status,
    confidence_score
  INTO v_learning_count, v_learning_status, v_confidence_score
  FROM learning_queue
  WHERE source_type = 'correction'
    AND metadata->>'priority' = 'normal'
  GROUP BY status, confidence_score;

  IF v_learning_count > 0 THEN
    RAISE NOTICE '✓ SUCCESS: Correction trigger created learning_queue entry';
    RAISE NOTICE '  - Status: % (expected: pending)', v_learning_status;
    RAISE NOTICE '  - Confidence: % (expected: 70)', v_confidence_score;

    IF v_learning_status = 'pending' AND v_confidence_score = 70 THEN
      RAISE NOTICE '✓ Values are correct!';
    ELSE
      RAISE NOTICE '⚠ Values do not match expected';
    END IF;
  ELSE
    RAISE NOTICE '✗ FAILURE: Correction trigger did NOT create entry';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 5: Owner Correction Trigger (Urgent Priority - Auto-Approve)
-- ============================================================================

\echo 'TEST 5: Owner Correction Trigger (Urgent Priority)'
\echo '----------------------------------------'
\echo 'Expected: Urgent correction creates learning_queue entry with status=approved'
\echo ''

-- Insert urgent priority correction
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority,
  correction_context,
  metadata
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'Test urgent error - wrong address',
  'Test urgent correction - correct address',
  'urgent',
  'Testing urgent priority with auto-approval',
  '{"shop_id": 999, "test_trigger": true}'::jsonb
);

\echo '✓ Urgent priority correction inserted'

-- Verify learning_queue entry with auto-approval
DO $$
DECLARE
  v_learning_count INTEGER;
  v_learning_status VARCHAR;
  v_confidence_score INTEGER;
BEGIN
  SELECT
    COUNT(*),
    status,
    confidence_score
  INTO v_learning_count, v_learning_status, v_confidence_score
  FROM learning_queue
  WHERE source_type = 'correction'
    AND metadata->>'priority' = 'urgent'
  GROUP BY status, confidence_score;

  IF v_learning_count > 0 THEN
    RAISE NOTICE '✓ SUCCESS: Urgent correction trigger created entry';
    RAISE NOTICE '  - Status: % (expected: approved)', v_learning_status;
    RAISE NOTICE '  - Confidence: % (expected: 95)', v_confidence_score;

    IF v_learning_status = 'approved' AND v_confidence_score = 95 THEN
      RAISE NOTICE '✓ Auto-approval worked correctly!';
    ELSE
      RAISE NOTICE '✗ Auto-approval did not work as expected';
    END IF;
  ELSE
    RAISE NOTICE '✗ FAILURE: Urgent correction trigger did NOT create entry';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 6: Owner Correction Confidence Score Mapping
-- ============================================================================

\echo 'TEST 6: Correction Priority → Confidence Score Mapping'
\echo '----------------------------------------'
\echo 'Testing all priority levels map to correct confidence scores'
\echo ''

DO $$
DECLARE
  v_priority RECORD;
  v_expected_confidence INTEGER;
  v_actual_confidence INTEGER;
  v_test_passed BOOLEAN := TRUE;
BEGIN
  -- Test low priority
  INSERT INTO owner_corrections (
    conversation_id, original_response, corrected_answer,
    priority, correction_context, metadata
  ) VALUES (
    '99999999-9999-9999-9999-999999999999',
    'low', 'low', 'low', 'test low',
    '{"shop_id": 999, "test_confidence": true}'::jsonb
  );

  SELECT confidence_score INTO v_actual_confidence
  FROM learning_queue
  WHERE source_type = 'correction'
    AND metadata->>'priority' = 'low'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_actual_confidence = 50 THEN
    RAISE NOTICE '✓ Low priority → confidence 50 (correct)';
  ELSE
    RAISE NOTICE '✗ Low priority → confidence % (expected 50)', v_actual_confidence;
    v_test_passed := FALSE;
  END IF;

  -- Test high priority
  INSERT INTO owner_corrections (
    conversation_id, original_response, corrected_answer,
    priority, correction_context, metadata
  ) VALUES (
    '99999999-9999-9999-9999-999999999999',
    'high', 'high', 'high', 'test high',
    '{"shop_id": 999, "test_confidence": true}'::jsonb
  );

  SELECT confidence_score INTO v_actual_confidence
  FROM learning_queue
  WHERE source_type = 'correction'
    AND metadata->>'priority' = 'high'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_actual_confidence = 85 THEN
    RAISE NOTICE '✓ High priority → confidence 85 (correct)';
  ELSE
    RAISE NOTICE '✗ High priority → confidence % (expected 85)', v_actual_confidence;
    v_test_passed := FALSE;
  END IF;

  IF v_test_passed THEN
    RAISE NOTICE '✓ All confidence scores mapped correctly';
  ELSE
    RAISE NOTICE '✗ Some confidence scores incorrect';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 7: Updated At Timestamp Trigger
-- ============================================================================

\echo 'TEST 7: Updated At Timestamp Trigger'
\echo '----------------------------------------'
\echo 'Expected: updated_at auto-updates on record modification'
\echo ''

-- Create a learning_queue entry
INSERT INTO learning_queue (
  status,
  source_type,
  shop_id,
  proposed_content,
  category,
  confidence_score,
  metadata
) VALUES (
  'pending',
  'manual',
  999,
  'Test timestamp trigger',
  'test_category',
  75,
  '{"test_timestamp": true}'::jsonb
);

\echo '✓ Learning queue entry created'

-- Get the initial created_at and updated_at
DO $$
DECLARE
  v_entry_id UUID;
  v_initial_created TIMESTAMPTZ;
  v_initial_updated TIMESTAMPTZ;
  v_new_updated TIMESTAMPTZ;
BEGIN
  -- Get initial timestamps
  SELECT id, created_at, updated_at
  INTO v_entry_id, v_initial_created, v_initial_updated
  FROM learning_queue
  WHERE metadata->>'test_timestamp' = 'true'
    AND source_type = 'manual'
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE NOTICE 'Initial created_at: %', v_initial_created;
  RAISE NOTICE 'Initial updated_at: %', v_initial_updated;

  -- Wait a moment and update the record
  PERFORM pg_sleep(0.1);

  UPDATE learning_queue
  SET confidence_score = 80
  WHERE id = v_entry_id;

  -- Get new updated_at
  SELECT updated_at INTO v_new_updated
  FROM learning_queue
  WHERE id = v_entry_id;

  RAISE NOTICE 'New updated_at: %', v_new_updated;

  -- Verify updated_at changed
  IF v_new_updated > v_initial_updated THEN
    RAISE NOTICE '✓ SUCCESS: updated_at timestamp auto-updated';
    RAISE NOTICE '  Time difference: % ms', EXTRACT(EPOCH FROM (v_new_updated - v_initial_updated)) * 1000;
  ELSE
    RAISE NOTICE '✗ FAILURE: updated_at did not change';
  END IF;

  -- Verify created_at did NOT change
  IF v_initial_created = (SELECT created_at FROM learning_queue WHERE id = v_entry_id) THEN
    RAISE NOTICE '✓ created_at remained unchanged (correct)';
  ELSE
    RAISE NOTICE '✗ created_at was modified (incorrect)';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 8: Trigger Metadata Validation
-- ============================================================================

\echo 'TEST 8: Trigger Metadata Validation'
\echo '----------------------------------------'
\echo 'Expected: Triggers populate correct metadata in learning_queue'
\echo ''

DO $$
DECLARE
  v_metadata JSONB;
  v_feedback_id UUID;
BEGIN
  -- Get metadata from a feedback-triggered entry
  SELECT lq.metadata
  INTO v_metadata
  FROM learning_queue lq
  WHERE lq.source_type = 'feedback'
    AND lq.metadata ? 'feedback_id'
  ORDER BY lq.created_at DESC
  LIMIT 1;

  IF v_metadata IS NOT NULL THEN
    RAISE NOTICE '✓ Feedback trigger metadata found';
    RAISE NOTICE 'Metadata contents: %', v_metadata;

    -- Validate required fields
    IF v_metadata ? 'feedback_id'
      AND v_metadata ? 'feedback_type'
      AND v_metadata ? 'conversation_id' THEN
      RAISE NOTICE '✓ All required metadata fields present';
    ELSE
      RAISE NOTICE '✗ Some metadata fields missing';
    END IF;
  ELSE
    RAISE NOTICE '⚠ No feedback-triggered entries found';
  END IF;
END $$;

\echo ''

DO $$
DECLARE
  v_metadata JSONB;
BEGIN
  -- Get metadata from a correction-triggered entry
  SELECT lq.metadata
  INTO v_metadata
  FROM learning_queue lq
  WHERE lq.source_type = 'correction'
    AND lq.metadata ? 'correction_id'
  ORDER BY lq.created_at DESC
  LIMIT 1;

  IF v_metadata IS NOT NULL THEN
    RAISE NOTICE '✓ Correction trigger metadata found';
    RAISE NOTICE 'Metadata contents: %', v_metadata;

    -- Validate required fields
    IF v_metadata ? 'correction_id'
      AND v_metadata ? 'original_response'
      AND v_metadata ? 'priority'
      AND v_metadata ? 'conversation_id' THEN
      RAISE NOTICE '✓ All required metadata fields present';
    ELSE
      RAISE NOTICE '✗ Some metadata fields missing';
    END IF;
  ELSE
    RAISE NOTICE '⚠ No correction-triggered entries found';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 9: Cascade Delete Test
-- ============================================================================

\echo 'TEST 9: Foreign Key Cascade Delete'
\echo '----------------------------------------'
\echo 'Expected: Deleting conversation cascades to feedback/corrections'
\echo ''

-- Create a test conversation for deletion
INSERT INTO conversations (id, user_id, summary, metadata, created_at)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  888,
  'Test conversation for cascade delete',
  '{"shop_id": 888, "test_cascade": true}'::jsonb,
  '2025-02-09 10:00:00+00'
);

-- Add feedback and corrections
INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
VALUES ('88888888-8888-8888-8888-888888888888', 'thumbs_up', 'Test cascade');

INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
VALUES ('88888888-8888-8888-8888-888888888888', 'wrong', 'correct', 'normal');

\echo '✓ Test conversation with dependencies created';

-- Count before delete
DO $$
DECLARE
  v_feedback_before INTEGER;
  v_corrections_before INTEGER;
  v_feedback_after INTEGER;
  v_corrections_after INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_feedback_before
  FROM conversation_feedback
  WHERE conversation_id = '88888888-8888-8888-8888-888888888888';

  SELECT COUNT(*) INTO v_corrections_before
  FROM owner_corrections
  WHERE conversation_id = '88888888-8888-8888-8888-888888888888';

  RAISE NOTICE 'Before delete: feedback=%, corrections=%', v_feedback_before, v_corrections_before;

  -- Delete the conversation (should cascade)
  DELETE FROM conversations
  WHERE id = '88888888-8888-8888-8888-888888888888';

  -- Check if cascade worked
  SELECT COUNT(*) INTO v_feedback_after
  FROM conversation_feedback
  WHERE conversation_id = '88888888-8888-8888-8888-888888888888';

  SELECT COUNT(*) INTO v_corrections_after
  FROM owner_corrections
  WHERE conversation_id = '88888888-8888-8888-8888-888888888888';

  RAISE NOTICE 'After delete: feedback=%, corrections=%', v_feedback_after, v_corrections_after;

  IF v_feedback_after = 0 AND v_corrections_after = 0 THEN
    RAISE NOTICE '✓ SUCCESS: Cascade delete worked correctly';
  ELSE
    RAISE NOTICE '✗ FAILURE: Cascade delete did not work';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

\echo '=========================================='
\echo 'TRIGGER TEST SUMMARY'
\echo '=========================================='
\echo ''

DO $$
DECLARE
  v_total_feedback INTEGER;
  v_negative_feedback INTEGER;
  v_total_corrections INTEGER;
  v_total_learning_queue INTEGER;
  v_feedback_triggered INTEGER;
  v_correction_triggered INTEGER;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO v_total_feedback FROM conversation_feedback
  WHERE conversation_id = '99999999-9999-9999-9999-999999999999';

  SELECT COUNT(*) INTO v_negative_feedback FROM conversation_feedback
  WHERE conversation_id = '99999999-9999-9999-9999-999999999999'
    AND (feedback_type = 'thumbs_down' OR rating <= 2);

  SELECT COUNT(*) INTO v_total_corrections FROM owner_corrections
  WHERE conversation_id = '99999999-9999-9999-9999-999999999999';

  SELECT COUNT(*) INTO v_feedback_triggered FROM learning_queue
  WHERE source_type = 'feedback'
    AND metadata->>'conversation_id' = '99999999-9999-9999-9999-999999999999';

  SELECT COUNT(*) INTO v_correction_triggered FROM learning_queue
  WHERE source_type = 'correction'
    AND metadata->>'conversation_id' = '99999999-9999-9999-9999-999999999999';

  SELECT COUNT(*) INTO v_total_learning_queue FROM learning_queue
  WHERE metadata->>'conversation_id' = '99999999-9999-9999-9999-999999999999';

  -- Display summary
  RAISE NOTICE 'Test Results:';
  RAISE NOTICE '  - Total feedback inserted: %', v_total_feedback;
  RAISE NOTICE '  - Negative feedback (should trigger): %', v_negative_feedback;
  RAISE NOTICE '  - Total corrections inserted: %', v_total_corrections;
  RAISE NOTICE '  - Learning queue entries from feedback: %', v_feedback_triggered;
  RAISE NOTICE '  - Learning queue entries from corrections: %', v_correction_triggered;
  RAISE NOTICE '  - Total learning queue entries: %', v_total_learning_queue;
  RAISE NOTICE '';

  -- Validate results
  IF v_feedback_triggered >= v_negative_feedback THEN
    RAISE NOTICE '✓ Feedback trigger working correctly';
  ELSE
    RAISE NOTICE '✗ Feedback trigger may have issues';
  END IF;

  IF v_correction_triggered = v_total_corrections THEN
    RAISE NOTICE '✓ Correction trigger working correctly';
  ELSE
    RAISE NOTICE '✗ Correction trigger may have issues';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- QUERY EXAMPLES FOR MANUAL VERIFICATION
-- ============================================================================

\echo '=========================================='
\echo 'MANUAL VERIFICATION QUERIES'
\echo '=========================================='
\echo ''
\echo '-- View all feedback-triggered learning entries:'
\echo 'SELECT * FROM learning_queue WHERE source_type = ''feedback'';'
\echo ''
\echo '-- View all correction-triggered learning entries:'
\echo 'SELECT * FROM learning_queue WHERE source_type = ''correction'';'
\echo ''
\echo '-- Check auto-approved urgent corrections:'
\echo 'SELECT * FROM learning_queue WHERE status = ''approved'' AND source_type = ''correction'';'
\echo ''
\echo '-- View trigger metadata:'
\echo 'SELECT id, source_type, status, metadata FROM learning_queue ORDER BY created_at DESC;'
\echo ''
\echo '-- Verify timestamp updates:'
\echo 'SELECT id, created_at, updated_at FROM learning_queue WHERE metadata ? ''test_timestamp'';'
\echo ''

-- ============================================================================
-- TRANSACTION SUMMARY
-- ============================================================================

\echo '=========================================='
\echo 'TRANSACTION READY TO COMMIT'
\echo '=========================================='
\echo ''
\echo 'All trigger tests have been run within a transaction.'
\echo ''
\echo 'To keep test data: COMMIT;'
\echo 'To discard test data: ROLLBACK;'
\echo ''
\echo 'Test Coverage:'
\echo '  ✓ Negative feedback trigger (thumbs_down)'
\echo '  ✓ Low rating trigger (rating <= 2)'
\echo '  ✓ Positive feedback (no trigger expected)'
\echo '  ✓ Owner correction trigger (normal priority)'
\echo '  ✓ Owner correction trigger (urgent priority - auto-approve)'
\echo '  ✓ Confidence score mapping by priority'
\echo '  ✓ Updated_at timestamp trigger'
\echo '  ✓ Trigger metadata validation'
\echo '  ✓ Foreign key cascade delete'
\echo '=========================================='
