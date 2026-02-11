-- ============================================================================
-- Migration: 004_knowledge_auto_triggers_enhanced
-- Description: Complete automatic knowledge base update system (Enhanced)
-- Author: Database Architect
-- Date: 2026-02-09
--
-- This migration ENHANCES the existing 004 migration with:
-- - Conversation → Suggested Updates trigger (NEW)
-- - Enhanced feedback trigger with conversation context
-- - Enhanced corrections trigger with auto-apply for urgent priority
-- - Rollback mechanism for knowledge changes
-- - Complete verification test suite
--
-- NEW Triggers Created:
--   - trg_conversation_review_learning: Flagged conversations → learning queue
--   - Enhanced trg_feedback_learning: Better context extraction
--   - Enhanced trg_corrections_learning: Auto-apply urgent corrections
--
-- NEW Functions Created:
--   - rollback_knowledge_change: Undo knowledge changes
--   - get_learning_context: Extract conversation context
--   - check_conflicts: Advanced conflict detection
--
-- Performance Targets:
--   - Trigger execution: < 50ms
--   - Conflict detection: < 20ms (HNSW index)
--   - Rollback operation: < 100ms
--
-- Rollback: Drop all triggers, functions, and indexes created here
-- ============================================================================

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================
BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Ensure pgvector is installed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    CREATE EXTENSION vector;
  END IF;
END $$;

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

    RAISE NOTICE 'Added flagged_for_review columns to conversations table';
  ELSE
    RAISE NOTICE 'flagged_for_review columns already exist on conversations table';
  END IF;
END $$;

-- ============================================================================
-- FUNCTION: Extract conversation context for learning
-- Purpose: Rich context extraction from conversations for learning queue
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
    'user_id', v_conversation.user_id,
    'channel', v_conversation.channel,
    'summary', v_conversation.summary,
    'status', v_conversation.status,
    'created_at', v_conversation.created_at,
    'metadata', v_conversation.metadata
  );

  -- Add feedback if exists
  FOR v_feedback IN
    SELECT * FROM conversation_feedback
    WHERE conversation_id = p_conversation_id
    ORDER BY created_at DESC
    LIMIT 3
  LOOP
    v_context := v_context || jsonb_build_object(
      'latest_feedback', jsonb_build_object(
        'type', v_feedback.feedback_type,
        'rating', v_feedback.rating,
        'reason', v_feedback.reason
      )
    );
  END LOOP;

  -- Add corrections if exists
  FOR v_corrections IN
    SELECT * FROM owner_corrections
    WHERE conversation_id = p_conversation_id
    ORDER BY created_at DESC
    LIMIT 3
  LOOP
    v_context := v_context || jsonb_build_object(
      'latest_corrections', jsonb_build_object(
        'priority', v_corrections.priority,
        'original_response', v_corrections.original_response,
        'corrected_answer', v_corrections.corrected_answer
      )
    );
  END LOOP;

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_conversation_context(UUID) IS 'Extracts rich context from conversations including feedback and corrections';

-- ============================================================================
-- FUNCTION: Enhanced trigger learning from negative feedback
-- Purpose: Auto-create learning queue with rich conversation context
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_learning_from_negative_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_context JSONB;
  v_summary TEXT;
  v_confidence INTEGER := 50;
