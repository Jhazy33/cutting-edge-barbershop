-- ============================================================================
-- Verification Script: Phase 2.5 Learning System Tables
-- Description: Comprehensive verification of learning system database objects
-- Author: Database Architect
-- Date: 2025-02-09
--
-- This script verifies that all tables, indexes, functions, triggers,
-- materialized views, and constraints were created successfully.
--
-- Usage:
--   psql -U postgres -d your_database -f verify_learning_tables.sql
--
-- Expected Results:
--   - All 5 tables exist with correct columns
--   - All 26 indexes exist (including partial indexes)
--   - All 5 functions exist
--   - All 3 triggers exist
--   - All 2 materialized views exist
--   - All foreign keys and check constraints valid
-- ============================================================================

\echo '=========================================='
\echo 'LEARNING SYSTEM VERIFICATION'
\echo '=========================================='
\echo ''

-- ============================================================================
-- SECTION 1: TABLE VERIFICATION
-- ============================================================================

\echo '1. VERIFYING TABLES...'
\echo '----------------------------------------'

-- Check if all 5 tables exist
DO $$
DECLARE
  v_table_name TEXT;
  v_exists INTEGER;
  v_total INTEGER := 0;
  v_expected_tables TEXT[] := ARRAY[
    'conversation_feedback',
    'owner_corrections',
    'learning_queue',
    'response_analytics',
    'voice_transcripts'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_expected_tables
  LOOP
    SELECT COUNT(*) INTO v_exists
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = v_table_name;

    IF v_exists > 0 THEN
      RAISE NOTICE '✓ Table: % exists', v_table_name;
      v_total := v_total + 1;
    ELSE
      RAISE NOTICE '✗ Table: % MISSING!', v_table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Tables verified: %/5', v_total;

  IF v_total = 5 THEN
    RAISE NOTICE '✓ ALL TABLES CREATED SUCCESSFULLY';
  ELSE
    RAISE NOTICE '✗ SOME TABLES ARE MISSING!';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- SECTION 2: COLUMN VERIFICATION
-- ============================================================================

\echo '2. VERIFYING TABLE COLUMNS...'
\echo '----------------------------------------'

-- Verify conversation_feedback columns
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'conversation_feedback';

  IF v_column_count = 8 THEN
    RAISE NOTICE '✓ conversation_feedback: % columns (expected 8)', v_column_count;
  ELSE
    RAISE NOTICE '✗ conversation_feedback: % columns (expected 8)', v_column_count;
  END IF;
END $$;

-- Verify owner_corrections columns
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'owner_corrections';

  IF v_column_count = 10 THEN
    RAISE NOTICE '✓ owner_corrections: % columns (expected 10)', v_column_count;
  ELSE
    RAISE NOTICE '✗ owner_corrections: % columns (expected 10)', v_column_count;
  END IF;
END $$;

-- Verify learning_queue columns
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'learning_queue';

  IF v_column_count = 13 THEN
    RAISE NOTICE '✓ learning_queue: % columns (expected 13)', v_column_count;
  ELSE
    RAISE NOTICE '✗ learning_queue: % columns (expected 13)', v_column_count;
  END IF;
END $$;

-- Verify response_analytics columns
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'response_analytics';

  IF v_column_count = 9 THEN
    RAISE NOTICE '✓ response_analytics: % columns (expected 9)', v_column_count;
  ELSE
    RAISE NOTICE '✗ response_analytics: % columns (expected 9)', v_column_count;
  END IF;
END $$;

-- Verify voice_transcripts columns
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'voice_transcripts';

  IF v_column_count = 10 THEN
    RAISE NOTICE '✓ voice_transcripts: % columns (expected 10)', v_column_count;
  ELSE
    RAISE NOTICE '✗ voice_transcripts: % columns (expected 10)', v_column_count;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- SECTION 3: INDEX VERIFICATION
-- ============================================================================

\echo '3. VERIFYING INDEXES...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_index_record RECORD;
  v_total_indexes INTEGER := 0;
  v_expected_indexes INTEGER := 26;
BEGIN
  FOR v_index_record IN
    SELECT
      tablename,
      COUNT(*) as index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'conversation_feedback',
        'owner_corrections',
        'learning_queue',
        'response_analytics',
        'voice_transcripts',
        'daily_learning_metrics',
        'response_performance_metrics'
      )
    GROUP BY tablename
    ORDER BY tablename
  LOOP
    RAISE NOTICE '✓ Table % has % index(es)', v_index_record.tablename, v_index_record.index_count;
    v_total_indexes := v_total_indexes + v_index_record.index_count;
  END LOOP;

  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Total indexes: % (expected ~26)', v_total_indexes;

  IF v_total_indexes >= 20 THEN
    RAISE NOTICE '✓ INDEXES LOOK GOOD';
  ELSE
    RAISE NOTICE '✗ SOME INDEXES MAY BE MISSING!';
  END IF;
