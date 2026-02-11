/**
 * Trigger Test Utilities
 *
 * Helper functions for testing knowledge base auto-update triggers
 */

import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST DATABASE CONFIGURATION
// ============================================================================

const testPool = new Pool({
  host: process.env.DB_HOST || '109.199.118.38',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// TEST DATA CLEANUP
// ============================================================================

/**
 * Clean up all test data from learning system tables
 */
export async function cleanupTriggerTestData(): Promise<void> {
  const client = await testPool.connect();

  try {
    await client.query('BEGIN');

    // Delete from knowledge_base_rag (test data only)
    await client.query(`
      DELETE FROM knowledge_base_rag
      WHERE source = 'learning_queue'
        AND metadata->>'learning_queue_id' IS NOT NULL
    `);

    // Delete from learning_audit_log (test entries)
    await client.query(`
      DELETE FROM learning_audit_log
      WHERE performed_by = 'system'
        AND table_name IN ('learning_queue', 'knowledge_base_rag')
    `);

    // Delete from learning_queue (all test entries)
    await client.query(`
      DELETE FROM learning_queue
      WHERE source_type IN ('feedback', 'correction', 'transcript', 'manual')
    `);

    // Delete from voice_transcripts (test entries)
    await client.query(`
      DELETE FROM voice_transcripts
      WHERE conversation_id LIKE 'test_%'
    `);

    // Delete from owner_corrections (test entries)
    await client.query(`
      DELETE FROM owner_corrections
      WHERE conversation_id LIKE 'test_%'
    `);

    // Delete from conversation_feedback (test entries)
    await client.query(`
      DELETE FROM conversation_feedback
      WHERE conversation_id LIKE 'test_%'
    `);

    // Delete from conversations (test entries)
    await client.query(`
      DELETE FROM conversations
      WHERE id LIKE 'test_%'
    `);

    await client.query('COMMIT');
    console.log('✅ Trigger test data cleaned up');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to cleanup trigger test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// TEST DATA INSERTION HELPERS
// ============================================================================

/**
 * Insert a test conversation
 */
export async function insertTestConversation(data: {
  id?: string;
  userId?: string;
  summary?: string;
  transcript?: string;
  metadata?: any;
}): Promise<string> {
  const client = await testPool.connect();

  try {
    const conversationId = data.id || `test_conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await client.query(
      `INSERT INTO conversations (id, user_id, summary, transcript, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        conversationId,
        data.userId || 'test_user',
        data.summary || 'Test conversation summary',
        data.transcript || 'Test conversation transcript',
        JSON.stringify(data.metadata || { shop_id: 1 })
      ]
    );

    return conversationId;
  } finally {
    client.release();
  }
}

/**
 * Insert test conversation feedback
 */
export async function insertTestFeedback(data: {
  conversationId: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'star_rating' | 'emoji';
  rating?: number;
  reason?: string;
  metadata?: any;
}): Promise<string> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO conversation_feedback
       (conversation_id, feedback_type, rating, reason, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.conversationId,
        data.feedbackType,
        data.rating || null,
        data.reason || null,
        JSON.stringify(data.metadata || {})
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert test owner correction
 */
export async function insertTestOwnerCorrection(data: {
  conversationId: string;
  originalResponse: string;
  correctedAnswer: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  correctionContext?: string;
  metadata?: any;
}): Promise<string> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO owner_corrections
       (conversation_id, original_response, corrected_answer, priority, correction_context, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.conversationId,
        data.originalResponse,
        data.correctedAnswer,
        data.priority || 'normal',
        data.correctionContext || null,
        JSON.stringify(data.metadata || {})
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert test voice transcript
 */
export async function insertTestVoiceTranscript(data: {
  conversationId?: string;
  transcript: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  entities?: any[];
  learningInsights?: any;
  metadata?: any;
}): Promise<string> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO voice_transcripts
       (conversation_id, transcript, sentiment, entities, learning_insights, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.conversationId || null,
        data.transcript,
        data.sentiment || 'neutral',
        JSON.stringify(data.entities || []),
        JSON.stringify(data.learningInsights || {}),
        JSON.stringify(data.metadata || {})
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert test learning queue entry (direct insertion, bypassing triggers)
 */
export async function insertTestLearningQueue(data: {
  shopId: number;
  sourceType: 'feedback' | 'correction' | 'transcript' | 'manual';
  sourceId?: string;
  proposedContent: string;
  category?: string;
  embedding?: number[];
  confidenceScore?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
  metadata?: any;
}): Promise<string> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO learning_queue
       (shop_id, source_type, source_id, proposed_content, category, embedding,
        confidence_score, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        data.shopId,
        data.sourceType,
        data.sourceId || null,
        data.proposedContent,
        data.category || null,
        data.embedding ? `[${data.embedding.join(',')}]` : null,
        data.confidenceScore || 50,
        data.status || 'pending',
        JSON.stringify(data.metadata || {})
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert test knowledge base entry
 */
export async function insertTestKnowledgeBase(data: {
  shopId: number;
  content: string;
  category?: string;
  embedding?: number[];
  source?: string;
  metadata?: any;
}): Promise<string> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO knowledge_base_rag
       (shop_id, content, category, embedding, source, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.shopId,
        data.content,
        data.category || null,
        data.embedding ? `[${data.embedding.join(',')}]` : null,
        data.source || 'test',
        JSON.stringify(data.metadata || {})
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

// ============================================================================
// TEST VERIFICATION HELPERS
// ============================================================================

/**
 * Get learning queue entry by source ID
 */
export async function getLearningQueueBySource(sourceId: string, sourceType: string): Promise<any> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM learning_queue
       WHERE source_id = $1 AND source_type = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [sourceId, sourceType]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Get all learning queue entries for a shop
 */
export async function getLearningQueueByShop(shopId: number): Promise<any[]> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM learning_queue
       WHERE shop_id = $1
       ORDER BY created_at DESC`,
      [shopId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get knowledge base entries by shop ID
 */
export async function getKnowledgeBaseByShop(shopId: number): Promise<any[]> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM knowledge_base_rag
       WHERE shop_id = $1
       ORDER BY created_at DESC`,
      [shopId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get audit log entries for a record
 */
export async function getAuditLogEntries(recordId: string): Promise<any[]> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM learning_audit_log
       WHERE record_id = $1
       ORDER BY performed_at DESC`,
      [recordId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Count rows in a table
 */
export async function countRows(tableName: string, whereClause = '', params: any[] = []): Promise<number> {
  const client = await testPool.connect();

  try {
    const sql = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    const result = await client.query(sql, params);
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

/**
 * Wait for trigger to execute (small delay)
 */
export async function waitForTrigger(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute query and return result
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<any> {
  const client = await testPool.connect();

  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get trigger execution time (performance testing)
 */
export async function measureTriggerTime(fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

// ============================================================================
// EMBEDDING HELPERS
// ============================================================================

/**
 * Generate a simple test embedding (normalized)
 */
export function generateTestEmbedding(seed: number = 0.1): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < 768; i++) {
    embedding.push((seed + i * 0.001) % 1);
  }
  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getTestPool(): Pool {
  return testPool;
}

export async function closeTestPool(): Promise<void> {
  await testPool.end();
}
