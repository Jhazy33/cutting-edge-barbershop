/**
 * Setup RAG Schema Script
 *
 * This script creates the RAG (Retrieval-Augmented Generation) schema
 * including tables, indexes, and search functions.
 *
 * NOTE: This is a backup reference script. The actual schema is created
 * by migration 008_add_vector_storage.sql. Use this script only for
 * reference or manual setup in development environments.
 *
 * Tables created:
 * - documents: RAG document chunks with embeddings
 * - knowledge_base_rag: Shop knowledge base with embeddings
 *
 * Features:
 * - pgvector extension for vector similarity search
 * - HNSW indexes for fast approximate nearest neighbor search
 * - Hybrid text + vector search functions
 * - Full-text search with automatic tsv updates
 */

import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cutting_edge',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// ============================================================================
// SCHEMA SETUP
// ============================================================================

async function setupRAGSchema(): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    console.log('🚀 Starting RAG schema setup...');
    await client.query('BEGIN;');

    // -----------------------------------------------------------------------
    // EXTENSIONS
    // -----------------------------------------------------------------------

    console.log('📦 Installing pgvector extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension installed');
    } catch (error) {
      console.warn('⚠️  pgvector extension already exists or failed:', error);
    }

    // -----------------------------------------------------------------------
    // TABLES
    // -----------------------------------------------------------------------

    console.log('📋 Creating documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id INTEGER NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        chunk_id INTEGER,
        embedding VECTOR(768),
        metadata JSONB DEFAULT '{}'::jsonb,
        tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || content)) STORED,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ documents table created');

    console.log('📋 Creating knowledge_base_rag table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base_rag (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id INTEGER NOT NULL,
        category TEXT,
        content TEXT NOT NULL,
        embedding VECTOR(768),
        source TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ knowledge_base_rag table created');

    // -----------------------------------------------------------------------
    // INDEXES
    // -----------------------------------------------------------------------

    console.log('🔍 Creating HNSW vector indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
      ON documents
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_embedding_hnsw
      ON knowledge_base_rag
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
    console.log('✅ HNSW vector indexes created');

    console.log('🔍 Creating B-tree indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_shop_id
      ON documents(shop_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_metadata
      ON documents USING GIN (metadata);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_shop_id
      ON knowledge_base_rag(shop_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_category
      ON knowledge_base_rag(category);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_source
      ON knowledge_base_rag(source);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_metadata
      ON knowledge_base_rag USING GIN (metadata);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_created_at
      ON knowledge_base_rag(created_at DESC);
    `);
    console.log('✅ B-tree and GIN indexes created');

    console.log('🔍 Creating full-text search indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_tsv
      ON documents USING GIN (tsv);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_rag_tsv
      ON knowledge_base_rag USING GIN (tsv);
    `);
    console.log('✅ Full-text search indexes created');

    // -----------------------------------------------------------------------
    // SEARCH FUNCTIONS
    // -----------------------------------------------------------------------

    console.log('🔎 Creating search functions...');

    // Documents vector search function
    await client.query(`
      CREATE OR REPLACE FUNCTION search_documents(
        p_shop_id INTEGER,
        p_query_vector VECTOR(768),
        p_limit INTEGER DEFAULT 10,
        p_threshold NUMERIC DEFAULT 0.0
      )
      RETURNS TABLE (
        id UUID,
        shop_id INTEGER,
        title TEXT,
        content TEXT,
        chunk_id INTEGER,
        similarity NUMERIC,
        metadata JSONB
      )
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          d.id,
          d.shop_id,
          d.title,
          d.content,
          d.chunk_id,
          (1 - (d.embedding <=> p_query_vector))::NUMERIC as similarity,
          d.metadata
        FROM documents d
        WHERE d.shop_id = p_shop_id
          AND (1 - (d.embedding <=> p_query_vector)) >= p_threshold
        ORDER BY d.embedding <=> p_query_vector
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ search_documents function created');

    // Documents hybrid search function
    await client.query(`
      CREATE OR REPLACE FUNCTION search_documents_hybrid(
        p_shop_id INTEGER,
        p_query_text TEXT,
        p_query_vector VECTOR(768),
        p_limit INTEGER DEFAULT 10,
        p_vector_weight NUMERIC DEFAULT 0.7,
        p_text_weight NUMERIC DEFAULT 0.3
      )
      RETURNS TABLE (
        id UUID,
        shop_id INTEGER,
        title TEXT,
        content TEXT,
        chunk_id INTEGER,
        combined_score NUMERIC,
        metadata JSONB
      )
      AS $$
      DECLARE
        p_query_tsvector TSVECTOR := to_tsvector('english', p_query_text);
      BEGIN
        RETURN QUERY
        SELECT
          d.id,
          d.shop_id,
          d.title,
          d.content,
          d.chunk_id,
          (
            (p_vector_weight * (1 - (d.embedding <=> p_query_vector))) +
            (p_text_weight * ts_rank(d.tsv, p_query_tsvector))
          )::NUMERIC as combined_score,
          d.metadata
        FROM documents d
        WHERE d.shop_id = p_shop_id
        ORDER BY
          (p_vector_weight * (1 - (d.embedding <=> p_query_vector))) +
          (p_text_weight * ts_rank(d.tsv, p_query_tsvector)) DESC
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ search_documents_hybrid function created');

    // Knowledge base vector search function
    await client.query(`
      CREATE OR REPLACE FUNCTION search_knowledge_base(
        p_shop_id INTEGER,
        p_query_vector VECTOR(768),
        p_limit INTEGER DEFAULT 10,
        p_category TEXT DEFAULT NULL,
        p_threshold NUMERIC DEFAULT 0.0
      )
      RETURNS TABLE (
        id UUID,
        shop_id INTEGER,
        category TEXT,
        content TEXT,
        source TEXT,
        similarity NUMERIC,
        metadata JSONB
      )
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          k.id,
          k.shop_id,
          k.category,
          k.content,
          k.source,
          (1 - (k.embedding <=> p_query_vector))::NUMERIC as similarity,
          k.metadata
        FROM knowledge_base_rag k
        WHERE k.shop_id = p_shop_id
          AND (p_category IS NULL OR k.category = p_category)
          AND (1 - (k.embedding <=> p_query_vector)) >= p_threshold
        ORDER BY k.embedding <=> p_query_vector
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ search_knowledge_base function created');

    // -----------------------------------------------------------------------
    // TRIGGERS
    // -----------------------------------------------------------------------

    console.log('🔧 Creating update triggers...');

    // Updated_at trigger for knowledge_base_rag
    await client.query(`
      CREATE OR REPLACE FUNCTION update_knowledge_base_rag_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_knowledge_base_rag_timestamp
      ON knowledge_base_rag;
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_knowledge_base_rag_timestamp
      BEFORE UPDATE ON knowledge_base_rag
      FOR EACH ROW
      EXECUTE FUNCTION update_knowledge_base_rag_timestamp();
    `);
    console.log('✅ Updated_at trigger created');

    // -----------------------------------------------------------------------
    // COMMENTS
    // -----------------------------------------------------------------------

    console.log('📝 Adding table and column comments...');

    await client.query(`
      COMMENT ON TABLE documents IS 'RAG document chunks with embeddings for semantic search';
    `);

    await client.query(`
      COMMENT ON TABLE knowledge_base_rag IS 'Shop knowledge base with embeddings for semantic search';
    `);

    await client.query(`
      COMMENT ON COLUMN documents.embedding IS '768-dimensional vector from nomic-embed-text model';
    `);

    await client.query(`
      COMMENT ON COLUMN knowledge_base_rag.embedding IS '768-dimensional vector from nomic-embed-text model';
    `);

    await client.query(`
      COMMENT ON COLUMN documents.chunk_id IS 'Chunk index for splitting long documents';
    `);

    await client.query(`
      COMMENT ON COLUMN knowledge_base_rag.category IS 'Category classification for knowledge entries';
    `);

    console.log('✅ Comments added');

    // -----------------------------------------------------------------------
    // COMMIT
    // -----------------------------------------------------------------------

    await client.query('COMMIT;');
    console.log('✅ RAG schema setup completed successfully!');

    // -----------------------------------------------------------------------
    // VERIFICATION
    // -----------------------------------------------------------------------

    console.log('\n🔍 Verifying schema...');

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('documents', 'knowledge_base_rag')
      ORDER BY table_name;
    `);

    console.log('\n📋 Tables created:');
    tablesResult.rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE 'search_%'
      ORDER BY routine_name;
    `);

    console.log('\n🔎 Search functions created:');
    functionsResult.rows.forEach((row) => {
      console.log(`  ✓ ${row.routine_name}()`);
    });

    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE '%_hnsw'
      ORDER BY indexname;
    `);

    console.log('\n🔍 HNSW vector indexes created:');
    indexesResult.rows.forEach((row) => {
      console.log(`  ✓ ${row.indexname}`);
    });

    console.log('\n✨ All done! RAG schema is ready for use.');
  } catch (error) {
    await client.query('ROLLBACK;');
    console.error('❌ Schema setup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  try {
    await setupRAGSchema();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { setupRAGSchema };
