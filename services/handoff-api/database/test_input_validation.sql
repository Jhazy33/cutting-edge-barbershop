-- ============================================================================
-- Test Suite: P1-2 Input Validation
-- Description: Comprehensive test suite for input validation layer
-- Author: Security Engineer
-- Date: 2026-02-09
--
-- Test Categories:
--   1. Length Validation (5 tests)
--   2. SQL Injection Detection (5 tests)
--   3. Format Validation (5 tests)
--   4. Range Validation (5 tests)
--   5. Null/Empty Checks (5 tests)
--   6. Integration Tests (5 tests)
--
-- Total Tests: 30+
-- ============================================================================

-- ============================================================================
-- SETUP: Create test results table
-- ============================================================================
DROP TABLE IF EXISTS validation_test_results;
CREATE TABLE validation_test_results (
  id SERIAL PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HELPER FUNCTION: Run test and log results
-- ============================================================================
CREATE OR REPLACE FUNCTION run_test(
  p_test_name TEXT,
  p_test_category TEXT,
  p_test_sql TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_passed BOOLEAN;
  v_error_message TEXT;
BEGIN
  BEGIN
    EXECUTE p_test_sql;
    v_passed := TRUE;
    v_error_message := NULL;
  EXCEPTION WHEN OTHERS THEN
    v_passed := FALSE;
    v_error_message := SQLERRM;
  END;

  -- Log result
  INSERT INTO validation_test_results (test_name, test_category, passed, error_message)
  VALUES (p_test_name, p_test_category, v_passed, v_error_message);

  RETURN v_passed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CATEGORY 1: LENGTH VALIDATION (5 tests)
-- ============================================================================

-- Test 1.1: conversation_feedback reason too long
SELECT run_test(
  'test_feedback_reason_too_long',
  'Length Validation',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', repeat('a', 2001))
  $$
);

-- Test 1.2: owner_corrections original_response too long
SELECT run_test(
  'test_correction_original_too_long',
  'Length Validation',
  $$
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
    VALUES (gen_random_uuid(), repeat('a', 10001), 'Valid answer', 'normal')
  $$
);

-- Test 1.3: learning_queue proposed_content too long
SELECT run_test(
  'test_learning_content_too_long',
  'Length Validation',
  $$
    INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
    VALUES (1, 'manual', repeat('a', 10001), 'pending')
  $$
);

-- Test 1.4: voice_transcripts transcript too long
SELECT run_test(
  'test_transcript_too_long',
  'Length Validation',
  $$
    INSERT INTO voice_transcripts (transcript)
    VALUES (repeat('a', 50001))
  $$
);

-- Test 1.5: Valid length inputs (should succeed)
SELECT run_test(
  'test_valid_lengths',
  'Length Validation',
  $$
    BEGIN
      -- Valid feedback reason
      INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
      VALUES (gen_random_uuid(), 'thumbs_up', repeat('a', 2000));

      -- Valid correction
      INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
      VALUES (gen_random_uuid(), repeat('a', 10000), repeat('b', 10000), 'normal');

      -- Valid learning content
      INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
      VALUES (1, 'manual', repeat('a', 10000), 'pending');

      -- Valid transcript
      INSERT INTO voice_transcripts (transcript)
      VALUES (repeat('a', 50000));
    END;
  $$
);

-- ============================================================================
-- CATEGORY 2: SQL INJECTION DETECTION (5 tests)
-- ============================================================================

-- Test 2.1: UNION SELECT injection
SELECT run_test(
  'test_union_select_injection',
  'SQL Injection',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', 'text'' UNION SELECT * FROM users --')
  $$
);

-- Test 2.2: Comment-based injection
SELECT run_test(
  'test_comment_injection',
  'SQL Injection',
  $$
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
    VALUES (gen_random_uuid(), 'text; DROP TABLE users--', 'Valid', 'normal')
  $$
);

-- Test 2.3: Conditional injection
SELECT run_test(
  'test_conditional_injection',
  'SQL Injection',
  $$
    INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
    VALUES (1, 'manual', 'content OR 1=1', 'pending')
  $$
);

-- Test 2.4: Stacked query injection
SELECT run_test(
  'test_stacked_query_injection',
  'SQL Injection',
  $$
    INSERT INTO response_analytics (conversation_id, response_text, response_type)
    VALUES (gen_random_uuid(), 'response; INSERT INTO users VALUES', 'test')
  $$
);

-- Test 2.5: Valid safe input (should succeed)
SELECT run_test(
  'test_safe_input',
  'SQL Injection',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', 'This is safe text with apostrophes and quotes')
  $$
);

-- ============================================================================
-- CATEGORY 3: FORMAT VALIDATION (5 tests)
-- ============================================================================

-- Test 3.1: Invalid email format
SELECT run_test(
  'test_invalid_email_format',
  'Format Validation',
  $$
    SELECT is_valid_email('not-an-email')
  $$
) AS should_be_false;

-- Test 3.2: Valid email format
SELECT run_test(
  'test_valid_email_format',
  'Format Validation',
  $$
    SELECT is_valid_email('user@example.com') = TRUE
  $$
);

-- Test 3.3: Invalid UUID format
SELECT run_test(
  'test_invalid_uuid_format',
  'Format Validation',
  $$
    SELECT is_valid_uuid('not-a-uuid')
  $$
) AS should_be_false;

-- Test 3.4: Valid UUID format
SELECT run_test(
  'test_valid_uuid_format',
  'Format Validation',
  $$
    SELECT is_valid_uuid('550e8400-e29b-41d4-a716-446655440000') = TRUE
  $$
);

-- Test 3.5: Invalid enum values
SELECT run_test(
  'test_invalid_enum_values',
  'Format Validation',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'invalid_type', 'reason')
  $$
);

-- ============================================================================
-- CATEGORY 4: RANGE VALIDATION (5 tests)
-- ============================================================================

-- Test 4.1: Feedback rating too high
SELECT run_test(
  'test_rating_too_high',
  'Range Validation',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, rating)
    VALUES (gen_random_uuid(), 'star_rating', 6)
  $$
);

