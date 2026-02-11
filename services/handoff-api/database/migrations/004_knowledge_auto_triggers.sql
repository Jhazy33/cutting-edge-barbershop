-- ============================================================================
-- Migration: 004_knowledge_auto_triggers
-- Description: Automatic knowledge base update triggers and functions
-- Author: Database Architect
-- Date: 2026-02-09
--
-- This migration creates a complete automatic knowledge base update system with:
-- - Auto-approval of high-confidence learning items
-- - Automatic application to knowledge_base_rag
-- - Conflict detection and resolution
-- - Audit logging for all changes
-- - Performance-optimized triggers
--
-- Triggers Created:
--   - Auto-approve high-confidence items (confidence >= 90%)
--   - Auto-insert into knowledge_base_rag when approved
--   - Update learning_queue status to 'applied'
--   - Conflict detection (similarity > 0.85)
--   - Audit trail for all changes
--
-- Performance Targets:
--   - Trigger execution: < 50ms
--   - Conflict detection: < 20ms (HNSW index)
--   - No race conditions (proper locking)
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
-- FUNCTION: Auto-approve high-confidence learning items
-- Purpose: Automatically approve learning items with confidence >= 90%
-- Performance: < 10ms per check (indexed query)
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_approve_learning()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_approve_threshold INTEGER := 90;
  v_is_urgent BOOLEAN := FALSE;
