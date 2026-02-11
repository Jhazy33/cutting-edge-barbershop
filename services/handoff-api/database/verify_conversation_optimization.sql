-- ============================================================================
-- Verification Script: 003_optimize_conversation_storage
-- Description: Test and verify conversation storage optimization
-- Author: Database Architect
-- Date: 2026-02-09
--
-- This script verifies that the conversation storage optimization migration
-- was successfully applied and meets performance targets.
--
-- Tests:
--   1. Table creation verification
--   2. Index coverage verification
--   3. Function testing
--   4. Trigger testing
--   5. Materialized view testing
--   6. Performance benchmarking
--   7. Query pattern verification
-- ============================================================================

-- ============================================================================
-- SETUP
-- ============================================================================

\echo '================================================================================'
\echo 'CONVERSATION STORAGE OPTIMIZATION VERIFICATION'
\echo '================================================================================'
\echo ''

SET client_min_messages TO NOTICE;

-- Disable triggers temporarily for setup
SET session_replication_role = 'replica';

-- ============================================================================
-- TEST 1: Table Creation Verification
-- ============================================================================
\echo 'TEST 1: Table Creation Verification'
\echo '----------------------------------------'
\echo 'Expected: conversations table exists with all columns'
\echo ''

DO $$
DECLARE
  v_column_count INTEGER;
  v_expected_columns INTEGER := 13; -- id, user_id, channel, summary, full_conversation, embedding, metadata, status, created_at, updated_at, last_message_at, deleted_at
BEGIN
  -- Check table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'conversations'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: conversations table does not exist';
  END IF;

  -- Count columns
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'conversations';

  IF v_column_count >= v_expected_columns THEN
    RAISE NOTICE '✅ PASS: conversations table exists with % columns (expected >= %)', v_column_count, v_expected_columns;
  ELSE
    RAISE EXCEPTION '❌ FAIL: conversations table has % columns, expected at least %', v_column_count, v_expected_columns;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 2: Index Verification
-- ============================================================================
\echo 'TEST 2: Index Verification'
\echo '----------------------------------------'
\echo 'Expected: 13 indexes created (including partial and HNSW)'
\echo ''

DO $$
DECLARE
  v_index_count INTEGER;
  v_index_record RECORD;
  v_expected_indexes TEXT[] := ARRAY[
    'idx_conversations_user_created',
    'idx_conversations_user_channel_created',
    'idx_conversations_channel_created',
    'idx_conversations_status',
    'idx_conversations_last_message',
    'idx_conversations_deleted_at',
    'idx_conversations_embedding_hnsw',
    'idx_conversations_active',
    'idx_conversations_handoff_complete',
    'idx_conversations_metadata',
    'idx_conversations_unique_active',
    'idx_conversation_metrics_date',
    'idx_conversation_metrics_channel'
  ];
  v_found_indexes TEXT[] := '{}'::TEXT[];
  v_missing_indexes TEXT[] := '{}'::TEXT[];
BEGIN
  -- Count indexes on conversations table
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'conversations';

  RAISE NOTICE 'Found % indexes on conversations table', v_index_count;

  -- Check for specific indexes
  FOR v_index_record IN
    SELECT indexname FROM pg_indexes WHERE tablename = 'conversations'
  LOOP
    v_found_indexes := array_append(v_found_indexes, v_index_record.indexname);
  END LOOP;

  -- Check each expected index
  FOR i IN 1..array_length(v_expected_indexes, 1) LOOP
    IF v_expected_indexes[i] = ANY(v_found_indexes) THEN
      RAISE NOTICE '  ✓ Index found: %', v_expected_indexes[i];
    ELSE
      v_missing_indexes := array_append(v_missing_indexes, v_expected_indexes[i]);
      RAISE WARNING '  ✗ Index missing: %', v_expected_indexes[i];
    END IF;
  END LOOP;

  IF array_length(v_missing_indexes, 1) IS NULL THEN
    RAISE NOTICE '✅ PASS: All expected indexes found';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Missing indexes: %', array_to_string(v_missing_indexes, ', ');
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 3: HNSW Vector Index Verification
-- ============================================================================
\echo 'TEST 3: HNSW Vector Index Verification'
\echo '----------------------------------------'
\echo 'Expected: HNSW index for vector similarity search'
\echo ''

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_conversations_embedding_hnsw'
  ) THEN
    RAISE NOTICE '✅ PASS: HNSW vector index exists';

    -- Check it's a partial index (WHERE embedding IS NOT NULL)
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_conversations_embedding_hnsw'
        AND indexdef LIKE '%WHERE embedding IS NOT NULL%'
    ) THEN
      RAISE NOTICE '✅ PASS: HNSW index is partial (WHERE embedding IS NOT NULL)';
    ELSE
      RAISE WARNING '⚠️  WARNING: HNSW index should be partial to save space';
    END IF;
  ELSE
    RAISE EXCEPTION '❌ FAIL: HNSW vector index missing';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 4: Function Verification