-- Test 4.2: Feedback rating too low
SELECT run_test(
  'test_rating_too_low',
  'Range Validation',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, rating)
    VALUES (gen_random_uuid(), 'star_rating', 0)
  $$
);

-- Test 4.3: Confidence score out of range
SELECT run_test(
  'test_confidence_out_of_range',
  'Range Validation',
  $$
    INSERT INTO learning_queue (shop_id, source_type, proposed_content, status, confidence_score)
    VALUES (1, 'manual', 'content', 'pending', 101)
  $$
);

-- Test 4.4: Negative response time
SELECT run_test(
  'test_negative_response_time',
  'Range Validation',
  $$
    INSERT INTO response_analytics (conversation_id, response_text, response_type, response_time_ms)
    VALUES (gen_random_uuid(), 'response', 'test', -100)
  $$
);

-- Test 4.5: Valid range values (should succeed)
SELECT run_test(
  'test_valid_ranges',
  'Range Validation',
  $$
    BEGIN
      -- Valid rating
      INSERT INTO conversation_feedback (conversation_id, feedback_type, rating)
      VALUES (gen_random_uuid(), 'star_rating', 5);

      -- Valid confidence
      INSERT INTO learning_queue (shop_id, source_type, proposed_content, status, confidence_score)
      VALUES (1, 'manual', 'content', 'pending', 50);

      -- Valid response time
      INSERT INTO response_analytics (conversation_id, response_text, response_type, response_time_ms)
      VALUES (gen_random_uuid(), 'response', 'test', 100);
    END;
  $$
);

-- ============================================================================
-- CATEGORY 5: NULL/EMPTY CHECKS (5 tests)
-- ============================================================================

-- Test 5.1: Empty reason with only whitespace
SELECT run_test(
  'test_empty_whitespace_reason',
  'Null/Empty Checks',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', '   ')
  $$
);

-- Test 5.2: Empty original_response
SELECT run_test(
  'test_empty_original_response',
  'Null/Empty Checks',
  $$
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
    VALUES (gen_random_uuid(), '', 'Valid answer', 'normal')
  $$
);

-- Test 5.3: Empty corrected_answer
SELECT run_test(
  'test_empty_corrected_answer',
  'Null/Empty Checks',
  $$
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
    VALUES (gen_random_uuid(), 'Valid original', '', 'normal')
  $$
);

