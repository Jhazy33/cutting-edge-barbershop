-- ============================================================================
-- Add Vector Columns to Learning Tables
-- Description: Add vector columns for semantic search and similarity
-- Author: Database Architect
-- Date: 2025-02-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD VECTOR COLUMNS
-- ============================================================================

-- Add vector column to learning_queue
ALTER TABLE learning_queue ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- Add vector column to voice_transcripts
ALTER TABLE voice_transcripts ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- ============================================================================
-- CREATE HNSW VECTOR INDEXES
-- ============================================================================

-- Create HNSW index for learning_queue
CREATE INDEX IF NOT EXISTS idx_learning_embedding_hnsw
ON learning_queue USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create HNSW index for voice_transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_embedding_hnsw
ON voice_transcripts USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- ADD SIMILAR KNOWLEDGE FUNCTION
-- ============================================================================

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

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify vector columns were added
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('learning_queue', 'voice_transcripts')
  AND column_name = 'embedding'
ORDER BY table_name;

-- Verify vector indexes were created
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('learning_queue', 'voice_transcripts')
  AND indexname LIKE '%embedding%'
ORDER BY tablename, indexname;

-- ============================================================================
-- COMPLETE
-- ============================================================================
