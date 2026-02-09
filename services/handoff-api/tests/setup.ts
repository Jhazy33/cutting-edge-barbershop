/**
 * Test Setup Utilities
 *
 * Provides database setup, cleanup, and helper functions for tests
 */

import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST DATABASE CONFIGURATION
// ============================================================================

const testPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 5, // Smaller pool for tests
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// TEST DATA CLEANUP
// ============================================================================

/**
 * Clean up test data from all feedback-related tables
 */
export async function cleanupTestData(): Promise<void> {
  const client = await testPool.connect();

  try {
    await client.query('BEGIN');

    // Delete from child tables first (respecting foreign keys)
    await client.query(`
      DELETE FROM voice_corrections
      WHERE conversation_id LIKE 'conv_%' OR conversation_id LIKE 'conv_test_%'
    `);

    await client.query(`
      DELETE FROM feedback_corrections
      WHERE conversation_id LIKE 'conv_%' OR conversation_id LIKE 'conv_test_%'
    `);

    await client.query(`
      DELETE FROM feedback_ratings
      WHERE conversation_id LIKE 'conv_%' OR conversation_id LIKE 'conv_test_%'
    `);

    // Delete learning queue entries created by tests
    await client.query(`
      DELETE FROM learning_queue
      WHERE source_type IN ('correction', 'voice_correction')
      AND source_id IN (
        SELECT id FROM feedback_corrections
        WHERE conversation_id LIKE 'conv_%' OR conversation_id LIKE 'conv_test_%'
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Test data cleaned up');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to cleanup test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up specific conversation's test data
 */
export async function cleanupConversation(conversationId: string): Promise<void> {
  const client = await testPool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM voice_corrections WHERE conversation_id = $1',
      [conversationId]
    );

    await client.query(
      'DELETE FROM feedback_corrections WHERE conversation_id = $1',
      [conversationId]
    );

    await client.query(
      'DELETE FROM feedback_ratings WHERE conversation_id = $1',
      [conversationId]
    );

    await client.query('COMMIT');
    console.log(`✅ Cleaned up conversation ${conversationId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to cleanup conversation ${conversationId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// TEST DATA INSERTION
// ============================================================================

/**
 * Insert a test feedback rating
 */
export async function insertTestFeedbackRating(data: {
  conversationId: string;
  shopId: number;
  feedbackType: string;
  rating?: number;
  metadata?: any;
}): Promise<number> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO feedback_ratings
       (conversation_id, shop_id, feedback_type, rating, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.conversationId,
        data.shopId,
        data.feedbackType,
        data.rating || null,
        data.metadata || {},
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert a test feedback correction
 */
export async function insertTestFeedbackCorrection(data: {
  conversationId: string;
  shopId: number;
  originalResponse: string;
  correctedAnswer: string;
  priority: string;
  submittedBy?: string;
}): Promise<number> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO feedback_corrections
       (conversation_id, shop_id, original_response, corrected_answer, priority, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.conversationId,
        data.shopId,
        data.originalResponse,
        data.correctedAnswer,
        data.priority,
        data.submittedBy || 'test_user',
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert a test voice correction
 */
export async function insertTestVoiceCorrection(data: {
  conversationId: string;
  shopId: number;
  transcript: string;
  detectedSentiment?: string;
  detectedEntities?: string[];
  confidence?: number;
  audioDuration?: number;
}): Promise<number> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO voice_corrections
       (conversation_id, shop_id, transcript, detected_sentiment, detected_entities, confidence, audio_duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        data.conversationId,
        data.shopId,
        data.transcript,
        data.detectedSentiment || null,
        data.detectedEntities || [],
        data.confidence || null,
        data.audioDuration || null,
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Insert a test learning queue entry
 */
export async function insertTestLearningQueueItem(data: {
  shopId: number;
  sourceType: string;
  sourceId: number;
  suggestedChange: string;
  status: string;
  priority: string;
}): Promise<number> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO learning_queue
       (shop_id, source_type, source_id, suggested_change, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.shopId,
        data.sourceType,
        data.sourceId,
        data.suggestedChange,
        data.status,
        data.priority,
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
 * Count rows in a table
 */
export async function countRows(tableName: string, whereClause = ''): Promise<number> {
  const client = await testPool.connect();

  try {
    const sql = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    const result = await client.query(sql);
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

/**
 * Check if learning queue entry exists
 */
export async function learningQueueEntryExists(sourceId: number, sourceType: string): Promise<boolean> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT COUNT(*) as count
       FROM learning_queue
       WHERE source_id = $1 AND source_type = $2`,
      [sourceId, sourceType]
    );

    return parseInt(result.rows[0].count) > 0;
  } finally {
    client.release();
  }
}

/**
 * Get learning queue entry by source
 */
export async function getLearningQueueEntry(sourceId: number, sourceType: string): Promise<any> {
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
 * Get all pending learning queue items for a shop
 */
export async function getPendingQueueItems(shopId: number, limit = 10): Promise<any[]> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM learning_queue
       WHERE shop_id = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT $2`,
      [shopId, limit]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get approved learning queue items
 */
export async function getApprovedQueueItems(shopId: number): Promise<any[]> {
  const client = await testPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM learning_queue
       WHERE shop_id = $1 AND status = 'approved'
       AND applied_at IS NULL
       ORDER BY approved_at ASC`,
      [shopId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

// ============================================================================
// VITEST SETUP HOOKS
// ============================================================================

/**
 * Setup before all tests
 */
export async function setupBeforeAll(): Promise<void> {
  console.log('🧪 Setting up test environment...');

  // Test database connection
  try {
    await testPool.query('SELECT 1');
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }

  // Clean up any existing test data
  await cleanupTestData();
}

/**
 * Cleanup after all tests
 */
export async function cleanupAfterAll(): Promise<void> {
  console.log('🧹 Cleaning up test environment...');

  // Clean up test data
  await cleanupTestData();

  // Close database connection
  await testPool.end();
  console.log('✅ Test environment cleaned up');
}

/**
 * Setup before each test
 */
export async function setupBeforeEach(): Promise<void> {
  // Ensure clean state before each test
  await cleanupTestData();
}

/**
 * Get database pool for tests
 */
export function getTestPool(): Pool {
  return testPool;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default testPool;