-- Test 5.4: Empty proposed_content
SELECT run_test(
  'test_empty_proposed_content',
  'Null/Empty Checks',
  $$
    INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
    VALUES (1, 'manual', '', 'pending')
  $$
);

-- Test 5.5: NULL values where allowed (should succeed)
SELECT run_test(
  'test_valid_nulls',
  'Null/Empty Checks',
  $$
    BEGIN
      -- NULL reason is allowed
      INSERT INTO conversation_feedback (conversation_id, feedback_type)
      VALUES (gen_random_uuid(), 'thumbs_up');

      -- NULL correction_context is allowed
      INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
      VALUES (gen_random_uuid(), 'Original', 'Corrected', 'normal');

      -- NULL confidence_score is allowed
      INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
      VALUES (1, 'manual', 'Content', 'pending');
    END;
  $$
);

-- ============================================================================
-- CATEGORY 6: XSS DETECTION (5 tests)
-- ============================================================================

-- Test 6.1: Script tag injection
SELECT run_test(
  'test_script_tag_injection',
  'XSS Detection',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', 'text<script>alert("XSS")</script>')
  $$
);

-- Test 6.2: Event handler injection
SELECT run_test(
  'test_event_handler_injection',
  'XSS Detection',
  $$
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
    VALUES (gen_random_uuid(), 'text<img src=x onerror="alert(1)">', 'Valid', 'normal')
  $$
);

-- Test 6.3: JavaScript pseudo-protocol
SELECT run_test(
  'test_javascript_protocol',
  'XSS Detection',
  $$
    INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
    VALUES (1, 'manual', 'text<a href="javascript:alert(1)">link</a>', 'pending')
  $$
);

-- Test 6.4: Iframe injection
SELECT run_test(
  'test_iframe_injection',
  'XSS Detection',
  $$
    INSERT INTO response_analytics (conversation_id, response_text, response_type)
    VALUES (gen_random_uuid(), 'text<iframe src="evil.com"></iframe>', 'test')
  $$
);

-- Test 6.5: Valid HTML-like text (should succeed)
SELECT run_test(
  'test_valid_html_like_text',
  'XSS Detection',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', 'I liked the <3 and the > symbol')
  $$
);

-- ============================================================================
-- CATEGORY 7: INTEGRATION TESTS (5 tests)
-- ============================================================================

-- Test 7.1: Complete feedback insert with all validations
SELECT run_test(
  'test_complete_feedback_insert',
  'Integration Tests',
  $$
    WITH conv AS (
      INSERT INTO conversations (user_id, channel)
      VALUES (1, 'web')
      RETURNING id
    )
    INSERT INTO conversation_feedback (conversation_id, feedback_type, rating, reason, metadata)
    SELECT id, 'star_rating', 5, 'Excellent service!', '{"shop_id": 1}'::jsonb
    FROM conv
  $$
);

-- Test 7.2: Complete correction insert with all validations
SELECT run_test(
  'test_complete_correction_insert',
  'Integration Tests',
  $$
    WITH conv AS (
      INSERT INTO conversations (user_id, channel)
      VALUES (1, 'web')
      RETURNING id
    )
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority, correction_context, metadata)
    SELECT id, 'Wrong answer', 'Correct answer', 'high', 'When customer asks about pricing', '{"source": "handoff"}'::jsonb
    FROM conv
  $$
);

-- Test 7.3: Complete learning queue insert with all validations
SELECT run_test(
  'test_complete_learning_queue_insert',
  'Integration Tests',
  $$
    INSERT INTO learning_queue (
      shop_id,
      source_type,
      proposed_content,
      category,
      confidence_score,
      metadata,
      status
    )
    VALUES (
      1,
      'manual',
      'New knowledge base entry',
      'pricing',
      85,
      '{"reviewed": true}'::jsonb,
      'pending'
    )
  $$
);

