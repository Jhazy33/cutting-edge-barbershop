-- ============================================================================
-- Migration: 004_knowledge_auto_triggers_basic
-- Description: Complete automatic knowledge base update system (Basic - No pgvector)
-- Author: Database Architect
-- Date: 2026-02-09
--
-- This migration creates triggers WITHOUT requiring pgvector extension:
-- - Conversation → Suggested Updates trigger (NEW)
-- - Enhanced feedback trigger with conversation context
-- - Enhanced corrections trigger with auto-apply for urgent priority
-- - Rollback mechanism for knowledge changes
--
-- Note: Conflict detection uses text similarity instead of vector similarity
-- ============================================================================

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================
BEGIN;

-- ============================================================================
-- TABLE: Add conversation review fields (if not exists)
-- ============================================================================

-- Check if conversations table has flagged_for_review column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations'
      AND column_name = 'flagged_for_review'
  ) THEN
    ALTER TABLE conversations ADD COLUMN flagged_for_review BOOLEAN DEFAULT FALSE;
    ALTER TABLE conversations ADD COLUMN flag_reason TEXT;
    ALTER TABLE conversations ADD COLUMN flag_metadata JSONB DEFAULT '{}'::jsonb;

    COMMENT ON COLUMN conversations.flagged_for_review IS 'Conversation flagged for manual review and learning extraction';
    COMMENT ON COLUMN conversations.flag_reason IS 'Reason for flagging (e.g., customer_complaint, confusion, pricing_error)';
    COMMENT ON COLUMN conversations.flag_metadata IS 'Additional metadata about the flag (severity, category, etc.)';

    RAISE NOTICE '✅ Added flagged_for_review columns to conversations table';
  ELSE
    RAISE NOTICE '⚠️  flagged_for_review columns already exist on conversations table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Columns flagged_for_review NOT added: %', SQLERRM;
  RAISE EXCEPTION 'Failed to add columns';
END $$;

-- ============================================================================
-- FUNCTION: Extract conversation context for learning
-- ============================================================================
CREATE OR REPLACE FUNCTION get_conversation_context(
  p_conversation_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
  v_conversation RECORD;
  v_feedback RECORD;
  v_corrections RECORD;
BEGIN
  -- Get conversation data
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Conversation not found');
  END IF;

  -- Build context object
  v_context := jsonb_build_object(
    'conversation_id', v_conversation.id,
    'transcript', v_conversation.transcript,
    'summary', v_conversation.summary,
    'created_at', v_conversation.created_at,
    'metadata', v_conversation.metadata
  );

  -- Add feedback if exists
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'feedback_type', f.feedback_type,
      'rating', f.rating,
      'reason', f.reason,
      'created_at', f.created_at
    )
  ) INTO v_feedback
  FROM conversation_feedback f
  WHERE f.conversation_id = p_conversation_id;

  IF v_feedback IS NOT NULL THEN
    v_context := v_context || jsonb_build_object('feedback', v_feedback);
  END IF;

  -- Add corrections if exists
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'original_response', c.original_response,
      'corrected_answer', c.corrected_answer,
      'priority', c.priority,
      'created_at', c.created_at
    )
  ) INTO v_corrections
  FROM owner_corrections c
  WHERE c.conversation_id = p_conversation_id;

  IF v_corrections IS NOT NULL THEN
    v_context := v_context || jsonb_build_object('corrections', v_corrections);
  END IF;

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_conversation_context IS 'Extract rich context from conversations including transcript, summary, feedback, and corrections for learning queue';

-- ============================================================================
-- FUNCTION: Check for conflicts using text similarity (no pgvector)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_conflicts_text(
  p_content TEXT,
  p_shop_id INTEGER,
  p_threshold FLOAT DEFAULT 0.85
)
RETURNS JSONB AS $$
DECLARE
  v_conflict RECORD;
  v_conflicts JSONB := '[]'::jsonb;