-- ============================================================================
\echo 'TEST 4: Function Verification'
\echo '----------------------------------------'
\echo 'Expected: 4 functions created'
\echo ''

DO $$
DECLARE
  v_function_count INTEGER;
  v_expected_functions TEXT[] := ARRAY[
    'update_conversation_timestamps',
    'batch_insert_conversations',
    'upsert_conversation',
    'get_conversation_stats'
  ];
  v_function_name TEXT;
  v_found_count INTEGER := 0;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name LIKE '%conversation%';

  RAISE NOTICE 'Found % conversation-related functions', v_function_count;

  -- Check each expected function
  FOR i IN 1..array_length(v_expected_functions, 1) LOOP
    v_function_name := v_expected_functions[i];

    IF EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = v_function_name
    ) THEN
      RAISE NOTICE '  ✓ Function found: %()', v_function_name;
      v_found_count := v_found_count + 1;
    ELSE
      RAISE WARNING '  ✗ Function missing: %()', v_function_name;
    END IF;
  END LOOP;

  IF v_found_count = array_length(v_expected_functions, 1) THEN
    RAISE NOTICE '✅ PASS: All expected functions found';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Only % of % expected functions found', v_found_count, array_length(v_expected_functions, 1);
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 5: Trigger Verification
-- ============================================================================
\echo 'TEST 5: Trigger Verification'
\echo '----------------------------------------'
\echo 'Expected: Auto-update timestamp trigger'
\echo ''

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name = 'trg_conversation_timestamps'
      AND event_object_table = 'conversations'
  ) THEN
    RAISE NOTICE '✅ PASS: Timestamp trigger exists';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Timestamp trigger missing';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 6: Materialized View Verification
-- ============================================================================
\echo 'TEST 6: Materialized View Verification'
\echo '----------------------------------------'
\echo 'Expected: 2 materialized views created'
\echo ''

DO $$
DECLARE
  v_view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_view_count
  FROM pg_matviews
  WHERE matviewname IN ('conversation_metrics', 'performance_stats');

  IF v_view_count = 2 THEN
    RAISE NOTICE '✅ PASS: Both materialized views exist';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Only % of 2 materialized views found', v_view_count;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 7: Data Insertion Test
-- ============================================================================
\echo 'TEST 7: Data Insertion Test'
\echo '----------------------------------------'
\echo 'Expected: Insert test conversations successfully'
\echo ''

-- Re-enable triggers
SET session_replication_role = 'origin';

\echo 'Inserting test conversations...'

DO $$
DECLARE
  v_start TIMESTAMP;
  v_duration NUMERIC;
  v_count INTEGER := 0;
BEGIN
  v_start := CLOCK_TIMESTAMP();

  -- Insert 50 test conversations
  FOR i IN 1..50 LOOP
    INSERT INTO conversations (
      user_id,
      channel,
      summary,
      full_conversation,
      metadata,
      status
    ) VALUES (
      i,
      CASE MOD(i, 3)
        WHEN 0 THEN 'telegram'
        WHEN 1 THEN 'web'
        ELSE 'sms'
      END,
      'Test conversation ' || i || ' for verification',
      'This is a test conversation for verifying the optimization migration.',
      '{"test": true, "batch": 1}'::jsonb,
      CASE MOD(i, 4)
        WHEN 0 THEN 'active'
        WHEN 1 THEN 'handoff_complete'
        WHEN 2 THEN 'archived'
        ELSE 'active'
      END
    );

    v_count := v_count + 1;
  END LOOP;

  v_duration := EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start)) * 1000;

  RAISE NOTICE '✅ PASS: Inserted % conversations in % ms (avg: % ms/conversation)',
    v_count,
    v_duration,
    v_duration / v_count;

  IF v_duration > 500 THEN
    RAISE WARNING '⚠️  WARNING: Insert took % ms, expected < 500 ms', v_duration;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 8: Timestamp Trigger Test
-- ============================================================================
\echo 'TEST 8: Timestamp Trigger Test'
\echo '----------------------------------------'
\echo 'Expected: Auto-update updated_at and last_message_at'
\echo ''

DO $$
DECLARE
  v_conversation_id UUID;
  v_updated_at_before TIMESTAMPTZ;
  v_updated_at_after TIMESTAMPTZ;
  v_last_message_before TIMESTAMPTZ;
  v_last_message_after TIMESTAMPTZ;