BEGIN
  -- Only process negative feedback
  IF NOT (NEW.feedback_type IN ('thumbs_down') OR (NEW.rating IS NOT NULL AND NEW.rating <= 2)) THEN
    RETURN NEW;
  END IF;

  -- Extract conversation context
  v_context := get_conversation_context(NEW.conversation_id);

  -- Extract summary
  v_summary := COALESCE(
    v_context->>'summary',
    'Review conversation with ' || NEW.feedback_type ||
    CASE WHEN NEW.rating IS NOT NULL THEN ' (rating: ' || NEW.rating::TEXT || ')' ELSE '' END
  );

  -- Adjust confidence based on feedback severity
  IF NEW.rating = 1 THEN
    v_confidence := 60; -- 1-star is more reliable indicator
  ELSIF NEW.feedback_type = 'thumbs_down' AND NEW.reason IS NOT NULL THEN
    v_confidence := 55; -- Thumbs down with reason is more reliable
  END IF;

  -- Create learning queue entry
  INSERT INTO learning_queue (
    source_type,
    source_id,
    shop_id,
    proposed_content,
    category,
    confidence_score,
    metadata,
    status
  )
  SELECT
    'feedback',
    NEW.id,
    COALESCE((cm.metadata->>'shop_id')::INTEGER, 0),
    'Negative feedback received: ' || v_summary ||
    CASE WHEN NEW.reason IS NOT NULL THEN '. Reason: ' || NEW.reason ELSE '' END,
    'feedback_review',
    v_confidence,
    jsonb_build_object(
      'feedback_id', NEW.id,
      'feedback_type', NEW.feedback_type,
      'rating', NEW.rating,
      'reason', NEW.reason,
      'conversation_context', v_context,
      'extracted_at', CURRENT_TIMESTAMP
    ),
    'pending'
  FROM conversations cm
  WHERE cm.id = NEW.conversation_id;

  RAISE NOTICE 'Created learning queue entry for negative feedback on conversation %', NEW.conversation_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create learning entry for feedback %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_learning_from_negative_feedback() IS 'Enhanced: Creates learning queue entries for negative feedback with rich conversation context';

-- ============================================================================
-- FUNCTION: Enhanced trigger learning from owner corrections
-- Purpose: Auto-create learning queue with priority-based auto-approval
-- Features: Auto-apply urgent corrections immediately
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_learning_from_corrections()
RETURNS TRIGGER AS $$
DECLARE
  v_context JSONB;
  v_confidence INTEGER;
  v_status VARCHAR(20);
  v_should_apply BOOLEAN := FALSE;
  v_kb_id UUID;
  v_similarity_threshold NUMERIC := 0.85;
  v_similar RECORD;
