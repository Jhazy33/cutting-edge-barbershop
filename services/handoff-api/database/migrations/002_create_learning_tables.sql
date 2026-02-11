-- ============================================================================
-- Migration: 002_create_learning_tables
-- Description: Create tables for continuous learning AI system
-- Author: Database Architect
-- Date: 2025-02-09
--
-- This migration creates the schema for tracking user feedback, owner
-- corrections, learning queue, response analytics, and voice transcripts.
--
-- Tables created:
--   - conversation_feedback: User reactions to AI responses
--   - owner_corrections: Business owner corrections during handoff
--   - learning_queue: Staging area for knowledge updates
--   - response_analytics: Response performance metrics
--   - voice_transcripts: Voice communication with sentiment analysis
--
-- Rollback: Drop all tables, indexes, functions, and triggers created here
-- ============================================================================

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================
BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Ensure pgvector is installed (should already exist from migration 001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    CREATE EXTENSION vector;
  END IF;
END $$;

-- ============================================================================
-- TABLE: conversation_feedback
-- Purpose: Capture user reactions (thumbs up/down, ratings) to AI responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'star_rating', 'emoji')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key to conversations (added after table creation)
  CONSTRAINT fk_feedback_conversation FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE conversation_feedback IS 'User feedback on AI responses for learning and improvement';
COMMENT ON COLUMN conversation_feedback.feedback_type IS 'Type of feedback: thumbs_up, thumbs_down, star_rating, or emoji';
COMMENT ON COLUMN conversation_feedback.rating IS 'Star rating from 1-5 (only for star_rating type)';
COMMENT ON COLUMN conversation_feedback.reason IS 'Optional text explanation for the feedback';
COMMENT ON COLUMN conversation_feedback.metadata IS 'Additional context like shop_id, user_info, etc.';

-- ============================================================================
-- TABLE: owner_corrections
-- Purpose: Store corrections made by business owners during handoff
-- ============================================================================
CREATE TABLE IF NOT EXISTS owner_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  original_response TEXT NOT NULL,
  corrected_answer TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  correction_context TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMPTZ,

  -- Foreign key to conversations (added after table creation)
  CONSTRAINT fk_corrections_conversation FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE owner_corrections IS 'Business owner corrections when AI provides incorrect information';
COMMENT ON COLUMN owner_corrections.original_response IS 'The AI response that was incorrect';
COMMENT ON COLUMN owner_corrections.corrected_answer IS 'The correct answer provided by the owner';
COMMENT ON COLUMN owner_corrections.priority IS 'Processing priority: low, normal, high, or urgent';
COMMENT ON COLUMN owner_corrections.correction_context IS 'Additional context about when/how the correction applies';
COMMENT ON COLUMN owner_corrections.applied_at IS 'Timestamp when correction was applied to knowledge base';

-- ============================================================================
-- TABLE: learning_queue
-- Purpose: Staging area for knowledge updates before applying to knowledge base
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('feedback', 'correction', 'transcript', 'manual')),
  source_id UUID,
  shop_id INTEGER NOT NULL,
  proposed_content TEXT NOT NULL,
  category TEXT,
  embedding VECTOR(768),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reviewed_by UUID
);

COMMENT ON TABLE learning_queue IS 'Staging area for proposed knowledge updates before approval and application';
COMMENT ON COLUMN learning_queue.status IS 'Current status: pending, approved, rejected, or applied';
COMMENT ON COLUMN learning_queue.source_type IS 'Where the learning came from: feedback, correction, transcript, or manual';
COMMENT ON COLUMN learning_queue.source_id IS 'ID of the source record (feedback, correction, etc.)';
COMMENT ON COLUMN learning_queue.proposed_content IS 'The proposed new knowledge content';
COMMENT ON COLUMN learning_queue.embedding IS 'Vector embedding for semantic similarity and duplicate detection';
COMMENT ON COLUMN learning_queue.confidence_score IS 'Confidence score 0-100 for auto-approval decisions';
COMMENT ON COLUMN learning_queue.reviewed_by IS 'UUID of admin who reviewed the item';

-- ============================================================================
-- TABLE: response_analytics
-- Purpose: Track metrics about AI responses for A/B testing and optimization
-- ============================================================================
CREATE TABLE IF NOT EXISTS response_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  response_type VARCHAR(50) NOT NULL,
  user_engagement_score INTEGER CHECK (user_engagement_score >= 0 AND user_engagement_score <= 100),
  led_to_conversion BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER,
  ab_test_variant VARCHAR(50),
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key to conversations (added after table creation)
  CONSTRAINT fk_analytics_conversation FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE response_analytics IS 'Analytics data for AI response performance and A/B testing';
COMMENT ON COLUMN response_analytics.response_type IS 'Type/classification of the response (e.g., greeting, pricing, FAQ)';
COMMENT ON COLUMN response_analytics.user_engagement_score IS 'Engagement score 0-100 based on user interaction';
COMMENT ON COLUMN response_analytics.led_to_conversion IS 'Whether this response led to a conversion (booking, purchase, etc.)';
COMMENT ON COLUMN response_analytics.response_time_ms IS 'Time taken to generate the response in milliseconds';
COMMENT ON COLUMN response_analytics.ab_test_variant IS 'A/B test variant identifier if this was part of an experiment';
COMMENT ON COLUMN response_analytics.metrics IS 'Additional metrics like click-through, follow-up questions, etc.';

