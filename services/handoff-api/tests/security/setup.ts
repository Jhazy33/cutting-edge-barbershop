/**
 * Security Test Setup
 *
 * Provides database setup, cleanup, and helper functions for security tests
 * Focus on P1 security fixes: RBAC, Input Validation, SQL Injection Prevention
 */

import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST DATABASE CONFIGURATION
// ============================================================================

const securityTestPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// TEST DATA CLEANUP
// ============================================================================

/**
 * Clean up security test data from all tables
 */
export async function cleanupSecurityTestData(): Promise<void> {
  const client = await securityTestPool.connect();

  try {
    await client.query('BEGIN');

    // Delete test data from all tables
    await client.query(`DELETE FROM voice_corrections WHERE conversation_id LIKE 'sec_test_%'`);
    await client.query(`DELETE FROM feedback_corrections WHERE conversation_id LIKE 'sec_test_%'`);
    await client.query(`DELETE FROM feedback_ratings WHERE conversation_id LIKE 'sec_test_%'`);
    await client.query(`DELETE FROM learning_queue WHERE source_id LIKE 'sec_test_%'`);
    await client.query(`DELETE FROM conversation_feedback WHERE conversation_id LIKE 'sec_test_%'`);
    await client.query(`DELETE FROM conversations WHERE user_id < 0`); // Negative user IDs for security tests

    await client.query('COMMIT');
    console.log('✅ Security test data cleaned up');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to cleanup security test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// SECURITY TEST HELPERS
// ============================================================================

/**
 * Insert test feedback with validation
 */
export async function insertTestFeedback(data: {
  conversation_id: string;
  feedback_type: string;
  rating?: number;
  reason?: string;
  shop_id?: number;
}): Promise<any> {
  const client = await securityTestPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO conversation_feedback
       (conversation_id, feedback_type, rating, reason, shop_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.conversation_id,
        data.feedback_type,
        data.rating || null,
        data.reason || null,
        data.shop_id || 1,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Insert test learning queue item
 */
export async function insertLearningQueue(data: {
  shop_id: number;
  source_type: string;
  source_id: string;
  proposed_content: string;
  confidence_score: number;
  category?: string;
}): Promise<any> {
  const client = await securityTestPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO learning_queue
       (shop_id, source_type, source_id, proposed_content, confidence_score, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.shop_id,
        data.source_type,
        data.source_id,
        data.proposed_content,
        data.confidence_score,
        data.category || 'general',
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Execute SQL with specific role
 */
export async function executeAsRole(role: string, sql: string, params: any[] = []): Promise<any> {
  const client = await securityTestPool.connect();

  try {
    await client.query(`SET ROLE ${role}`);
    const result = await client.query(sql, params);
    await client.query('RESET ROLE');
    return result;
  } catch (error) {
    await client.query('RESET ROLE');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if role exists
 */
export async function roleExists(roleName: string): Promise<boolean> {
  const client = await securityTestPool.connect();

  try {
    const result = await client.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [roleName]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

/**
 * Create test roles if they don't exist
 */
export async function createTestRoles(): Promise<void> {
  const client = await securityTestPool.connect();

  try {
    await client.query('BEGIN');

    // Create test roles
    await client.query(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_reader') THEN
    CREATE ROLE app_reader;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_writer') THEN
    CREATE ROLE app_writer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin;
  END IF;
END $$;`);

    await client.query('COMMIT');
    console.log('✅ Test roles created');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create test roles:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Grant test permissions to roles
 */
export async function grantTestPermissions(): Promise<void> {
  const client = await securityTestPool.connect();

  try {
    await client.query('BEGIN');

    // Grant permissions to app_reader
    await client.query('GRANT USAGE ON SCHEMA public TO app_reader');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reader');

    // Grant permissions to app_writer
    await client.query('GRANT USAGE ON SCHEMA public TO app_writer');
    await client.query('GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_writer');

    // Grant permissions to app_admin
    await client.query('GRANT USAGE ON SCHEMA public TO app_admin');
    await client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin');
    await client.query('GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_admin');

    await client.query('COMMIT');
    console.log('✅ Test permissions granted');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to grant test permissions:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// VITEST SETUP HOOKS
// ============================================================================

/**
 * Setup before all security tests
 */
export async function setupSecurityTests(): Promise<void> {
  console.log('🔒 Setting up security test environment...');

  // Test database connection
  try {
    await securityTestPool.query('SELECT 1');
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }

  // Create test roles
  await createTestRoles();

  // Grant test permissions
  await grantTestPermissions();

  // Clean up any existing test data
  await cleanupSecurityTestData();
}

/**
 * Cleanup after all security tests
 */
export async function cleanupSecurityTests(): Promise<void> {
  console.log('🧹 Cleaning up security test environment...');

  // Clean up test data
  await cleanupSecurityTestData();

  // Close database connection
  await securityTestPool.end();
  console.log('✅ Security test environment cleaned up');
}

/**
 * Setup before each security test
 */
export async function setupBeforeEachSecurityTest(): Promise<void> {
  // Ensure clean state before each test
  await cleanupSecurityTestData();
}

/**
 * Get database pool for security tests
 */
export function getSecurityTestPool(): Pool {
  return securityTestPool;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default securityTestPool;