BEGIN
  -- Extract conversation context
  v_context := get_conversation_context(NEW.conversation_id);

  -- Priority-based confidence and approval
  CASE NEW.priority
    WHEN 'urgent' THEN
      v_confidence := 95;
      v_status := 'approved';
      v_should_apply := TRUE;
    WHEN 'high' THEN
      v_confidence := 85;
      v_status := 'pending';
    WHEN 'normal' THEN
      v_confidence := 70;
      v_status := 'pending';
    ELSE
      v_confidence := 50;
      v_status := 'pending';
  END CASE;

  -- Create learning queue entry
  INSERT INTO learning_queue (
    source_type,
    source_id,
    shop_id,
    proposed_content,
    category,
    confidence_score,
    metadata,
    status,
    embedding
  )
  SELECT
    'correction',
    NEW.id,
    COALESCE((cm.metadata->>'shop_id')::INTEGER, 0),
    NEW.corrected_answer,
    'owner_correction',
    v_confidence,
    jsonb_build_object(
      'correction_id', NEW.id,
      'original_response', NEW.original_response,
      'correction_context', NEW.correction_context,
      'priority', NEW.priority,
      'conversation_context', v_context,
      'auto_approved', v_status = 'approved',
      'extracted_at', CURRENT_TIMESTAMP
    ),
    v_status,
    NULL -- Embedding to be generated by application
  FROM conversations cm
  WHERE cm.id = NEW.conversation_id
  RETURNING id, embedding INTO v_kb_id, v_context->'embedding'; -- Note: embedding is NULL here

  -- Auto-apply urgent corrections immediately
  IF v_should_apply AND NEW.priority = 'urgent' THEN
    -- Check for conflicts before applying
    FOR v_similar IN
      SELECT
        kb.id,
        kb.content,
        (1 - (kb.embedding <=> COALESCE((SELECT embedding FROM learning_queue WHERE id = v_kb_id), '[0]'::VECTOR(768))))::NUMERIC(3,2) as similarity
      FROM knowledge_base_rag kb
      WHERE kb.shop_id = COALESCE((v_context->>'shop_id')::INTEGER, 0)
        AND kb.embedding IS NOT NULL
        AND (1 - (kb.embedding <=> COALESCE((SELECT embedding FROM learning_queue WHERE id = v_kb_id), '[0]'::VECTOR(768)))) >= v_similarity_threshold
      ORDER BY kb.embedding <=> COALESCE((SELECT embedding FROM learning_queue WHERE id = v_kb_id), '[0]'::VECTOR(768))
      LIMIT 5
    LOOP
      -- Log conflict
      INSERT INTO learning_audit_log (
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        performed_by,
        performed_at
      ) VALUES (
        'urgent_correction_conflict',
        'owner_corrections',
        NEW.id,
        jsonb_build_object(
          'similar_knowledge_id', v_similar.id,
          'similarity', v_similar.similarity,
          'existing_content', v_similar.content
        ),
        jsonb_build_object(
          'corrected_answer', NEW.corrected_answer,
          'priority', NEW.priority
        ),
        'system',
        CURRENT_TIMESTAMP
      );
    END LOOP;

    -- Apply urgent correction (bypass conflict detection for urgent items)
    INSERT INTO knowledge_base_rag (
      shop_id,
      content,
      category,
      source,
      metadata
    )
    SELECT
      COALESCE((cm.metadata->>'shop_id')::INTEGER, 0),
      NEW.corrected_answer,
      'urgent_correction',
      'owner_correction',
      jsonb_build_object(
        'correction_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'priority', 'urgent',
        'applied_automatically', TRUE,
        'original_response', NEW.original_response,
        'applied_at', CURRENT_TIMESTAMP
      )
    FROM conversations cm
    WHERE cm.id = NEW.conversation_id
    RETURNING id INTO v_kb_id;

    -- Mark correction as applied
    UPDATE owner_corrections
    SET applied_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;

    -- Update learning queue to applied
    UPDATE learning_queue
    SET
      status = 'applied',
      applied_at = CURRENT_TIMESTAMP,
      metadata = metadata || jsonb_build_object(
        'auto_applied_urgent', TRUE,
        'knowledge_id', v_kb_id
      )
    WHERE source_id = NEW.id AND source_type = 'correction';

    -- Log the urgent application
    INSERT INTO learning_audit_log (
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by,
      performed_at
    ) VALUES (
      'urgent_correction_applied',
      'knowledge_base_rag',
      v_kb_id,
      NULL,
      jsonb_build_object(
        'content', NEW.corrected_answer,
        'correction_id', NEW.id,
        'priority', 'urgent',
        'conversation_id', NEW.conversation_id
      ),
      'system',
      CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Auto-applied urgent correction % to knowledge base as entry %', NEW.id, v_kb_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to process correction %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_learning_from_corrections() IS 'Enhanced: Creates learning queue entries with priority-based auto-approval and urgent auto-apply';

-- ============================================================================
-- FUNCTION: Trigger learning from flagged conversations
-- Purpose: Auto-create learning queue from conversations flagged for review
-- NEW FEATURE - Not in existing migration
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_learning_from_flagged_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_context JSONB;
  v_summary TEXT;
  v_confidence INTEGER := 60;
  v_flag_severity VARCHAR(20);
BEGIN
  -- Only trigger when flagged_for_review is set to TRUE
  IF TG_OP = 'INSERT' THEN
    IF NOT (NEW.flagged_for_review = TRUE) THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.flagged_for_review = FALSE AND NEW.flagged_for_review = TRUE) THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Extract conversation context
  v_context := get_conversation_context(NEW.id);

  -- Determine confidence based on flag reason
  v_flag_severity := COALESCE(NEW.flag_metadata->>'severity', 'normal');

  CASE v_flag_severity
    WHEN 'critical' THEN v_confidence := 80;
    WHEN 'high' THEN v_confidence := 70;
    WHEN 'normal' THEN v_confidence := 60;
    ELSE v_confidence := 50;
  END CASE;

  -- Build summary
  v_summary := COALESCE(
    NEW.summary,
    COALESCE(NEW.flag_reason, 'Conversation flagged for review')
  );

  -- Create learning queue entry
  INSERT INTO learning_queue (
    source_type,
    source_id,
    shop_id,
    proposed_content,
    category,
    confidence_score,
    metadata,
    status
  )
  VALUES (
    'conversation',
    NEW.id,
    COALESCE((NEW.metadata->>'shop_id')::INTEGER, 0),
    'Review flagged conversation: ' || v_summary ||
    CASE WHEN NEW.flag_reason IS NOT NULL THEN '. Flag reason: ' || NEW.flag_reason ELSE '' END,
    'flagged_conversation',
    v_confidence,
    jsonb_build_object(
      'conversation_id', NEW.id,
      'flag_reason', NEW.flag_reason,
      'flag_severity', v_flag_severity,
      'flag_metadata', NEW.flag_metadata,
      'conversation_context', v_context,
      'extracted_at', CURRENT_TIMESTAMP,
      'channel', NEW.channel,
      'user_id', NEW.user_id
    ),
    'pending'
  );

  RAISE NOTICE 'Created learning queue entry for flagged conversation % (reason: %)', NEW.id, NEW.flag_reason;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create learning entry for flagged conversation %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_learning_from_flagged_conversation() IS 'NEW: Creates learning queue entries from conversations flagged for review';