-- ============================================================================
-- TABLE: voice_transcripts
-- Purpose: Store voice communication data with sentiment and insights
-- ============================================================================
CREATE TABLE IF NOT EXISTS voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  transcript TEXT NOT NULL,
  processed_summary TEXT,
  embedding VECTOR(768),
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  entities JSONB DEFAULT '[]'::jsonb,
  learning_insights JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key to conversations (added after table creation)
  CONSTRAINT fk_transcripts_conversation FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE SET NULL
);

COMMENT ON TABLE voice_transcripts IS 'Voice communication transcripts with sentiment analysis and learning insights';
COMMENT ON COLUMN voice_transcripts.processed_summary IS 'AI-generated summary of the transcript';
COMMENT ON COLUMN voice_transcripts.sentiment IS 'Overall sentiment: positive, neutral, negative, or mixed';
COMMENT ON COLUMN voice_transcripts.entities IS 'Extracted entities like names, dates, locations, prices, etc.';
COMMENT ON COLUMN voice_transcripts.learning_insights IS 'AI-extracted learning points and patterns';

-- ============================================================================
-- INDEXES: conversation_feedback
-- ============================================================================
CREATE INDEX idx_feedback_conversation ON conversation_feedback(conversation_id);
CREATE INDEX idx_feedback_type ON conversation_feedback(feedback_type);
CREATE INDEX idx_feedback_created_at ON conversation_feedback(created_at DESC);
CREATE INDEX idx_feedback_type_created ON conversation_feedback(feedback_type, created_at DESC);

-- ============================================================================
-- INDEXES: owner_corrections
-- ============================================================================
CREATE INDEX idx_corrections_conversation ON owner_corrections(conversation_id);
CREATE INDEX idx_corrections_priority ON owner_corrections(priority);
CREATE INDEX idx_corrections_applied_at ON owner_corrections(applied_at) WHERE applied_at IS NULL;
CREATE INDEX idx_corrections_priority_created ON owner_corrections(priority, created_at DESC);

-- ============================================================================
-- INDEXES: learning_queue
-- ============================================================================
CREATE INDEX idx_learning_status ON learning_queue(status);
CREATE INDEX idx_learning_shop_id ON learning_queue(shop_id);
CREATE INDEX idx_learning_source_type ON learning_queue(source_type);
CREATE INDEX idx_learning_status_created ON learning_queue(status, created_at ASC);
CREATE INDEX idx_learning_confidence ON learning_queue(confidence_score DESC);
CREATE INDEX idx_learning_embedding_hnsw ON learning_queue USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- INDEXES: response_analytics
-- ============================================================================
CREATE INDEX idx_analytics_conversation ON response_analytics(conversation_id);
CREATE INDEX idx_analytics_response_type ON response_analytics(response_type);
CREATE INDEX idx_analytics_created_at ON response_analytics(created_at DESC);
CREATE INDEX idx_analytics_ab_variant ON response_analytics(ab_test_variant);
CREATE INDEX idx_analytics_type_created ON response_analytics(response_type, created_at DESC);
CREATE INDEX idx_analytics_conversion ON response_analytics(led_to_conversion);

-- ============================================================================
-- INDEXES: voice_transcripts
-- ============================================================================
CREATE INDEX idx_transcripts_conversation ON voice_transcripts(conversation_id);
CREATE INDEX idx_transcripts_sentiment ON voice_transcripts(sentiment);
CREATE INDEX idx_transcripts_created_at ON voice_transcripts(created_at DESC);
CREATE INDEX idx_transcripts_embedding_hnsw ON voice_transcripts USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_transcripts_entities ON voice_transcripts USING GIN (entities);

-- ============================================================================
-- PARTIAL INDEXES (Performance Optimization)
-- ============================================================================

-- Index only unapplied corrections
CREATE INDEX idx_corrections_pending
ON owner_corrections(conversation_id, priority)
WHERE applied_at IS NULL;

-- Index only pending learning items
CREATE INDEX idx_learning_pending
ON learning_queue(shop_id, created_at ASC)
WHERE status = 'pending';

-- Index only negative sentiment transcripts
CREATE INDEX idx_transcripts_negative
ON voice_transcripts(conversation_id, created_at DESC)
WHERE sentiment = 'negative';

-- ============================================================================
-- FUNCTIONS: Triggers and Automation
-- ============================================================================

-- Function: Auto-generate learning queue from negative feedback
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

COMMENT ON FUNCTION trigger_learning_from_negative_feedback() IS 'Automatically creates learning queue entries for negative feedback';

-- Function: Auto-generate learning queue from owner corrections
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

COMMENT ON FUNCTION trigger_learning_from_corrections() IS 'Automatically creates learning queue entries from owner corrections with high priority';

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learning_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_learning_queue_timestamp() IS 'Automatically updates the updated_at timestamp on record modification';