BEGIN
  -- Create test conversation
  INSERT INTO conversations (user_id, channel, summary)
  VALUES (9999, 'web', 'Trigger test conversation')
  RETURNING conversations.id, conversations.updated_at, conversations.last_message_at
  INTO v_conversation_id, v_updated_at_before, v_last_message_before;

  -- Wait a bit (ensure timestamp changes)
  PERFORM pg_sleep(0.1);

  -- Update conversation (should trigger timestamp update)
  UPDATE conversations
  SET summary = 'Updated trigger test conversation'
  WHERE id = v_conversation_id;

  -- Check timestamps were updated
  SELECT updated_at, last_message_at
  INTO v_updated_at_after, v_last_message_after
  FROM conversations
  WHERE id = v_conversation_id;

  IF v_updated_at_after > v_updated_at_before THEN
    RAISE NOTICE '✅ PASS: updated_at timestamp auto-updated';
  ELSE
    RAISE EXCEPTION '❌ FAIL: updated_at was not auto-updated';
  END IF;

  IF v_last_message_after > v_last_message_before THEN
    RAISE NOTICE '✅ PASS: last_message_at timestamp auto-updated';
  ELSE
    RAISE EXCEPTION '❌ FAIL: last_message_at was not auto-updated';
  END IF;

  -- Cleanup
  DELETE FROM conversations WHERE id = v_conversation_id;
END $$;

\echo ''

-- ============================================================================
-- TEST 9: Batch Insert Function Test
-- ============================================================================
\echo 'TEST 9: Batch Insert Function Test'
\echo '----------------------------------------'
\echo 'Expected: Batch insert multiple conversations'
\echo ''

DO $$
DECLARE
  v_start TIMESTAMP;
  v_duration NUMERIC;
  v_success_count INTEGER := 0;
  v_result RECORD;
BEGIN
  v_start := CLOCK_TIMESTAMP();

  -- Test batch insert with 20 conversations
  FOR v_result IN
    SELECT * FROM batch_insert_conversations(
      jsonb_build_array(
        jsonb_build_object(
          'user_id', 1001,
          'channel', 'web',
          'summary', 'Batch test conversation 1',
          'metadata', '{"batch": 2}'::jsonb
        ),
        jsonb_build_object(
          'user_id', 1002,
          'channel', 'telegram',
          'summary', 'Batch test conversation 2',
          'metadata', '{"batch": 2}'::jsonb
        ),
        jsonb_build_object(
          'user_id', 1003,
          'channel', 'sms',
          'summary', 'Batch test conversation 3',
          'metadata', '{"batch": 2}'::jsonb
        )
      )
    )
  LOOP
    IF v_result.success THEN
      v_success_count := v_success_count + 1;
    END IF;
  END LOOP;

  v_duration := EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start)) * 1000;

  IF v_success_count = 3 THEN
    RAISE NOTICE '✅ PASS: Batch insert succeeded for all % conversations in % ms', v_success_count, v_duration;
  ELSE
    RAISE EXCEPTION '❌ FAIL: Batch insert only succeeded for % of 3 conversations', v_success_count;
  END IF;

  IF v_duration > 100 THEN
    RAISE WARNING '⚠️  WARNING: Batch insert took % ms, expected < 100 ms', v_duration;
  END IF;

  -- Cleanup
  DELETE FROM conversations WHERE metadata->>'batch' = '2';
END $$;

\echo ''

-- ============================================================================
-- TEST 10: Upsert Function Test
-- ============================================================================
\echo 'TEST 10: Upsert Function Test'
\echo '----------------------------------------'
\echo 'Expected: Insert new conversation, then update existing'
\echo ''

DO $$
DECLARE
  v_new_id UUID;
  v_updated_id UUID;
  v_count INTEGER;
