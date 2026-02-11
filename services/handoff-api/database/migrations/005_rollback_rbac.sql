-- ============================================================================
-- Rollback Migration: 005_p1_security_rbac
-- Description: Rollback RBAC implementation (restore previous state)
-- Author: Database Architect
-- Date: 2026-02-09
--
-- WARNING: This rollback removes critical security controls!
-- Only use this if you need to revert to the insecure state.
-- ============================================================================

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================
BEGIN;

-- ============================================================================
-- STEP 1: DROP AUDIT TRIGGERS AND FUNCTIONS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_security_audit_learning_queue ON learning_queue;
DROP TRIGGER IF EXISTS trg_security_audit_knowledge_base ON knowledge_base_rag;

DROP FUNCTION IF EXISTS log_privilege_usage() CASCADE;

-- ============================================================================
-- STEP 2: DROP ROW-LEVEL SECURITY POLICIES
-- ============================================================================

DROP POLICY IF EXISTS learning_queue_writer_policy ON learning_queue;
DROP POLICY IF EXISTS learning_queue_reader_policy ON learning_queue;
DROP POLICY IF EXISTS conversation_feedback_reader_policy ON conversation_feedback;
DROP POLICY IF EXISTS conversation_feedback_writer_policy ON conversation_feedback;
DROP POLICY IF EXISTS owner_corrections_reader_policy ON owner_corrections;
DROP POLICY IF EXISTS owner_corrections_writer_policy ON owner_corrections;
DROP POLICY IF EXISTS knowledge_base_rag_reader_policy ON knowledge_base_rag;
DROP POLICY IF EXISTS knowledge_base_rag_writer_policy ON knowledge_base_rag;

-- Disable RLS on tables
ALTER TABLE learning_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE owner_corrections DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_rag DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: DROP ALL TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_auto_approve_learning ON learning_queue;
DROP TRIGGER IF EXISTS trg_apply_approved_learning ON learning_queue;
DROP TRIGGER IF EXISTS trg_learning_queue_timestamp ON learning_queue;
DROP TRIGGER IF EXISTS trg_ensure_learning_embedding ON learning_queue;
DROP TRIGGER IF EXISTS trg_audit_learning_changes ON learning_queue;
DROP TRIGGER IF EXISTS trg_feedback_learning ON conversation_feedback;
DROP TRIGGER IF EXISTS trg_corrections_learning ON owner_corrections;

-- ============================================================================
-- STEP 4: RECREATE FUNCTIONS WITHOUT SECURITY DEFINER (INSECURE!)
-- ============================================================================

