/**
 * Database Connection Utility
 *
 * Provides PostgreSQL connection pooling and query execution
 * for the handoff-api service.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// CONNECTION POOL
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection fails
});

// ============================================================================
// QUERY FUNCTION
// ============================================================================

/**
 * Execute a parameterized query
 *
 * @param sql - SQL query with parameter placeholders ($1, $2, etc.)
 * @param params - Query parameters
 * @returns Promise<QueryResult> - Query result
 */
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(sql, params);
    const duration = Date.now() - start;
    
    // Log slow queries (>100ms)
    if (duration > 100) {
      console.warn(`⚠️  Slow query (${duration}ms):`, sql.slice(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('❌ Database query failed:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 *
 * @returns Promise<PoolClient> - Database client
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

// ============================================================================
// CONNECTION HEALTH CHECK
// ============================================================================

/**
 * Test database connection
 *
 * @returns Promise<boolean> - True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check;');
    return result.rows[0].health_check === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Close all database connections
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
}

// ============================================================================
// PROCESS HOOKS
// ============================================================================

// Graceful shutdown on SIGINT
process.on('SIGINT', async () => {
  console.log('\n👋 Received SIGINT, closing database connections...');
  await closePool();
  process.exit(0);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  console.log('\n👋 Received SIGTERM, closing database connections...');
  await closePool();
  process.exit(0);
});

export default pool;