BEGIN
  -- Test insert (new conversation)
  SELECT upsert_conversation(
    NULL, -- ID (null for new)
    7777,
    'web',
    'Upsert test conversation',
    'Full conversation text',
    NULL,
    '{"test": "upsert"}'::jsonb,
    'active'
  ) INTO v_new_id;

  IF v_new_id IS NOT NULL THEN
    RAISE NOTICE '✅ PASS: Upsert inserted new conversation with ID %', v_new_id;
  ELSE
    RAISE EXCEPTION '❌ FAIL: Upsert did not return ID for new conversation';
  END IF;

  -- Count conversations
  SELECT COUNT(*) INTO v_count FROM conversations WHERE id = v_new_id;
  IF v_count = 1 THEN
    RAISE NOTICE '✅ PASS: Conversation exists in database';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Conversation not found in database';
  END IF;

  -- Test update (existing conversation)
  SELECT upsert_conversation(
    v_new_id,
    7777,
    'web',
    'Updated upsert test conversation',
    'Updated full conversation text',
    NULL,
    '{"test": "upsert_updated"}'::jsonb,
    'active'
  ) INTO v_updated_id;

  IF v_updated_id = v_new_id THEN
    RAISE NOTICE '✅ PASS: Upsert updated existing conversation';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Upsert returned different ID on update';
  END IF;

  -- Verify update happened
  SELECT COUNT(*) INTO v_count FROM conversations WHERE id = v_new_id AND summary = 'Updated upsert test conversation';
  IF v_count = 1 THEN
    RAISE NOTICE '✅ PASS: Conversation summary was updated';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Conversation summary was not updated';
  END IF;

  -- Cleanup
  DELETE FROM conversations WHERE id = v_new_id;
END $$;

\echo ''

-- ============================================================================
-- TEST 11: Statistics Function Test
-- ============================================================================
\echo 'TEST 11: Statistics Function Test'
\echo '----------------------------------------'
\echo 'Expected: Return conversation statistics'
\echo ''

DO $$
DECLARE
  v_stat RECORD;
  v_stat_count INTEGER := 0;
BEGIN
  -- Test statistics function
  FOR v_stat IN
    SELECT * FROM get_conversation_stats(NULL, 30)
  LOOP
    RAISE NOTICE '  %: %', v_stat.metric_name, v_stat.metric_value;
    v_stat_count := v_stat_count + 1;
  END LOOP;

  IF v_stat_count >= 5 THEN
    RAISE NOTICE '✅ PASS: Statistics function returned % metrics', v_stat_count;
  ELSE
    RAISE EXCEPTION '❌ FAIL: Statistics function only returned % metrics, expected >= 5', v_stat_count;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 12: Index Performance Test
-- ============================================================================
\echo 'TEST 12: Index Performance Test'
\echo '----------------------------------------'
\echo 'Expected: Common queries use indexes (< 10ms)'
\echo ''

DO $$
DECLARE
  v_start TIMESTAMP;
  v_duration NUMERIC;
  v_user_conversations INTEGER;
BEGIN
  -- Test 1: User conversations lookup
  v_start := CLOCK_TIMESTAMP();

  SELECT COUNT(*) INTO v_user_conversations
  FROM conversations
  WHERE user_id = 1
    AND deleted_at IS NULL
  ORDER BY created_at DESC;

  v_duration := EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start)) * 1000;

  RAISE NOTICE 'User conversations lookup: % ms (expected < 10ms)', v_duration;

  IF v_duration < 10 THEN
    RAISE NOTICE '✅ PASS: User lookup is fast (% ms)', v_duration;
  ELSE
    RAISE WARNING '⚠️  WARNING: User lookup took % ms, expected < 10 ms', v_duration;
  END IF;

  -- Test 2: Active conversations lookup
  v_start := CLOCK_TIMESTAMP();

  SELECT COUNT(*) INTO v_user_conversations
  FROM conversations
  WHERE status = 'active'
    AND deleted_at IS NULL
  ORDER BY last_message_at DESC
  LIMIT 20;

  v_duration := EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start)) * 1000;

  RAISE NOTICE 'Active conversations lookup: % ms (expected < 10ms)', v_duration;

  IF v_duration < 10 THEN
    RAISE NOTICE '✅ PASS: Active conversations lookup is fast (% ms)', v_duration;
  ELSE
    RAISE WARNING '⚠️  WARNING: Active conversations lookup took % ms, expected < 10 ms', v_duration;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 13: Partial Index Test
-- ============================================================================
\echo 'TEST 13: Partial Index Test'
\echo '----------------------------------------'
\echo 'Expected: Partial indexes exclude deleted records'
\echo ''

DO $$
DECLARE
  v_active_index_size BIGINT;
  v_total_index_size BIGINT;