-- Function: trigger_learning_from_negative_feedback (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION trigger_learning_from_negative_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.feedback_type IN ('thumbs_down') OR (NEW.rating IS NOT NULL AND NEW.rating <= 2) THEN
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
      'Review needed for conversation with negative feedback: ' || COALESCE(cm.summary, 'No summary'),
      'feedback_review',
      50,
      jsonb_build_object(
        'feedback_id', NEW.id,
        'feedback_type', NEW.feedback_type,
        'rating', NEW.rating,
        'reason', NEW.reason,
        'conversation_id', NEW.conversation_id
      ),
      'pending'
    FROM conversations cm
    WHERE cm.id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_learning_from_negative_feedback() IS 'INSECURE: Automatically creates learning queue entries (NO SECURITY DEFINER)';

-- Function: trigger_learning_from_corrections (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION trigger_learning_from_corrections()
RETURNS TRIGGER AS $$
BEGIN
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
    'correction',
    NEW.id,
    COALESCE((cm.metadata->>'shop_id')::INTEGER, 0),
    NEW.corrected_answer,
    'owner_correction',
    CASE
      WHEN NEW.priority = 'urgent' THEN 95
      WHEN NEW.priority = 'high' THEN 85
      WHEN NEW.priority = 'normal' THEN 70
      ELSE 50
    END,
    jsonb_build_object(
      'correction_id', NEW.id,
      'original_response', NEW.original_response,
      'correction_context', NEW.correction_context,
      'priority', NEW.priority,
      'conversation_id', NEW.conversation_id
    ),
    CASE
      WHEN NEW.priority = 'urgent' THEN 'approved'
      ELSE 'pending'
    END
  FROM conversations cm
  WHERE cm.id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_learning_from_corrections() IS 'INSECURE: Automatically creates learning queue entries (NO SECURITY DEFINER)';

-- Function: auto_approve_learning (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION auto_approve_learning()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_approve_threshold INTEGER := 90;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.source_type = 'correction' AND NEW.metadata->>'priority' = 'urgent' THEN
      RETURN NEW;
    END IF;

    IF NEW.confidence_score >= v_auto_approve_threshold AND NEW.status = 'pending' THEN
      NEW.status := 'approved';
      NEW.reviewed_at := CURRENT_TIMESTAMP;
      NEW.reviewed_by := NULL;
      NEW.metadata := NEW.metadata || jsonb_build_object(
        'auto_approved', TRUE,
        'auto_approve_reason', 'confidence_score >= ' || v_auto_approve_threshold,
        'auto_approve_time', CURRENT_TIMESTAMP
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.confidence_score < v_auto_approve_threshold
       AND NEW.confidence_score >= v_auto_approve_threshold
       AND NEW.status = 'pending' THEN
      NEW.status := 'approved';
      NEW.reviewed_at := CURRENT_TIMESTAMP;
      NEW.metadata := NEW.metadata || jsonb_build_object(
        'auto_approved', TRUE,
        'auto_approve_reason', 'confidence_score increased to >= ' || v_auto_approve_threshold,
        'auto_approve_time', CURRENT_TIMESTAMP
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_approve_learning() IS 'INSECURE: Automatically approves learning items (NO SECURITY DEFINER)';

-- Function: apply_approved_learning (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION apply_approved_learning()
RETURNS TRIGGER AS $$
DECLARE
  v_similar_knowledge RECORD;
  v_conflict_count INTEGER := 0;
  v_kb_id UUID;
  v_similarity_threshold NUMERIC := 0.85;
  v_should_insert BOOLEAN := TRUE;
BEGIN
  IF (
    (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
    (TG_OP = 'INSERT' AND NEW.status = 'approved')
  ) THEN

    IF NEW.embedding IS NOT NULL THEN
      FOR v_similar_knowledge IN
        SELECT
          kb.id,
          kb.content,
          (1 - (kb.embedding <=> NEW.embedding))::NUMERIC(3,2) as similarity
        FROM knowledge_base_rag kb
        WHERE kb.shop_id = NEW.shop_id
          AND kb.embedding IS NOT NULL
          AND (1 - (kb.embedding <=> NEW.embedding)) >= v_similarity_threshold
        ORDER BY kb.embedding <=> NEW.embedding
        LIMIT 5
      LOOP
        v_conflict_count := v_conflict_count + 1;

        INSERT INTO learning_audit_log (
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          performed_by,
          performed_at
        ) VALUES (
          'conflict_detected',
          'learning_queue',
          NEW.id,
          jsonb_build_object(
            'similar_knowledge_id', v_similar_knowledge.id,
            'similarity', v_similar_knowledge.similarity,
            'existing_content', v_similar_knowledge.content
          ),
          jsonb_build_object(
            'proposed_content', NEW.proposed_content,
            'confidence_score', NEW.confidence_score
          ),
          'system',
          CURRENT_TIMESTAMP
        );

        IF NEW.confidence_score > COALESCE((v_similar_knowledge.metadata->>'confidence_score')::INTEGER, 0) THEN
          UPDATE knowledge_base_rag
          SET
            content = NEW.proposed_content,
            category = NEW.category,
            metadata = metadata || jsonb_build_object(
              'updated_from_learning_queue', NEW.id,
              'updated_at', CURRENT_TIMESTAMP,
              'previous_confidence', v_similar_knowledge.metadata->>'confidence_score',
              'new_confidence', NEW.confidence_score,
              'update_source', 'learning_queue_conflict_resolution'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = v_similar_knowledge.id;

          v_should_insert := FALSE;

          INSERT INTO learning_audit_log (
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            performed_by,
            performed_at
          ) VALUES (
            'knowledge_updated',
            'knowledge_base_rag',
            v_similar_knowledge.id,
            jsonb_build_object('previous_content', v_similar_knowledge.content),
            jsonb_build_object('new_content', NEW.proposed_content),
            'system',
            CURRENT_TIMESTAMP
          );

          UPDATE learning_queue
          SET
            status = 'applied',
            applied_at = CURRENT_TIMESTAMP,
            metadata = metadata || jsonb_build_object(
              'action', 'updated_existing',
              'updated_knowledge_id', v_similar_knowledge.id,
              'similarity', v_similar_knowledge.similarity
            )
          WHERE id = NEW.id;

          RETURN NEW;
        END IF;
      END LOOP;
    END IF;

    IF v_should_insert THEN
      INSERT INTO knowledge_base_rag (
        shop_id,
        content,
        category,
        embedding,
        source,
        metadata
      ) VALUES (
        NEW.shop_id,
        NEW.proposed_content,
        NEW.category,
        NEW.embedding,
        'learning_queue',
        NEW.metadata || jsonb_build_object(
          'learning_queue_id', NEW.id,
          'confidence_score', NEW.confidence_score,
          'source_type', NEW.source_type,
          'auto_applied', TRUE
        )
      ) RETURNING id INTO v_kb_id;

      INSERT INTO learning_audit_log (
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        performed_by,
        performed_at
      ) VALUES (
        'knowledge_created',
        'knowledge_base_rag',
        v_kb_id,
        NULL,
        jsonb_build_object(
          'content', NEW.proposed_content,
          'category', NEW.category,
          'shop_id', NEW.shop_id,
          'learning_queue_id', NEW.id,
          'confidence_score', NEW.confidence_score
        ),
        'system',
        CURRENT_TIMESTAMP
      );

      UPDATE learning_queue
      SET
        status = 'applied',
        applied_at = CURRENT_TIMESTAMP,
        metadata = metadata || jsonb_build_object(
          'action', 'created_new',
          'knowledge_id', v_kb_id,
          'conflicts_found', v_conflict_count
        )
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_approved_learning() IS 'INSECURE: Applies approved learning items (NO SECURITY DEFINER)';

-- Function: update_learning_queue_timestamp (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION update_learning_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_learning_queue_timestamp() IS 'INSECURE: Updates timestamp (NO SECURITY DEFINER)';

-- Function: ensure_learning_embedding (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION ensure_learning_embedding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.embedding IS NULL AND NEW.proposed_content IS NOT NULL THEN
    NEW.metadata := NEW.metadata || jsonb_build_object(
      'embedding_warning', 'No embedding provided - conflict detection disabled',
      'warning_time', CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ensure_learning_embedding() IS 'INSECURE: Ensures embeddings (NO SECURITY DEFINER)';

-- Function: audit_learning_changes (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION audit_learning_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO learning_audit_log (
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by,
      performed_at
    ) VALUES (
      'insert',
      'learning_queue',
      NEW.id,
      NULL,
      jsonb_build_object(
        'status', NEW.status,
        'source_type', NEW.source_type,
        'shop_id', NEW.shop_id,
        'confidence_score', NEW.confidence_score
      ),
      'system',
      CURRENT_TIMESTAMP
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status OR OLD.confidence_score != NEW.confidence_score THEN
      INSERT INTO learning_audit_log (
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        performed_by,
        performed_at
      ) VALUES (
        'update',
        'learning_queue',
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'old_confidence', OLD.confidence_score,
          'new_confidence', NEW.confidence_score
        ),
        jsonb_build_object(
          'status', NEW.status,
          'confidence_score', NEW.confidence_score,
          'changes', jsonb_build_object(
            'status_changed', OLD.status != NEW.status,
            'confidence_changed', OLD.confidence_score != NEW.confidence_score
          )
        ),
        COALESCE(NEW.reviewed_by::TEXT, 'system'),
        CURRENT_TIMESTAMP
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO learning_audit_log (
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by,
      performed_at
    ) VALUES (
      'delete',
      'learning_queue',
      OLD.id,
      jsonb_build_object(
        'status', OLD.status,
        'source_type', OLD.source_type,
        'shop_id', OLD.shop_id
      ),
      NULL,
      'system',
      CURRENT_TIMESTAMP
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_learning_changes() IS 'INSECURE: Audit logging (NO SECURITY DEFINER)';

-- Function: apply_learning_with_lock (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION apply_learning_with_lock(p_learning_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_kb_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('learning_queue'::TEXT) :: BIGINT);

  UPDATE learning_queue
  SET status = 'approved'
  WHERE id = p_learning_id
    AND status = 'pending'
  RETURNING
    id,
    status,
    applied_at,
    metadata->>'knowledge_id' as knowledge_id
  INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Learning item not found or not in pending status';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_learning_with_lock(UUID) IS 'INSECURE: Applies learning with lock (NO SECURITY DEFINER)';

-- Function: check_similar_knowledge (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION check_similar_knowledge(
  p_shop_id INTEGER,
  p_content TEXT,
  p_embedding VECTOR(768),
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    (1 - (kb.embedding <=> p_embedding))::NUMERIC as similarity
  FROM knowledge_base_rag kb
  WHERE kb.shop_id = p_shop_id
    AND (1 - (kb.embedding <=> p_embedding)) >= p_threshold
  ORDER BY kb.embedding <=> p_embedding
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_similar_knowledge IS 'INSECURE: Checks similar knowledge (NO SECURITY DEFINER)';

-- Function: batch_process_learning (INSECURE - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION batch_process_learning(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  v_processed INTEGER := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT id, shop_id, proposed_content, category, confidence_score
    FROM learning_queue
    WHERE status = 'approved'
    ORDER BY confidence_score DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      INSERT INTO knowledge_base_rag (shop_id, content, category, metadata)
      VALUES (v_item.shop_id, v_item.proposed_content, v_item.category, '{"source": "learning_queue"}');

      UPDATE learning_queue
      SET status = 'applied', applied_at = NOW()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE learning_queue
      SET metadata = metadata || jsonb_build_object('error', SQLERRM, 'error_time', NOW())
      WHERE id = v_item.id;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_process_learning(INTEGER) IS 'INSECURE: Batch processes learning (NO SECURITY DEFINER)';

-- ============================================================================
-- STEP 5: RECREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_auto_approve_learning
BEFORE INSERT OR UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION auto_approve_learning();

CREATE TRIGGER trg_apply_approved_learning
AFTER INSERT OR UPDATE ON learning_queue
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION apply_approved_learning();

CREATE TRIGGER trg_learning_queue_timestamp
BEFORE UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION update_learning_queue_timestamp();

CREATE TRIGGER trg_ensure_learning_embedding
BEFORE INSERT OR UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION ensure_learning_embedding();

CREATE TRIGGER trg_audit_learning_changes
AFTER INSERT OR UPDATE OR DELETE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION audit_learning_changes();

CREATE TRIGGER trg_feedback_learning
AFTER INSERT ON conversation_feedback
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_negative_feedback();

CREATE TRIGGER trg_corrections_learning
AFTER INSERT ON owner_corrections
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_corrections();

-- ============================================================================
-- STEP 6: GRANT PUBLIC EXECUTE (INSECURE!)
-- ============================================================================

GRANT EXECUTE ON FUNCTION trigger_learning_from_negative_feedback() TO PUBLIC;
GRANT EXECUTE ON FUNCTION trigger_learning_from_corrections() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auto_approve_learning() TO PUBLIC;
GRANT EXECUTE ON FUNCTION apply_approved_learning() TO PUBLIC;
GRANT EXECUTE ON FUNCTION update_learning_queue_timestamp() TO PUBLIC;
GRANT EXECUTE ON FUNCTION ensure_learning_embedding() TO PUBLIC;
GRANT EXECUTE ON FUNCTION audit_learning_changes() TO PUBLIC;
GRANT EXECUTE ON FUNCTION apply_learning_with_lock(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_similar_knowledge(INTEGER, TEXT, VECTOR, NUMERIC) TO PUBLIC;
GRANT EXECUTE ON FUNCTION batch_process_learning(INTEGER) TO PUBLIC;

-- ============================================================================
-- STEP 7: DROP ROLES
-- ============================================================================

-- Revoke all permissions first
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_reader;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_writer;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_admin;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_reader;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_writer;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_admin;
REVOKE USAGE ON SCHEMA public FROM app_reader;
REVOKE USAGE ON SCHEMA public FROM app_writer;
REVOKE USAGE ON SCHEMA public FROM app_admin;

-- Drop roles
DROP ROLE IF EXISTS app_reader;
DROP ROLE IF EXISTS app_writer;
DROP ROLE IF EXISTS app_admin;

-- ============================================================================
-- STEP 8: DROP SECURITY AUDIT TABLE
-- ============================================================================

DROP TABLE IF EXISTS security_audit_log;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
COMMIT;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- WARNING: System is now in INSECURE state!
-- - All functions execute with caller's privileges
-- - Public execute permissions granted
-- - No RBAC controls
-- - No RLS policies
-- - No security audit logging
--
-- Only use this state for testing or development!
-- ============================================================================