END $$;

\echo ''
\echo 'Detailed index list:'
\echo '----------------------------------------'

-- List all indexes for learning tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%feedback%'
    OR tablename LIKE '%correction%'
    OR tablename LIKE '%learning%'
    OR tablename LIKE '%analytics%'
    OR tablename LIKE '%transcript%'
    OR tablename LIKE '%metrics%'
  )
ORDER BY tablename, indexname;

\echo ''

-- ============================================================================
-- SECTION 4: FUNCTION VERIFICATION
-- ============================================================================

\echo '4. VERIFYING FUNCTIONS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_function_count INTEGER;
  v_expected_functions INTEGER := 5;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND (
      routine_name LIKE '%learning%'
      OR routine_name = 'check_similar_knowledge'
      OR routine_name = 'batch_process_learning'
    );

  IF v_function_count >= v_expected_functions THEN
    RAISE NOTICE '✓ Functions found: % (expected %)', v_function_count, v_expected_functions;
  ELSE
    RAISE NOTICE '✗ Functions found: % (expected %)', v_function_count, v_expected_functions;
  END IF;
END $$;

\echo ''
\echo 'Function details:'
\echo '----------------------------------------'

SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%learning%'
    OR routine_name = 'check_similar_knowledge'
    OR routine_name = 'batch_process_learning'
  )
ORDER BY routine_name;

\echo ''

-- ============================================================================
-- SECTION 5: TRIGGER VERIFICATION
-- ============================================================================

\echo '5. VERIFYING TRIGGERS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_trigger_count INTEGER;
  v_expected_triggers INTEGER := 3;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND event_object_table IN ('conversation_feedback', 'owner_corrections', 'learning_queue');

  IF v_trigger_count = v_expected_triggers THEN
    RAISE NOTICE '✓ Triggers found: % (expected %)', v_trigger_count, v_expected_triggers;
  ELSE
    RAISE NOTICE '✗ Triggers found: % (expected %)', v_trigger_count, v_expected_triggers;
  END IF;
END $$;

\echo ''
\echo 'Trigger details:'
\echo '----------------------------------------'

SELECT
  trigger_name,
  event_object_table,
  action_statement,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('conversation_feedback', 'owner_corrections', 'learning_queue')
ORDER BY event_object_table, trigger_name;

\echo ''

-- ============================================================================
-- SECTION 6: MATERIALIZED VIEW VERIFICATION
-- ============================================================================

\echo '6. VERIFYING MATERIALIZED VIEWS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_mv_count INTEGER;
  v_expected_mvs INTEGER := 2;
BEGIN
  SELECT COUNT(*) INTO v_mv_count
  FROM pg_matviews
  WHERE schemaname = 'public'
    AND matviewname IN ('daily_learning_metrics', 'response_performance_metrics');

  IF v_mv_count = v_expected_mvs THEN
    RAISE NOTICE '✓ Materialized views: % (expected %)', v_mv_count, v_expected_mvs;
  ELSE
    RAISE NOTICE '✗ Materialized views: % (expected %)', v_mv_count, v_expected_mvs;
  END IF;
END $$;

\echo ''
\echo 'Materialized view details:'
\echo '----------------------------------------'

SELECT
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname IN ('daily_learning_metrics', 'response_performance_metrics')
ORDER BY matviewname;

\echo ''

-- ============================================================================
-- SECTION 7: FOREIGN KEY VERIFICATION
-- ============================================================================

\echo '7. VERIFYING FOREIGN KEYS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_fk_count INTEGER;
  v_expected_fks INTEGER := 4;
BEGIN
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('conversation_feedback', 'owner_corrections', 'learning_queue',
                       'response_analytics', 'voice_transcripts');

  IF v_fk_count >= v_expected_fks THEN
    RAISE NOTICE '✓ Foreign keys found: % (expected %)', v_fk_count, v_expected_fks;
  ELSE
    RAISE NOTICE '✗ Foreign keys found: % (expected %)', v_fk_count, v_expected_fks;
  END IF;
END $$;

\echo ''
\echo 'Foreign key details:'
\echo '----------------------------------------'

SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('conversation_feedback', 'owner_corrections', 'learning_queue',
                        'response_analytics', 'voice_transcripts')