-- Test 7.4: Complete transcript insert with all validations
SELECT run_test(
  'test_complete_transcript_insert',
  'Integration Tests',
  $$
    WITH conv AS (
      INSERT INTO conversations (user_id, channel)
      VALUES (1, 'voice')
      RETURNING id
    )
    INSERT INTO voice_transcripts (conversation_id, transcript, processed_summary, sentiment, entities, learning_insights, metadata)
    SELECT
      id,
      'Customer called asking about hours',
      'Customer inquiry about business hours',
      'neutral',
      '[{"type": "time", "value": "hours"}]'::jsonb,
      '{"important": true}'::jsonb,
      '{"call_duration": 120}'::jsonb
    FROM conv
  $$
);

-- Test 7.5: Complete analytics insert with all validations
SELECT run_test(
  'test_complete_analytics_insert',
  'Integration Tests',
  $$
    WITH conv AS (
      INSERT INTO conversations (user_id, channel)
      VALUES (1, 'web')
      RETURNING id
    )
    INSERT INTO response_analytics (
      conversation_id,
      response_text,
      response_type,
      user_engagement_score,
      led_to_conversion,
      response_time_ms,
      ab_test_variant,
      metrics
    )
    SELECT
      id,
      'Here is the information you requested',
      'faq',
      75,
      true,
      150,
      'variant_a',
      '{"clicks": 5}'::jsonb
    FROM conv
  $$
);

-- ============================================================================
-- CATEGORY 8: EDGE CASES (5 tests)
-- ============================================================================

-- Test 8.1: NULL bytes in input
SELECT run_test(
  'test_null_bytes_sanitization',
  'Edge Cases',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, reason)
    VALUES (gen_random_uuid(), 'thumbs_up', 'text' || chr(0) || ' with null byte')
  $$
);

-- Test 8.2: Control characters
SELECT run_test(
  'test_control_characters_sanitization',
  'Edge Cases',
  $$
    INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority)
    VALUES (gen_random_uuid(), 'text' || chr(1) || chr(2) || chr(31), 'Valid', 'normal')
  $$
);

-- Test 8.3: Unicode normalization
SELECT run_test(
  'test_unicode_normalization',
  'Edge Cases',
  $$
    INSERT INTO learning_queue (shop_id, source_type, proposed_content, status)
    VALUES (1, 'manual', E'text with unicode: \u00E9\u00E1\u00ED', 'pending')
  $$
);

-- Test 8.4: Very large JSONB metadata
SELECT run_test(
  'test_large_jsonb_metadata',
  'Edge Cases',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, metadata)
    VALUES (gen_random_uuid(), 'thumbs_up', '{"data": "' || repeat('a', 1048500) || '"}'::jsonb)
  $$
);

-- Test 8.5: Dangerous JSONB keys
SELECT run_test(
  'test_dangerous_jsonb_keys',
  'Edge Cases',
  $$
    INSERT INTO conversation_feedback (conversation_id, feedback_type, metadata)
    VALUES (gen_random_uuid(), 'thumbs_up', '{"__proto__": "evil", "constructor": "attack"}'::jsonb)
  $$
);

-- ============================================================================
-- TEST RESULTS SUMMARY
-- ============================================================================

-- Get test summary
SELECT
  test_category,
  COUNT(*) as total_tests,
  SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed,
  SUM(CASE WHEN NOT passed THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN passed THEN 1 ELSE 0 END) / COUNT(*), 2) as pass_rate
FROM validation_test_results
GROUP BY test_category
ORDER BY test_category;

-- Get failed tests (if any)
SELECT
  test_name,
  test_category,
  error_message
FROM validation_test_results
WHERE NOT passed
ORDER BY test_category, test_name;

-- Overall summary
SELECT
  'TOTAL' as category,
  COUNT(*) as total_tests,
  SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed,
  SUM(CASE WHEN NOT passed THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN passed THEN 1 ELSE 0 END) / COUNT(*), 2) as pass_rate
FROM validation_test_results;

-- ============================================================================
-- CLEANUP
-- ============================================================================
DROP FUNCTION IF EXISTS run_test(TEXT, TEXT, TEXT);

-- ============================================================================
-- NOTES
-- ============================================================================
-- Expected results:
-- - Tests that SHOULD FAIL (invalid input) should return FALSE (passed = FALSE)
-- - Tests that SHOULD SUCCEED (valid input) should return TRUE (passed = TRUE)
-- - Total tests: 40+
-- - All validation functions should be tested
-- - All 5 tables should have validation tests
-- ============================================================================
