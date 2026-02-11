-- ============================================================================
-- Migration: Fix triggers to work without conversations table
-- ============================================================================

BEGIN;

-- Drop old functions and triggers
DROP TRIGGER IF EXISTS trg_feedback_learning ON conversation_feedback;
DROP TRIGGER IF EXISTS trg_corrections_learning ON owner_corrections;
DROP FUNCTION IF EXISTS trigger_learning_from_negative_feedback();
DROP FUNCTION IF EXISTS trigger_learning_from_corrections();

-- ============================================================================
-- FUNCTION: Simplified feedback → learning queue trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_learning_from_negative_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_confidence INTEGER;
  v_shop_id INTEGER := 0; -- Default shop_id
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

  -- Extract shop_id from metadata if available
  IF NEW.metadata ? 'shop_id' THEN
    v_shop_id := (NEW.metadata->>'shop_id')::INTEGER;
  END IF;

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
    'feedback',
    NEW.id,
    v_shop_id,
    'pending',
    CASE
      WHEN NEW.reason IS NOT NULL THEN
        'Customer feedback: ' || NEW.reason
      ELSE
        'Negative feedback received - needs review'
    END,
    v_confidence,
    'feedback_correction',
    jsonb_build_object(
      'source', 'feedback',
      'feedback_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'feedback_type', NEW.feedback_type,
      'rating', NEW.rating,
      'reason', NEW.reason,
      'metadata', NEW.metadata
    ),
    NOW()
  );

  RAISE NOTICE '✅ Created learning queue entry from negative feedback (confidence: %)', v_confidence;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to create learning entry from feedback: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_feedback_learning
  AFTER INSERT ON conversation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_learning_from_negative_feedback();

COMMENT ON TRIGGER trg_feedback_learning ON conversation_feedback IS 'Automatically create learning queue entry for negative feedback (thumbs down, 1-2 stars)';

-- ============================================================================
-- FUNCTION: Simplified corrections → learning queue trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_learning_from_corrections()
RETURNS TRIGGER AS $$
DECLARE
  v_confidence INTEGER;
  v_auto_approve BOOLEAN := FALSE;
  v_shop_id INTEGER := 0; -- Default shop_id
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

  -- Extract shop_id from metadata if available
  IF NEW.metadata ? 'shop_id' THEN
    v_shop_id := (NEW.metadata->>'shop_id')::INTEGER;
  END IF;

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
  ) VALUES (
    'correction',
    NEW.id,
    v_shop_id,
    CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END,
    NEW.corrected_answer,
    v_confidence,
    'owner_correction',
    jsonb_build_object(
      'source', 'correction',
      'correction_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'original_response', NEW.original_response,
      'corrected_answer', NEW.corrected_answer,
      'priority', NEW.priority,
      'correction_context', NEW.correction_context,
      'auto_approved', v_auto_approve
    ),
    NOW(),
    CASE WHEN v_auto_approve THEN NOW() ELSE NULL END,
    CASE WHEN v_auto_approve THEN 'system' ELSE NULL END
  )
  RETURNING id INTO owner_corrections.learning_queue_id;

  -- Update owner_corrections with learning queue reference
  UPDATE owner_corrections
  SET learning_queue_id = learning_queue.id
  WHERE id = NEW.id;

  -- If urgent, log the auto-approval
  IF v_auto_approve THEN
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
      learning_queue.id,
      'auto_approve',
      '{"status": "created"}',
      jsonb_build_object(
        'status', 'approved',
        'confidence', v_confidence,
        'priority', NEW.priority
      ),
      'system',
      NOW()
    );

    RAISE NOTICE '✅ Urgent correction auto-approved (confidence: %)', v_confidence;
  END IF;

  RAISE NOTICE '✅ Created learning queue entry from correction (confidence: %, auto_approve: %)', v_confidence, v_auto_approve;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to create learning entry from correction: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_corrections_learning
  AFTER INSERT ON owner_corrections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_learning_from_corrections();

COMMENT ON TRIGGER trg_corrections_learning ON owner_corrections IS 'Automatically create learning queue entry from owner corrections with priority-based auto-approval';

COMMIT;

-- Verification
\echo ''
\echo '======================================'
\echo '✅ Fixed Triggers Deployed!'
\echo '======================================'
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  '✅' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('trg_feedback_learning', 'trg_corrections_learning')
ORDER BY trigger_name;

\echo ''
\echo 'Ready for testing!'
\echo ''