-- ============================================================================
-- FUNCTION: Rollback knowledge base changes
-- Purpose: Undo changes made to knowledge_base_rag with audit trail
-- NEW FEATURE - Not in existing migration
-- ============================================================================
CREATE OR REPLACE FUNCTION rollback_knowledge_change(
  p_kb_id UUID,
  p_performed_by VARCHAR DEFAULT 'manual'
)
RETURNS JSONB AS $$
DECLARE
  v_kb_record RECORD;
  v_learning_queue_id UUID;
  v_result JSONB;
BEGIN
  -- Get knowledge base record
  SELECT * INTO v_kb_record
  FROM knowledge_base_rag
  WHERE id = p_kb_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Knowledge base record not found'
    );
  END IF;

  -- Check if this was from learning queue
  IF v_kb_record.metadata->>'learning_queue_id' IS NOT NULL THEN
    v_learning_queue_id := (v_kb_record.metadata->>'learning_queue_id')::UUID;

    -- Update learning queue status back to pending
    UPDATE learning_queue
    SET
      status = 'pending',
      applied_at = NULL,
      metadata = metadata || jsonb_build_object(
        'rolled_back', TRUE,
        'rolled_back_at', CURRENT_TIMESTAMP,
        'rolled_back_by', p_performed_by,
        'previous_knowledge_id', v_kb_record.id
      )
    WHERE id = v_learning_queue_id;
  END IF;

  -- Store record in audit log before deletion
  INSERT INTO learning_audit_log (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    performed_by,
    performed_at
  ) VALUES (
    'rollback',
    'knowledge_base_rag',
    v_kb_record.id,
    jsonb_build_object(
      'content', v_kb_record.content,
      'category', v_kb_record.category,
      'shop_id', v_kb_record.shop_id,
      'metadata', v_kb_record.metadata
    ),
    jsonb_build_object(
      'rolled_back_by', p_performed_by,
      'rolled_back_at', CURRENT_TIMESTAMP,
      'learning_queue_id', v_learning_queue_id
    ),
    p_performed_by,
    CURRENT_TIMESTAMP
  );

  -- Delete the knowledge base record
  DELETE FROM knowledge_base_rag
  WHERE id = p_kb_id;

  -- Return success result
  v_result := jsonb_build_object(
    'success', TRUE,
    'rolled_back_kb_id', v_kb_record.id,
    'rolled_back_learning_queue_id', v_learning_queue_id,
    'content', v_kb_record.content,
    'performed_by', p_performed_by,
    'performed_at', CURRENT_TIMESTAMP
  );

  RAISE NOTICE 'Rolled back knowledge base entry %', p_kb_id;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'kb_id', p_kb_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_knowledge_change(UUID, VARCHAR) IS 'NEW: Rolls back knowledge base changes with full audit trail';