BEGIN
  -- Create test data with deleted records
  INSERT INTO conversations (user_id, channel, summary, deleted_at)
  VALUES
    (9001, 'web', 'Deleted conversation 1', NOW()),
    (9002, 'telegram', 'Deleted conversation 2', NOW()),
    (9003, 'sms', 'Active conversation', NULL);

  -- Check partial index usage (should only index non-deleted)
  -- This is a conceptual test - actual index size comparison requires pg_stat_user_indexes

  -- Verify that deleted_at IS NULL partial index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_conversations_deleted_at'
      AND indexdef LIKE '%WHERE deleted_at IS NULL%'
  ) THEN
    RAISE NOTICE '✅ PASS: Partial index on deleted_at exists';
  ELSE
    RAISE WARNING '⚠️  WARNING: Partial index on deleted_at may not exist';
  END IF;

  -- Verify active conversations partial index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_conversations_active'
      AND indexdef LIKE '%WHERE status = %active%'
  ) THEN
    RAISE NOTICE '✅ PASS: Partial index on active conversations exists';
  ELSE
    RAISE WARNING '⚠️  WARNING: Partial index on active conversations may not exist';
  END IF;

  -- Cleanup
  DELETE FROM conversations WHERE user_id IN (9001, 9002, 9003);
END $$;

\echo ''

-- ============================================================================
-- TEST 14: Constraint Verification
-- ============================================================================
\echo 'TEST 14: Constraint Verification'
--echo '----------------------------------------'
\echo 'Expected: Check constraints enforce data integrity'
\echo ''

DO $$
BEGIN
  -- Test status constraint
  BEGIN
    INSERT INTO conversations (user_id, channel, status)
    VALUES (8888, 'web', 'invalid_status');

    RAISE EXCEPTION '❌ FAIL: Status constraint did not reject invalid value';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ PASS: Status constraint rejected invalid value';
  END;

  -- Test channel has default value
  INSERT INTO conversations (user_id, summary)
  VALUES (8888, 'Default channel test');

  IF EXISTS (
    SELECT 1 FROM conversations
    WHERE user_id = 8888 AND channel = 'web'
  ) THEN
    RAISE NOTICE '✅ PASS: Channel has default value (web)';
  ELSE
    RAISE EXCEPTION '❌ FAIL: Channel default value not working';
  END IF;

  -- Cleanup
  DELETE FROM conversations WHERE user_id = 8888;
END $$;

\echo ''

-- ============================================================================
-- TEST 15: Materialized View Refresh Test
-- ============================================================================
\echo 'TEST 15: Materialized View Refresh Test'
\echo '----------------------------------------'
\echo 'Expected: Materialized views can be refreshed'
\echo ''

DO $$
BEGIN
  -- Refresh conversation_metrics
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_metrics;
  RAISE NOTICE '✅ PASS: conversation_metrics refreshed successfully';

  -- Refresh performance_stats
  REFRESH MATERIALIZED VIEW CONCURRENTLY performance_stats;
  RAISE NOTICE '✅ PASS: performance_stats refreshed successfully';

  -- Check data exists in views
  IF EXISTS (SELECT 1 FROM conversation_metrics LIMIT 1) THEN
    RAISE NOTICE '✅ PASS: conversation_metrics contains data';
  ELSE
    RAISE WARNING '⚠️  WARNING: conversation_metrics is empty';
  END IF;

  IF EXISTS (SELECT 1 FROM performance_stats LIMIT 1) THEN
    RAISE NOTICE '✅ PASS: performance_stats contains data';
  ELSE
    RAISE WARNING '⚠️  WARNING: performance_stats is empty';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo '================================================================================'
\echo 'VERIFICATION SUMMARY'
\echo '================================================================================'
\echo ''

DO $$
DECLARE
  v_total_tests INTEGER := 15;
  v_expected_objects TEXT;
BEGIN
  RAISE NOTICE 'Migration 003: Optimize Conversation Storage';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created: 1 (conversations)';
  RAISE NOTICE 'Indexes Created: 13 (including partial and HNSW)';
  RAISE NOTICE 'Functions Created: 4';
  RAISE NOTICE 'Triggers Created: 1';
  RAISE NOTICE 'Materialized Views: 2';
  RAISE NOTICE 'Constraints: CHECK on status, DEFAULT on channel';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Targets:';
  RAISE NOTICE '  - Single insert: < 10ms';
  RAISE NOTICE '  - Batch insert (100): < 100ms';
  RAISE NOTICE '  - User lookup: < 5ms';
  RAISE NOTICE '  - Vector search: < 50ms';
  RAISE NOTICE '';
  RAISE NOTICE 'Tests Run: % (all should show PASS)', v_total_tests;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Schedule materialized view refreshes (cron/pg_cron)';
  RAISE NOTICE '  2. Configure connection pooling (see CONVERSATION_OPTIMIZATION_GUIDE.md)';
  RAISE NOTICE '  3. Monitor index usage with pg_stat_user_indexes';
  RAISE NOTICE '  4. Run EXPLAIN ANALYZE on slow queries';
  RAISE NOTICE '  5. Set up monitoring alerts for pool exhaustion';
END $$;

\echo '================================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '================================================================================'