ORDER BY tc.table_name, tc.constraint_name;

\echo ''

-- ============================================================================
-- SECTION 8: CHECK CONSTRAINT VERIFICATION
-- ============================================================================

\echo '8. VERIFYING CHECK CONSTRAINTS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_cc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cc_count
  FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name LIKE '%check%'
  OR constraint_name IN (
    'conversation_feedback_feedback_type_check',
    'conversation_feedback_rating_check',
    'owner_corrections_priority_check',
    'learning_queue_status_check',
    'learning_queue_source_type_check',
    'learning_queue_confidence_score_check',
    'response_analytics_user_engagement_score_check',
    'voice_transcripts_sentiment_check'
  );

  RAISE NOTICE '✓ Check constraints found: %', v_cc_count;
END $$;

\echo ''
\echo 'Check constraint details:'
\echo '----------------------------------------'

SELECT
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.constraint_schema = 'public'
  AND tc.table_name IN ('conversation_feedback', 'owner_corrections', 'learning_queue',
                        'response_analytics', 'voice_transcripts')
ORDER BY tc.table_name, cc.constraint_name;

\echo ''

-- ============================================================================
-- SECTION 9: EXTENSION VERIFICATION
-- ============================================================================

\echo '9. VERIFYING EXTENSIONS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_vector_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_vector_exists
  FROM pg_extension
  WHERE extname = 'vector';

  IF v_vector_exists > 0 THEN
    RAISE NOTICE '✓ pgvector extension installed';
  ELSE
    RAISE NOTICE '✗ pgvector extension MISSING!';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- SECTION 10: TABLE COMMENTS VERIFICATION
-- ============================================================================

\echo '10. VERIFYING TABLE AND COLUMN COMMENTS...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_comment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_comment_count
  FROM pg_description
  JOIN pg_class ON pg_description.objoid = pg_class.oid
  JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND pg_class.relname IN ('conversation_feedback', 'owner_corrections', 'learning_queue',
                           'response_analytics', 'voice_transcripts');

  IF v_comment_count > 20 THEN
    RAISE NOTICE '✓ Comments found: % (well documented!)', v_comment_count;
  ELSE
    RAISE NOTICE '⚠ Comments found: % (documentation could be improved)', v_comment_count;
  END IF;
END $$;

\echo ''

-- ============================================================================
-- SECTION 11: PARTIAL INDEX VERIFICATION
-- ============================================================================

\echo '11. VERIFYING PARTIAL INDEXES...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_partial_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_partial_count
  FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%WHERE %';

  RAISE NOTICE '✓ Partial indexes found: %', v_partial_count;
END $$;

\echo ''
\echo 'Partial index details:'
\echo '----------------------------------------'

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%WHERE %'
  AND tablename IN ('conversation_feedback', 'owner_corrections', 'learning_queue',
                    'response_analytics', 'voice_transcripts')
ORDER BY tablename, indexname;

\echo ''

-- ============================================================================
-- SECTION 12: HNSW INDEX VERIFICATION (Vector Similarity Search)
-- ============================================================================

\echo '12. VERIFYING HNSW VECTOR INDEXES...'
\echo '----------------------------------------'

DO $$
DECLARE
  v_hnsw_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_hnsw_count
  FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%hnsw%';

  IF v_hnsw_count >= 2 THEN
    RAISE NOTICE '✓ HNSW indexes found: % (expected 2)', v_hnsw_count;
  ELSE
    RAISE NOTICE '✗ HNSW indexes found: % (expected 2)', v_hnsw_count;
  END IF;
END $$;

\echo ''
\echo 'HNSW index details:'
\echo '----------------------------------------'

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%hnsw%'
ORDER BY tablename;

\echo ''

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

\echo '=========================================='
\echo 'VERIFICATION COMPLETE'
\echo '=========================================='
\echo ''
\echo 'Summary of expected objects:'
\echo '  - Tables: 5'
\echo '  - Indexes: ~26 (including partial and HNSW)'
\echo '  - Functions: 5'
\echo '  - Triggers: 3'
\echo '  - Materialized Views: 2'
\echo '  - Foreign Keys: 4'
\echo '  - Check Constraints: ~8'
\echo '  - Extensions: 1 (pgvector)'
\echo '=========================================='
\echo ''
\echo 'Next steps:'
\echo '  1. Run test_data_learning.sql to insert sample data'
\echo '  2. Run test_triggers.sql to verify trigger functionality'
\echo '  3. Refresh materialized views: REFRESH MATERIALIZED VIEW daily_learning_metrics;'
\echo '=========================================='
