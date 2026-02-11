-- ============================================================================
-- Rollback Script: 006_p1_input_validation
-- Description: Rollback P1-2 input validation layer
-- Author: Security Engineer
-- Date: 2026-02-09
--
-- This script removes all input validation components created in migration 006
--
-- WARNING: This will remove security protections!
-- ============================================================================
--

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================
BEGIN;

-- ============================================================================
-- DROP VALIDATION TRIGGERS
-- ============================================================================

-- conversation_feedback
DROP TRIGGER IF EXISTS trg_validate_feedback ON conversation_feedback;

-- owner_corrections
DROP TRIGGER IF EXISTS trg_validate_corrections ON owner_corrections;

-- learning_queue
DROP TRIGGER IF EXISTS trg_validate_learning_queue ON learning_queue;

-- response_analytics
DROP TRIGGER IF EXISTS trg_validate_analytics ON response_analytics;

-- voice_transcripts
DROP TRIGGER IF EXISTS trg_validate_transcripts ON voice_transcripts;

-- ============================================================================
-- DROP VALIDATION TRIGGER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS validate_feedback() CASCADE;
DROP FUNCTION IF EXISTS validate_corrections() CASCADE;
DROP FUNCTION IF EXISTS validate_learning_queue() CASCADE;
DROP FUNCTION IF EXISTS validate_analytics() CASCADE;
DROP FUNCTION IF EXISTS validate_transcripts() CASCADE;

-- ============================================================================
-- DROP CHECK CONSTRAINTS
-- ============================================================================

-- conversation_feedback
ALTER TABLE conversation_feedback DROP CONSTRAINT IF EXISTS check_feedback_type_valid;
ALTER TABLE conversation_feedback DROP CONSTRAINT IF EXISTS check_feedback_rating_range;
ALTER TABLE conversation_feedback DROP CONSTRAINT IF EXISTS check_feedback_reason_length;
ALTER TABLE conversation_feedback DROP CONSTRAINT IF EXISTS check_feedback_reason_not_empty;

-- owner_corrections
ALTER TABLE owner_corrections DROP CONSTRAINT IF EXISTS check_correction_priority;
ALTER TABLE owner_corrections DROP CONSTRAINT IF EXISTS check_original_response_length;
ALTER TABLE owner_corrections DROP CONSTRAINT IF EXISTS check_corrected_answer_length;
ALTER TABLE owner_corrections DROP CONSTRAINT IF EXISTS check_correction_context_length;

-- learning_queue
ALTER TABLE learning_queue DROP CONSTRAINT IF EXISTS check_status_valid;
ALTER TABLE learning_queue DROP CONSTRAINT IF EXISTS check_source_type_valid;
ALTER TABLE learning_queue DROP CONSTRAINT IF EXISTS check_proposed_content_length;
ALTER TABLE learning_queue DROP CONSTRAINT IF EXISTS check_confidence_score_range;

-- response_analytics
ALTER TABLE response_analytics DROP CONSTRAINT IF EXISTS check_response_time_positive;
ALTER TABLE response_analytics DROP CONSTRAINT IF EXISTS check_engagement_score_range;

-- voice_transcripts
ALTER TABLE voice_transcripts DROP CONSTRAINT IF EXISTS check_sentiment_valid;
ALTER TABLE voice_transcripts DROP CONSTRAINT IF EXISTS check_transcript_length;

-- ============================================================================
-- DROP VALIDATION FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS sanitize_text_input(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_valid_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_valid_uuid(TEXT) CASCADE;
DROP FUNCTION IF EXISTS detect_sql_injection(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_jsonb_structure(JSONB) CASCADE;
DROP FUNCTION IF EXISTS check_for_xss_patterns(TEXT) CASCADE;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
COMMIT;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- Removed:
--   - 5 validation triggers
--   - 5 validation trigger functions
--   - 17 CHECK constraints
--   - 6 validation utility functions
-- ============================================================================
-- WARNING: Security protections have been removed!
-- ============================================================================
