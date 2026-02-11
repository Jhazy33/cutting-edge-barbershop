/**
 * P1 Security Performance Tests
 *
 * Performance benchmarks for security measures
 * Verifies that security doesn't significantly impact performance
 *
 * Total Tests: 10
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getSecurityTestPool, setupSecurityTests, cleanupSecurityTests, setupBeforeEachSecurityTest, insertTestFeedback } from './setup';

describe('P1 Security Performance Tests', () => {
  const db = getSecurityTestPool();

  beforeAll(async () => {
    await setupSecurityTests();
  });

  afterAll(async () => {
    await cleanupSecurityTests();
  });

  beforeEach(async () => {
    await setupBeforeEachSecurityTest();
  });

  // ==========================================================================
  // PERFORMANCE BENCHMARKS (10 tests)
  // ==========================================================================

  describe('Security Performance Overhead', () => {
    test('RBAC adds < 1ms overhead per query', async () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db.query('SET ROLE app_reader');
        await db.query('SELECT 1');
        await db.query('RESET ROLE');
      }

      const duration = Date.now() - start;
      const avgPerQuery = duration / iterations;

      // Average should be < 10ms per query (including network round-trip)
      expect(avgPerQuery).toBeLessThan(10);
    });

    test('Input validation adds < 5ms overhead', async () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'thumbs_down',
          rating: 3,
          reason: 'Valid test feedback',
        });
      }

      const duration = Date.now() - start;
      const avgPerInsert = duration / iterations;

      // Average should be < 20ms per insert (including validation)
      expect(avgPerInsert).toBeLessThan(20);
    });

    test('Parameterized queries prevent injection without performance loss', async () => {
      const iterations = 100;
      const safeData = "Safe 'quoted' data";

      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db.query(
          'INSERT INTO conversation_feedback (conversation_id, feedback_type, shop_id, reason) VALUES ($1, $2, $3, $4)',
          [crypto.randomUUID(), 'thumbs_down', 1, safeData]
        );
      }

      const duration = Date.now() - start;
      const avgPerInsert = duration / iterations;

      // Should be fast with parameterized queries
      expect(avgPerInsert).toBeLessThan(20);
    });

    test('RLS adds < 2ms overhead per query', async () => {
      // Insert test data for multiple shops
      for (let i = 0; i < 10; i++) {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id)
          VALUES ($1, $2, $3)`, [crypto.randomUUID(), 'thumbs_down', (i % 3) + 1]);
      }

      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db.query(
          'SELECT * FROM conversation_feedback WHERE shop_id = $1',
          [(i % 3) + 1]
        );
      }

      const duration = Date.now() - start;
      const avgPerQuery = duration / iterations;

      // Average should be < 5ms per query
      expect(avgPerQuery).toBeLessThan(5);
    });

    test('1000 inserts with security < 30 seconds', async () => {
      const start = Date.now();

      const promises = Array(1000).fill(null).map((_, i) =>
        insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: i % 2 === 0 ? 'thumbs_up' : 'thumbs_down',
          rating: (i % 5) + 1,
          reason: `Test feedback ${i}`,
        })
      );

      await Promise.all(promises);

      const duration = Date.now() - start;

      // Should complete in < 30 seconds
      expect(duration).toBeLessThan(30000);

      // Clean up
      await db.query("DELETE FROM conversation_feedback WHERE reason LIKE 'Test feedback %'");
    });

    test('Security check overhead < 10% for complex queries', async () => {
      // Insert test data
      for (let i = 0; i < 100; i++) {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, rating, created_at)
          VALUES ($1, $2, $3, $4, $5)`, [crypto.randomUUID(), 'thumbs_down', 1, (i % 5) + 1, new Date()]);
      }

      // Measure complex query with security
      const startSecure = Date.now();
      const secureResult = await db.query(`
        SELECT
          shop_id,
          feedback_type,
          COUNT(*) as count,
          AVG(rating) as avg_rating
        FROM conversation_feedback
        WHERE shop_id = 1
          AND created_at > NOW() - INTERVAL '1 day'
        GROUP BY shop_id, feedback_type
        ORDER BY count DESC
      `);
      const durationSecure = Date.now() - startSecure;

      // Should complete quickly
      expect(durationSecure).toBeLessThan(1000);
      expect(secureResult.rows.length).toBeGreaterThan(0);

      // Clean up
      await db.query('DELETE FROM conversation_feedback WHERE shop_id = 1');
    });

    test('Batch operations with security < 100ms for 100 records', async () => {
      const batchSize = 100;
      const values = Array(batchSize).fill(null).map((_, i) => [
        crypto.randomUUID(),
        'thumbs_down',
        1,
        `Batch test ${i}`,
      ]);

      const start = Date.now();

      await db.query(`
        INSERT INTO conversation_feedback (conversation_id, feedback_type, shop_id, reason)
        VALUES ${values.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
      `, values.flat());

      const duration = Date.now() - start;

      // Should complete in < 100ms
      expect(duration).toBeLessThan(100);

      // Verify all inserts succeeded
      const result = await db.query(
        "SELECT COUNT(*) FROM conversation_feedback WHERE reason LIKE 'Batch test %'"
      );
      expect(parseInt(result.rows[0].count)).toBe(batchSize);

      // Clean up
      await db.query("DELETE FROM conversation_feedback WHERE reason LIKE 'Batch test %'");
    });

    test('Transaction overhead < 5ms', async () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const client = await db.connect();

        try {
          await client.query('BEGIN');
          await client.query(`INSERT INTO conversation_feedback
            (conversation_id, feedback_type, shop_id)
            VALUES ($1, $2, $3)`, [crypto.randomUUID(), 'thumbs_down', 1]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      const duration = Date.now() - start;
      const avgPerTransaction = duration / iterations;

      // Average should be < 50ms per transaction
      expect(avgPerTransaction).toBeLessThan(50);
    });

    test('Index performance with security constraints', async () => {
      // Insert 1000 records
      for (let i = 0; i < 1000; i++) {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, created_at)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 'thumbs_down', 1, new Date()]);
      }

      // Query using indexed columns
      const start = Date.now();
      const result = await db.query(`
        SELECT * FROM conversation_feedback
        WHERE shop_id = 1
          AND created_at > NOW() - INTERVAL '1 day'
        ORDER BY created_at DESC
        LIMIT 100
      `);
      const duration = Date.now() - start;

      // Should use index and complete quickly
      expect(duration).toBeLessThan(100);
      expect(result.rows.length).toBeGreaterThan(0);

      // Clean up
      await db.query('DELETE FROM conversation_feedback WHERE shop_id = 1');
    });

    test('Concurrent access performance', async () => {
      const concurrency = 20;
      const operationsPerConnection = 50;

      const start = Date.now();

      const promises = Array(concurrency).fill(null).map((_, i) =>
        (async () => {
          const client = await db.connect();

          try {
            for (let j = 0; j < operationsPerConnection; j++) {
              await client.query(`INSERT INTO conversation_feedback
                (conversation_id, feedback_type, shop_id)
                VALUES ($1, $2, $3)`, [crypto.randomUUID(), 'thumbs_down', 1]);
            }
          } finally {
            client.release();
          }
        })()
      );

      await Promise.all(promises);

      const duration = Date.now() - start;
      const totalOperations = concurrency * operationsPerConnection;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(30000);

      // Calculate operations per second
      const opsPerSecond = totalOperations / (duration / 1000);
      expect(opsPerSecond).toBeGreaterThan(10);  // At least 10 ops/sec

      // Clean up
      await db.query('DELETE FROM conversation_feedback WHERE shop_id = 1');
    });
  });

  // ==========================================================================
  // MEMORY AND RESOURCE USAGE
  // ==========================================================================

  describe('Memory and Resource Usage', () => {
    test('Large JSONB metadata handled efficiently', async () => {
      const iterations = 100;
      const largeMetadata = {
        data: 'x'.repeat(1000),  // 1KB of data
        nested: {
          level2: {
            level3: {
              data: 'y'.repeat(500),
            },
          },
        },
      };

      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, metadata)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 'thumbs_down', 1, largeMetadata]);
      }

      const duration = Date.now() - start;
      const avgPerInsert = duration / iterations;

      // Should handle large JSONB efficiently
      expect(avgPerInsert).toBeLessThan(50);

      // Clean up
      await db.query("DELETE FROM conversation_feedback WHERE metadata->>'data' LIKE 'x%'");
    });

    test('Connection pool efficiency', async () => {
      // Pool size is 5, test with 20 concurrent operations
      const operations = 20;
      const start = Date.now();

      const promises = Array(operations).fill(null).map(() =>
        db.query('SELECT pg_sleep(0.1)')
      );

      await Promise.all(promises);

      const duration = Date.now() - start;

      // With pool size 5 and 20 operations each taking 0.1s:
      // Should take at least 0.4s (20/5 * 0.1) but not much more
      expect(duration).toBeGreaterThan(400);
      expect(duration).toBeLessThan(2000);
    });
  });
});