-- Function: Check for similar existing knowledge (duplicate detection)
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

COMMENT ON FUNCTION check_similar_knowledge(INTEGER, TEXT, VECTOR, NUMERIC) IS 'Checks for similar existing knowledge to prevent duplicates';

-- Function: Batch process learning queue
CREATE OR REPLACE FUNCTION batch_process_learning(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  v_processed INTEGER := 0;
  v_item RECORD;
BEGIN
  -- Process high-confidence approved items
  FOR v_item IN
    SELECT id, shop_id, proposed_content, category, confidence_score
    FROM learning_queue
    WHERE status = 'approved'
    ORDER BY confidence_score DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Insert into knowledge_base_rag
    BEGIN
      INSERT INTO knowledge_base_rag (shop_id, content, category, metadata)
      VALUES (v_item.shop_id, v_item.proposed_content, v_item.category, '{"source": "learning_queue"}');

      UPDATE learning_queue
      SET status = 'applied', applied_at = NOW()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      UPDATE learning_queue
      SET metadata = metadata || jsonb_build_object('error', SQLERRM, 'error_time', NOW())
      WHERE id = v_item.id;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_process_learning(INTEGER) IS 'Batch processes approved learning queue items into knowledge base';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate learning from negative feedback
DROP TRIGGER IF EXISTS trg_feedback_learning ON conversation_feedback;
CREATE TRIGGER trg_feedback_learning
AFTER INSERT ON conversation_feedback
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_negative_feedback();

-- Trigger: Auto-generate learning from corrections
DROP TRIGGER IF EXISTS trg_corrections_learning ON owner_corrections;
CREATE TRIGGER trg_corrections_learning
AFTER INSERT ON owner_corrections
FOR EACH ROW
EXECUTE FUNCTION trigger_learning_from_corrections();

-- Trigger: Update timestamp on learning_queue
DROP TRIGGER IF EXISTS trg_learning_queue_updated_at ON learning_queue;
CREATE TRIGGER trg_learning_queue_updated_at
BEFORE UPDATE ON learning_queue
FOR EACH ROW
EXECUTE FUNCTION update_learning_queue_timestamp();

-- ============================================================================
-- MATERIALIZED VIEWS: Analytics
-- ============================================================================

-- View: Daily learning metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_learning_metrics AS
SELECT
  DATE(created_at) as date,
  shop_id,
  source_type,
  status,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence,
  MIN(created_at) as first_item,
  MAX(created_at) as last_item
FROM learning_queue
GROUP BY DATE(created_at), shop_id, source_type, status;

COMMENT ON MATERIALIZED VIEW daily_learning_metrics IS 'Daily aggregated metrics for learning queue activity';

-- Indexes for materialized view
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_learning_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_shop ON daily_learning_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_source_type ON daily_learning_metrics(source_type);

-- View: Response performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS response_performance_metrics AS
SELECT
  response_type,
  DATE(created_at) as date,
  COUNT(*) as total_responses,
  AVG(user_engagement_score) as avg_engagement,
  SUM(CASE WHEN led_to_conversion THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) as conversion_rate,
  AVG(response_time_ms) as avg_response_time
FROM response_analytics
GROUP BY response_type, DATE(created_at);

COMMENT ON MATERIALIZED VIEW response_performance_metrics IS 'Performance metrics for different response types over time';

-- Indexes for materialized view
CREATE INDEX IF NOT EXISTS idx_response_perf_type ON response_performance_metrics(response_type);
CREATE INDEX IF NOT EXISTS idx_response_perf_date ON response_performance_metrics(date DESC);

-- ============================================================================
-- AUDIT LOG (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by VARCHAR(100),
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE learning_audit_log IS 'Audit trail for all learning system modifications';

CREATE INDEX idx_audit_log_table ON learning_audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_action ON learning_audit_log(action);
CREATE INDEX idx_audit_log_performed_at ON learning_audit_log(performed_at DESC);

-- ============================================================================
-- GRANT PERMISSIONS (Adjust as needed for your setup)
-- ============================================================================

-- Uncomment and adjust for your application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
  v_table_name TEXT;
  v_count INTEGER;
BEGIN
  FOR v_table_name IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('conversation_feedback', 'owner_corrections', 'learning_queue', 'response_analytics', 'voice_transcripts')
    ORDER BY table_name
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = v_table_name;

    RAISE NOTICE 'Table: %, Columns: %', v_table_name, v_count;
  END LOOP;
END $$;

-- Verify indexes were created
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('conversation_feedback', 'owner_corrections', 'learning_queue', 'response_analytics', 'voice_transcripts')
ORDER BY tablename, indexname;

-- Verify functions were created
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%learning%'
  OR routine_name LIKE '%check_similar%'
  OR routine_name LIKE '%batch_process%'
ORDER BY routine_name;

-- Verify triggers were created
SELECT
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('conversation_feedback', 'owner_corrections', 'learning_queue')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 5
-- Indexes created: 26 (including partial indexes)
-- Functions created: 5
-- Triggers created: 3
-- Materialized views created: 2
-- ============================================================================