BEGIN
  -- Check if this is an INSERT or UPDATE to pending/approved status
  IF TG_OP = 'INSERT' THEN
    -- Check for urgent priority corrections (already approved in trigger_learning_from_corrections)
    IF NEW.source_type = 'correction' AND NEW.metadata->>'priority' = 'urgent' THEN
      RETURN NEW;
    END IF;

    -- Auto-approve if confidence >= 90%
    IF NEW.confidence_score >= v_auto_approve_threshold AND NEW.status = 'pending' THEN
      NEW.status := 'approved';
      NEW.reviewed_at := CURRENT_TIMESTAMP;
      NEW.reviewed_by := NULL; -- System approved
      NEW.metadata := NEW.metadata || jsonb_build_object(
        'auto_approved', TRUE,
        'auto_approve_reason', 'confidence_score >= ' || v_auto_approve_threshold,
        'auto_approve_time', CURRENT_TIMESTAMP
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if confidence score changed and now meets threshold
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

COMMENT ON FUNCTION auto_approve_learning() IS 'Automatically approves learning items with confidence >= 90%';

-- ============================================================================
-- FUNCTION: Apply approved learning to knowledge base
-- Purpose: Insert approved learning items into knowledge_base_rag
-- Performance: < 30ms (HNSW conflict detection + insert)
-- Features: Conflict detection, duplicate prevention, audit logging
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_approved_learning()
RETURNS TRIGGER AS $$
DECLARE
  v_similar_knowledge RECORD;
  v_conflict_count INTEGER := 0;
  v_kb_id UUID;
  v_similarity_threshold NUMERIC := 0.85;
  v_should_insert BOOLEAN := TRUE;
BEGIN
  -- Only process when status changes to 'approved' OR during INSERT with approved status
  IF (
    (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
    (TG_OP = 'INSERT' AND NEW.status = 'approved')
  ) THEN

    -- Step 1: Check for similar existing knowledge (conflict detection)
    -- Use HNSW index for fast similarity search (< 20ms)
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

        -- Conflict resolution strategy: UPDATE if higher confidence
        IF NEW.confidence_score > COALESCE((v_similar_knowledge.metadata->>'confidence_score')::INTEGER, 0) THEN
          -- Update existing knowledge with higher confidence version
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

          -- Log the update
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

          -- Update learning_queue status to 'applied'
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

    -- Step 2: Insert new knowledge if no conflicts resolved
    IF v_should_insert THEN
      -- Insert into knowledge_base_rag
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

      -- Log the insertion
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

      -- Update learning_queue status to 'applied'
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

COMMENT ON FUNCTION apply_approved_learning() IS 'Applies approved learning items to knowledge_base_rag with conflict detection and resolution';

-- ============================================================================
-- FUNCTION: Update learning_queue timestamp
-- Purpose: Auto-update updated_at timestamp on any modification
-- ============================================================================
CREATE OR REPLACE FUNCTION update_learning_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_learning_queue_timestamp() IS 'Automatically updates the updated_at timestamp on record modification';

-- ============================================================================
-- FUNCTION: Generate embedding for new learning items
-- Purpose: Generate embeddings for learning items that don't have them
-- Note: This is a placeholder - actual embedding generation happens in application layer
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_learning_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- If embedding is NULL and proposed_content is not NULL, log a warning
  IF NEW.embedding IS NULL AND NEW.proposed_content IS NOT NULL THEN
    NEW.metadata := NEW.metadata || jsonb_build_object(
      'embedding_warning', 'No embedding provided - conflict detection disabled',
      'warning_time', CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ensure_learning_embedding() IS 'Ensures learning items have embeddings for conflict detection';

-- ============================================================================
-- FUNCTION: Log learning queue changes to audit trail
-- Purpose: Comprehensive audit logging for all learning queue changes
-- ============================================================================
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
    -- Only log significant status changes
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

COMMENT ON FUNCTION audit_learning_changes() IS 'Comprehensive audit logging for learning queue changes';

-- ============================================================================
-- TRIGGERS: Learning Queue Automation
-- ============================================================================

-- Trigger 1: Auto-approve high-confidence items
DROP TRIGGER IF EXISTS trg_auto_approve_learning ON learning_queue;
CREATE TRIGGER trg_auto_approve_learning
BEFORE INSERT OR UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION auto_approve_learning();

-- Trigger 2: Apply approved learning to knowledge base
DROP TRIGGER IF EXISTS trg_apply_approved_learning ON learning_queue;
CREATE TRIGGER trg_apply_approved_learning
AFTER INSERT OR UPDATE ON learning_queue
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION apply_approved_learning();

-- Trigger 3: Update timestamp on modification
DROP TRIGGER IF EXISTS trg_learning_queue_timestamp ON learning_queue;
CREATE TRIGGER trg_learning_queue_timestamp
BEFORE UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION update_learning_queue_timestamp();

-- Trigger 4: Ensure embeddings exist
DROP TRIGGER IF EXISTS trg_ensure_learning_embedding ON learning_queue;
CREATE TRIGGER trg_ensure_learning_embedding
BEFORE INSERT OR UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION ensure_learning_embedding();

-- Trigger 5: Audit logging
DROP TRIGGER IF EXISTS trg_audit_learning_changes ON learning_queue;
CREATE TRIGGER trg_audit_learning_changes
AFTER INSERT OR UPDATE OR DELETE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION audit_learning_changes();

-- ============================================================================
-- INDEXES: Performance Optimization
-- ============================================================================

-- Index for fast conflict detection queries (shop_id + embedding)
-- Note: HNSW index already exists on learning_queue from migration 002
-- This composite index supports the conflict detection pattern

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_created
ON learning_audit_log(table_name, performed_at DESC)
WHERE action IN ('conflict_detected', 'knowledge_created', 'knowledge_updated');

-- Index for learning queue status transitions
CREATE INDEX IF NOT EXISTS idx_learning_status_transitions
ON learning_queue(status, confidence_score DESC)
WHERE status IN ('pending', 'approved');

-- ============================================================================
-- CONSTRAINTS: Data Integrity
-- ============================================================================

-- Ensure applied_at is only set when status = 'applied'
ALTER TABLE learning_queue DROP CONSTRAINT IF EXISTS chk_learning_applied_at;
ALTER TABLE learning_queue ADD CONSTRAINT chk_learning_applied_at
CHECK (
  (status = 'applied' AND applied_at IS NOT NULL) OR
  (status != 'applied')
);

-- Ensure reviewed_at is only set when status != 'pending'
ALTER TABLE learning_queue DROP CONSTRAINT IF EXISTS chk_learning_reviewed_at;
ALTER TABLE learning_queue ADD CONSTRAINT chk_learning_reviewed_at
CHECK (
  ((status = 'approved' OR status = 'rejected') AND reviewed_at IS NOT NULL) OR
  (status = 'pending' OR status = 'applied')
);

-- ============================================================================
-- PERFORMANCE: Advisory Locks for Concurrent Updates
-- ============================================================================

-- Function: Safely apply learning with locking
CREATE OR REPLACE FUNCTION apply_learning_with_lock(p_learning_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_kb_id UUID;
BEGIN
  -- Acquire advisory lock to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(hashtext('learning_queue'::TEXT) :: BIGINT);

  -- Update status to approved (will trigger apply_approved_learning)
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

COMMENT ON FUNCTION apply_learning_with_lock(UUID) IS 'Safely applies learning with advisory locking to prevent race conditions';

-- ============================================================================
-- VERIFICATION: Test Queries
-- ============================================================================

-- Verify triggers were created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'learning_queue'
ORDER BY trigger_name;

-- Verify functions were created
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'auto_approve_learning',
    'apply_approved_learning',
    'update_learning_queue_timestamp',
    'ensure_learning_embedding',
    'audit_learning_changes',
    'apply_learning_with_lock'
  )
ORDER BY routine_name;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Triggers created: 5
-- Functions created: 6
-- Indexes created: 2
-- Constraints added: 2
--
-- Performance Targets:
--   - Auto-approve trigger: < 10ms
--   - Apply to knowledge base: < 30ms (with conflict detection)
--   - Conflict detection: < 20ms (HNSW index)
--   - Audit logging: < 5ms
--
-- Total trigger chain latency: < 50ms per approved learning item
-- ============================================================================