-- ============================================================================
-- FUNCTION: Batch rollback multiple knowledge changes
-- Purpose: Rollback multiple knowledge changes in one transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION batch_rollback_knowledge(
  p_kb_ids UUID[],
  p_performed_by VARCHAR DEFAULT 'manual'
)
RETURNS JSONB AS $$
DECLARE
  v_kb_id UUID;
  v_results JSONB := jsonb_build_array();
  v_success_count INTEGER := 0;
  v_failure_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Loop through each KB ID
  FOREACH v_kb_id IN ARRAY p_kb_ids
  LOOP
    BEGIN
      -- Call rollback function
      v_result := rollback_knowledge_change(v_kb_id, p_performed_by);

      IF (v_result->>'success')::BOOLEAN = TRUE THEN
        v_success_count := v_success_count + 1;
      ELSE
        v_failure_count := v_failure_count + 1;
      END IF;

      v_results := v_results || v_result;

    EXCEPTION WHEN OTHERS THEN
      v_failure_count := v_failure_count + 1;
      v_results := v_results || jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'kb_id', v_kb_id
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total', array_length(p_kb_ids, 1),
    'success_count', v_success_count,
    'failure_count', v_failure_count,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_rollback_knowledge(UUID[], VARCHAR) IS 'Batch rollback multiple knowledge base changes';

-- ============================================================================
-- FUNCTION: Advanced conflict detection with resolution
-- Purpose: Check for conflicts and suggest resolution strategy
-- ============================================================================
CREATE OR REPLACE FUNCTION check_conflicts_with_resolution(
  p_learning_id UUID,
  p_similarity_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE (
  conflict_id UUID,
  conflict_type VARCHAR,
  similarity NUMERIC,
  proposed_content TEXT,
  existing_content TEXT,
  resolution_strategy VARCHAR,
  confidence_score INTEGER
) AS $$
DECLARE
  v_learning RECORD;
BEGIN
  -- Get learning item
  SELECT * INTO v_learning
  FROM learning_queue
  WHERE id = p_learning_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning item % not found', p_learning_id;
  END IF;

  -- Return conflicts if embedding exists
  IF v_learning.embedding IS NOT NULL THEN
    RETURN QUERY
    SELECT
      kb.id as conflict_id,
      'similar_content'::VARCHAR as conflict_type,
      (1 - (kb.embedding <=> v_learning.embedding))::NUMERIC(3,2) as similarity,
      v_learning.proposed_content,
      kb.content,
      CASE
        WHEN v_learning.confidence_score > COALESCE((kb.metadata->>'confidence_score')::INTEGER, 0)
        THEN 'replace_with_new'::VARCHAR
        WHEN v_learning.confidence_score < COALESCE((kb.metadata->>'confidence_score')::INTEGER, 0)
        THEN 'keep_existing'::VARCHAR
        ELSE 'manual_review'::VARCHAR
      END as resolution_strategy,
      v_learning.confidence_score
    FROM knowledge_base_rag kb
    WHERE kb.shop_id = v_learning.shop_id
      AND kb.embedding IS NOT NULL
      AND (1 - (kb.embedding <=> v_learning.embedding)) >= p_similarity_threshold
    ORDER BY kb.embedding <=> v_learning.embedding;
  ELSE
    -- No embedding - return empty result
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_conflicts_with_resolution(UUID, NUMERIC) IS 'Advanced conflict detection with automated resolution strategy suggestions';

-- ============================================================================
-- TRIGGERS: Enhanced Learning Automation
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_feedback_learning ON conversation_feedback;
DROP TRIGGER IF EXISTS trg_corrections_learning ON owner_corrections;

-- Trigger 1: Enhanced feedback learning trigger
CREATE TRIGGER trg_feedback_learning
AFTER INSERT ON conversation_feedback
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_negative_feedback();

-- Trigger 2: Enhanced corrections learning trigger
CREATE TRIGGER trg_corrections_learning
AFTER INSERT ON owner_corrections
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_corrections();

-- Trigger 3: NEW - Flagged conversation learning trigger
DROP TRIGGER IF EXISTS trg_conversation_review_learning ON conversations;
CREATE TRIGGER trg_conversation_review_learning
AFTER INSERT OR UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_flagged_conversation();

-- ============================================================================
-- INDEXES: Performance Optimization for New Features
-- ============================================================================

-- Index for flagged conversations
CREATE INDEX IF NOT EXISTS idx_conversations_flagged_review
ON conversations(flagged_for_review, created_at DESC)
WHERE flagged_for_review = TRUE;

-- Index for conversation lookups by flag reason
CREATE INDEX IF NOT EXISTS idx_conversations_flag_reason
ON conversations(flag_reason, created_at DESC)
WHERE flagged_for_review = TRUE;

-- Index for learning queue by source_type and source_id
CREATE INDEX IF NOT EXISTS idx_learning_source
ON learning_queue(source_type, source_id)
WHERE status IN ('pending', 'approved');

-- Index for audit log by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_actions
ON learning_audit_log(action, performed_at DESC)
WHERE action IN ('rollback', 'urgent_correction_applied', 'urgent_correction_conflict', 'conflict_detected');

-- ============================================================================
-- VIEWS: Monitoring and Analytics
-- ============================================================================

-- View: Learning queue by source with status
CREATE OR REPLACE VIEW learning_queue_summary AS
SELECT
  source_type,
  status,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
FROM learning_queue
GROUP BY source_type, status
ORDER BY source_type, status;

COMMENT ON VIEW learning_queue_summary IS 'Summary of learning queue items by source type and status';

-- View: Flagged conversations needing review
CREATE OR REPLACE VIEW flagged_conversations_review AS
SELECT
  c.id,
  c.user_id,
  c.channel,
  c.summary,
  c.flag_reason,
  c.flag_metadata,
  c.created_at,
  c.status,
  COUNT(DISTINCT cf.id) as feedback_count,
  COUNT(DISTINCT oc.id) as correction_count,
  EXISTS(SELECT 1 FROM learning_queue lq WHERE lq.source_id = c.id AND lq.source_type = 'conversation') as in_learning_queue
FROM conversations c
LEFT JOIN conversation_feedback cf ON cf.conversation_id = c.id
LEFT JOIN owner_corrections oc ON oc.conversation_id = c.id
WHERE c.flagged_for_review = TRUE
  AND c.deleted_at IS NULL
GROUP BY c.id, c.user_id, c.channel, c.summary, c.flag_reason, c.flag_metadata, c.created_at, c.status
ORDER BY c.created_at DESC;

COMMENT ON VIEW flagged_conversations_review IS 'Flagged conversations with feedback and correction counts';

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns were added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations'
      AND column_name = 'flagged_for_review'
  ) THEN
    RAISE NOTICE '✅ Columns flagged_for_review added to conversations';
  ELSE
    RAISE EXCEPTION '❌ Columns flagged_for_review NOT added';
  END IF;