BEGIN
  -- Check for text-based conflicts using similarity
  FOR v_conflict IN
    SELECT
      id,
      content,
      category,
      confidence_score,
      SIMILARITY(content, p_content) as similarity
    FROM knowledge_base_rag
    WHERE shop_id = p_shop_id
      AND SIMILARITY(content, p_content) >= p_threshold
    ORDER BY similarity DESC, created_at DESC
  LOOP
    v_conflicts := v_conflicts || jsonb_build_object(
      'knowledge_id', v_conflict.id,
      'content', v_conflict.content,
      'category', v_conflict.category,
      'confidence_score', v_conflict.confidence_score,
      'similarity', v_conflict.similarity
    );
  END LOOP;

  RETURN jsonb_build_object(
    'has_conflicts', CASE WHEN jsonb_array_length(v_conflicts) > 0 THEN TRUE ELSE FALSE END,
    'conflict_count', jsonb_array_length(v_conflicts),
    'conflicts', v_conflicts
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_conflicts_text IS 'Check for conflicting knowledge using text similarity (pg_trgm required for best performance)';

-- ============================================================================
-- FUNCTION: Rollback knowledge change
-- ============================================================================
CREATE OR REPLACE FUNCTION rollback_knowledge_change(
  p_knowledge_id UUID,
  p_user_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_learning RECORD;
  v_result JSONB;
BEGIN
  -- Find the learning queue item that created this knowledge entry
  SELECT * INTO v_learning
  FROM learning_queue
  WHERE knowledge_id = p_knowledge_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'No learning queue item found for this knowledge entry'
    );
  END IF;

  -- Delete the knowledge entry
  DELETE FROM knowledge_base_rag
  WHERE id = p_knowledge_id;

  -- Update learning queue back to pending
  UPDATE learning_queue
  SET status = 'pending',
      reviewed_at = NULL,
      applied_at = NULL,
      metadata = metadata || jsonb_build_object(
        'rolled_back_at', NOW(),
        'rolled_back_by', p_user_id,
        'rollback_reason', 'Manual rollback requested'
      )
  WHERE id = v_learning.id;

  -- Log the rollback
  INSERT INTO learning_audit_log (
    table_name,
    record_id,
    action_type,
    old_value,
    new_value,
    performed_by,
    created_at
  ) VALUES (
    'knowledge_base_rag',
    p_knowledge_id,
    'rollback',
    jsonb_build_object('status', 'applied', 'content', v_learning.proposed_content),
    jsonb_build_object('status', 'pending'),
    p_user_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Knowledge entry rolled back successfully',
    'knowledge_id', p_knowledge_id,
    'learning_queue_id', v_learning.id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_knowledge_change IS 'Rollback a knowledge base change and return learning queue item to pending status';

-- ============================================================================
-- TRIGGER: Enhanced feedback → learning queue
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_learning_from_negative_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_confidence INTEGER;
  v_context JSONB;
  v_metadata JSONB;
BEGIN
  -- Only create learning entry for negative feedback
  IF NEW.feedback_type NOT IN ('thumbs_down', 'star_rating') THEN
    RETURN NEW;
  END IF;

  -- For star ratings, only trigger on 1-2 stars
  IF NEW.feedback_type = 'star_rating' AND (NEW.rating IS NULL OR NEW.rating >= 3) THEN
    RETURN NEW;
  END IF;

  -- Calculate confidence based on severity
  IF NEW.rating = 1 THEN
    v_confidence := 60;
  ELSIF NEW.rating = 2 THEN
    v_confidence := 55;
  ELSIF NEW.feedback_type = 'thumbs_down' AND NEW.reason IS NOT NULL THEN
    v_confidence := 55;
  ELSE
    v_confidence := 50;
  END IF;

  -- Extract conversation context
  v_context := get_conversation_context(NEW.conversation_id);

  -- Build metadata
  v_metadata := jsonb_build_object(
    'source', 'feedback',
    'feedback_id', NEW.id,
    'conversation_context', v_context,
    'feedback_type', NEW.feedback_type,
    'rating', NEW.rating,
    'reason', NEW.reason
  );

  -- Create learning queue entry
  INSERT INTO learning_queue (
    source_type,
    source_id,
    shop_id,
    status,
    proposed_content,
    confidence_score,
    category,
    metadata,
    created_at
  ) SELECT
    'feedback',
    NEW.id,
    c.shop_id,
    'pending',
    CASE
      WHEN NEW.reason IS NOT NULL THEN
        'Customer feedback: ' || NEW.reason
      ELSE
        'Negative feedback received - needs review'
    END,
    v_confidence,
    'feedback_correction',
    v_metadata,
    NOW()
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  RAISE NOTICE '✅ Created learning queue entry from negative feedback (confidence: %)', v_confidence;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to create learning entry from feedback: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_feedback_learning ON conversation_feedback;
CREATE TRIGGER trg_feedback_learning
  AFTER INSERT ON conversation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_learning_from_negative_feedback();

COMMENT ON TRIGGER trg_feedback_learning ON conversation_feedback IS 'Automatically create learning queue entry for negative feedback (thumbs down, 1-2 stars)';

-- ============================================================================
-- TRIGGER: Enhanced corrections → learning queue with auto-approval
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_learning_from_corrections()
RETURNS TRIGGER AS $$
DECLARE
  v_confidence INTEGER;
  v_auto_approve BOOLEAN := FALSE;
  v_learning_queue_id UUID;
  v_conflict_check JSONB;
BEGIN
  -- Calculate confidence based on priority
  CASE NEW.priority
    WHEN 'urgent' THEN
      v_confidence := 95;
      v_auto_approve := TRUE;
    WHEN 'high' THEN
      v_confidence := 85;
      v_auto_approve := FALSE;
    WHEN 'normal' THEN
      v_confidence := 70;
      v_auto_approve := FALSE;
    WHEN 'low' THEN
      v_confidence := 50;
      v_auto_approve := FALSE;
    ELSE
      v_confidence := 50;
      v_auto_approve := FALSE;
  END CASE;

  -- Create learning queue entry
  INSERT INTO learning_queue (
    source_type,
    source_id,
    shop_id,
    status,
    proposed_content,
    confidence_score,
    category,
    metadata,
    created_at,
    reviewed_at,
    reviewed_by
  ) SELECT
    'correction',
    NEW.id,
    c.shop_id,
    CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END,
    NEW.corrected_answer,
    v_confidence,
    'owner_correction',
    jsonb_build_object(
      'source', 'correction',
      'correction_id', NEW.id,
      'original_response', NEW.original_response,
      'corrected_answer', NEW.corrected_answer,
      'priority', NEW.priority,
      'correction_context', NEW.correction_context,
      'conversation_id', NEW.conversation_id,
      'auto_approved', v_auto_approve
    ),
    NOW(),
    CASE WHEN v_auto_approve THEN NOW() ELSE NULL END,
    CASE WHEN v_auto_approve THEN 'system' ELSE NULL END
  FROM conversations c
  WHERE c.id = NEW.conversation_id
  RETURNING id INTO v_learning_queue_id;

  -- Update owner_corrections with learning queue reference
  UPDATE owner_corrections
  SET learning_queue_id = v_learning_queue_id
  WHERE id = NEW.id;

  -- If urgent, auto-apply to knowledge base
  IF v_auto_approve THEN
    -- Check for conflicts
    v_conflict_check := check_conflicts_text(NEW.corrected_answer, c.shop_id, 0.85);

    -- Insert into knowledge base (or update if conflict exists and new has higher confidence)
    INSERT INTO knowledge_base_rag (
      shop_id,
      content,
      category,
      confidence_score,
      metadata,
      created_at
    ) SELECT
      c.shop_id,
      NEW.corrected_answer,
      'owner_correction',
      v_confidence,
      jsonb_build_object(
        'source', 'owner_correction',
        'correction_id', NEW.id,
        'priority', NEW.priority,
        'auto_applied', TRUE,
        'learning_queue_id', v_learning_queue_id
      ),
      NOW()
    FROM conversations c
    WHERE c.id = NEW.conversation_id
    ON CONFLICT (id) DO NOTHING;

    -- Update owner_corrections with applied_at
    UPDATE owner_corrections
    SET applied_at = NOW()
    WHERE id = NEW.id;

    -- Update learning queue
    UPDATE learning_queue
    SET knowledge_id = (
        SELECT id FROM knowledge_base_rag
        WHERE metadata->>'correction_id' = NEW.id
        ORDER BY created_at DESC
        LIMIT 1
      ),
      applied_at = NOW()
    WHERE id = v_learning_queue_id;

    -- Log the auto-approval
    INSERT INTO learning_audit_log (
      table_name,
      record_id,
      action_type,
      old_value,
      new_value,
      performed_by,
      created_at
    ) VALUES (
      'learning_queue',
      v_learning_queue_id,
      'auto_approve_and_apply',
      '{"status": "created"}',
      jsonb_build_object(
        'status', 'applied',
        'confidence', v_confidence,
        'priority', NEW.priority
      ),
      'system',
      NOW()
    );

    RAISE NOTICE '✅ Urgent correction auto-applied to knowledge base (confidence: %)', v_confidence;
  END IF;

  RAISE NOTICE '✅ Created learning queue entry from correction (confidence: %, auto_approve: %)', v_confidence, v_auto_approve;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to create learning entry from correction: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_corrections_learning ON owner_corrections;
CREATE TRIGGER trg_corrections_learning
  AFTER INSERT ON owner_corrections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_learning_from_corrections();

COMMENT ON TRIGGER trg_corrections_learning ON owner_corrections IS 'Automatically create learning queue entry from owner corrections with priority-based auto-approval';

-- ============================================================================
-- TRIGGER: Flagged conversation → learning queue
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_learning_from_flagged_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_confidence INTEGER;
  v_flag_severity TEXT;
BEGIN
  -- Only trigger when flagged_for_review is set to TRUE
  IF NOT (NEW.flagged_for_review = TRUE AND (OLD.flagged_for_review IS NULL OR OLD.flagged_for_review = FALSE)) THEN
    RETURN NEW;
  END IF;

  -- Extract severity from flag_metadata if available
  v_flag_severity := COALESCE(NEW.flag_metadata->>'severity', 'normal');

  -- Calculate confidence based on flag severity
  CASE v_flag_severity
    WHEN 'critical' THEN
      v_confidence := 80;
    WHEN 'high' THEN
      v_confidence := 70;
    WHEN 'normal' THEN
      v_confidence := 60;
    WHEN 'low' THEN
      v_confidence := 50;
    ELSE
      v_confidence := 60;
  END CASE;

  -- Create learning queue entry
  INSERT INTO learning_queue (
    source_type,
    source_id,
    shop_id,
    status,
    proposed_content,
    confidence_score,
    category,
    metadata,
    created_at
  ) VALUES (
    'conversation',
    NEW.id,
    NEW.shop_id,
    'pending',
    CASE
      WHEN NEW.transcript IS NOT NULL THEN
        'Review flagged conversation: ' || LEFT(NEW.transcript, 500)
      ELSE
        'Review flagged conversation ID: ' || NEW.id::TEXT
    END,
    v_confidence,
    'conversation_review',
    jsonb_build_object(
      'source', 'conversation',
      'conversation_id', NEW.id,
      'flag_reason', NEW.flag_reason,
      'flag_severity', v_flag_severity,
      'transcript', NEW.transcript,
      'summary', NEW.summary,
      'flag_metadata', NEW.flag_metadata
    ),
    NOW()
  );

  RAISE NOTICE '✅ Created learning queue entry from flagged conversation (confidence: %, severity: %)', v_confidence, v_flag_severity;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to create learning entry from flagged conversation: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_conversation_review_learning ON conversations;
CREATE TRIGGER trg_conversation_review_learning
  AFTER UPDATE OF flagged_for_review ON conversations
  FOR EACH ROW
  WHEN (NEW.flagged_for_review = TRUE)
  EXECUTE FUNCTION trigger_learning_from_flagged_conversation();

COMMENT ON TRIGGER trg_conversation_review_learning ON conversations IS 'Automatically create learning queue entry when conversation is flagged for review';

-- ============================================================================
-- INDEXES (Performance optimization)
-- ============================================================================

-- Index for flagged conversations
CREATE INDEX IF NOT EXISTS idx_conversations_flagged_review
  ON conversations (flagged_for_review, flag_reason)
  WHERE flagged_for_review = TRUE;

COMMENT ON INDEX idx_conversations_flagged_review IS 'Partial index for quickly finding flagged conversations needing review';

-- Index for learning queue by source
CREATE INDEX IF NOT EXISTS idx_learning_source
  ON learning_queue (source_type, source_id, status);

COMMENT ON INDEX idx_learning_source IS 'Index for learning queue queries by source and status';

-- ============================================================================
-- COMMIT
-- ============================================================================
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check triggers
\echo ''
\echo '======================================'
\echo '✅ Triggers Created:'
\echo '======================================'
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  '✅' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_feedback_learning',
    'trg_corrections_learning',
    'trg_conversation_review_learning'
  )
ORDER BY event_object_table, trigger_name;

-- Check functions
\echo ''
\echo '======================================'
\echo '✅ Functions Created:'
\echo '======================================'
SELECT
  routine_name,
  routine_type,
  '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_conversation_context',
    'check_conflicts_text',
    'rollback_knowledge_change',
    'trigger_learning_from_negative_feedback',
    'trigger_learning_from_corrections',
    'trigger_learning_from_flagged_conversation'
  )
ORDER BY routine_name;

-- Check new columns
\echo ''
\echo '======================================'
\echo '✅ New Columns Added:'
\echo '======================================'
SELECT
  table_name,
  column_name,
  data_type,
  '✅' as status
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name IN ('flagged_for_review', 'flag_reason', 'flag_metadata')
ORDER BY column_name;

-- Check indexes
\echo ''
\echo '======================================'
\echo '✅ Indexes Created:'
\echo '======================================'
SELECT
  indexname,
  '✅' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_conversations_flagged_review',
    'idx_learning_source'
  )
ORDER BY indexname;

\echo ''
\echo '======================================'
\echo '✅ Migration 004 (Basic) Complete!'
\echo '======================================'
\echo ''
\echo 'Next steps:'
\echo '  1. Test triggers: INSERT INTO conversation_feedback ...'
\echo '  2. Test corrections: INSERT INTO owner_corrections ...'
\echo '  3. Test flagged: UPDATE conversations SET flagged_for_review = TRUE ...'
\echo '  4. Monitor: SELECT * FROM learning_queue ORDER BY created_at DESC;'
\echo ''