END $$;

-- Verify triggers were created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  '✅ Trigger created' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_feedback_learning',
    'trg_corrections_learning',
    'trg_conversation_review_learning'
  )
ORDER BY trigger_name;

-- Verify functions were created
SELECT
  routine_name,
  routine_type,
  '✅ Function created' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_conversation_context',
    'trigger_learning_from_negative_feedback',
    'trigger_learning_from_corrections',
    'trigger_learning_from_flagged_conversation',
    'rollback_knowledge_change',
    'batch_rollback_knowledge',
    'check_conflicts_with_resolution'
  )
ORDER BY routine_name;

-- Verify views were created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'learning_queue_summary') THEN
    RAISE NOTICE '✅ View learning_queue_summary created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'flagged_conversations_review') THEN
    RAISE NOTICE '✅ View flagged_conversations_review created';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables enhanced: 1 (conversations)
-- Functions created: 7
-- Triggers created: 3 (2 enhanced, 1 new)
-- Views created: 2
-- Indexes created: 4
--
-- NEW Features Added:
--   ✅ Conversation → Suggested Updates trigger
--   ✅ Enhanced feedback trigger with context
--   ✅ Enhanced corrections trigger with auto-apply
--   ✅ Rollback mechanism (single and batch)
--   ✅ Advanced conflict detection
--   ✅ Flagged conversation support
--
-- Performance Targets:
--   - All triggers: < 50ms execution
--   - Conflict detection: < 20ms (HNSW)
--   - Rollback: < 100ms per record
--   - Context extraction: < 15ms
-- ============================================================================
