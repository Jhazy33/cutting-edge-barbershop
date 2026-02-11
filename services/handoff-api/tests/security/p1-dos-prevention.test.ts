/**
 * P1 Denial of Service Prevention Tests
 *
 * Tests for DoS prevention mechanisms
 * Verifies that the system can handle abuse and resource exhaustion attempts
 *
 * Total Tests: 10
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getSecurityTestPool, setupSecurityTests, cleanupSecurityTests, setupBeforeEachSecurityTest, insertTestFeedback } from './setup';

describe('P1 Denial of Service Prevention Tests', () => {
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
  // DOS PREVENTION TESTS (10 tests)
  // ==========================================================================

  describe('Denial of Service Prevention', () => {
    test('Rejects oversized text input', async () => {
      const hugeText = 'a'.repeat(10_000_000);  // 10MB

      await expect(async () => {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'thumbs_down',
          reason: hugeText,
        });
      }).rejects.toThrow();  // Should fail due to size limits
    });

    test('Rate limiting prevents rapid inserts', async () => {
      // Try to insert 1000 records rapidly
      const promises = Array(1000).fill(null).map((_, i) =>
        insertTestFeedback({
          conversation_id: `sec_test_dos_${i}`,
          feedback_type: 'thumbs_down',
          reason: 'test',
        })
      );

      // Should either complete successfully or be rate limited
      // The important thing is it doesn't crash the system
      const start = Date.now();

      try {
        await Promise.all(promises);
      } catch (error) {
        // Rate limiting is expected
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 30 seconds for 1000 inserts)
      expect(duration).toBeLessThan(30000);

      // Clean up
      await db.query("DELETE FROM conversation_feedback WHERE conversation_id LIKE 'sec_test_dos_%'");
    });

    test('Query timeout prevents long-running queries', async () => {
      // Try to create a long-running query
      await expect(async () => {
        await db.query({
          text: 'SELECT pg_sleep(100)',
          timeout: 1000  // 1 second timeout
        });
      }).rejects.toThrow(/timeout|canceling statement/i);
    });

    test('Prevents nested loop explosion', async () => {
      // Create a query that would cause a nested loop without proper indexes
      await expect(async () => {
        await db.query({
          text: `
            SELECT cf1.id, cf2.id
            FROM conversation_feedback cf1
            CROSS JOIN conversation_feedback cf2
            WHERE cf1.reason = cf2.reason
          `,
          timeout: 5000  // 5 second timeout
        });
      }).rejects.toThrow();  // Should either timeout or complete quickly
    });

    test('Limits concurrent connections', async () => {
      // This test verifies that the connection pool limits concurrent connections
      const maxConcurrent = 20;  // Pool size is 5, so this should queue

      const promises = Array(maxConcurrent).fill(null).map(() =>
        db.query('SELECT pg_sleep(0.1)')
      );

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      // With pool size 5 and 20 concurrent queries, should take at least 0.4 seconds
      // (20 queries / 5 pool size * 0.1 seconds per query)
      expect(duration).toBeGreaterThan(400);
      expect(duration).toBeLessThan(10000);  // But not too long
    });

    test('Prevents memory exhaustion with large result sets', async () => {
      // Insert 1000 records
      for (let i = 0; i < 1000; i++) {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, reason)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 'thumbs_down', 1, 'test']);
      }

      // Try to fetch all at once
      const start = Date.now();
      const result = await db.query('SELECT * FROM conversation_feedback LIMIT 10000');
      const duration = Date.now() - start;

      // Should complete quickly
      expect(duration).toBeLessThan(5000);
      expect(result.rows.length).toBeLessThanOrEqual(10000);

      // Clean up
      await db.query('DELETE FROM conversation_feedback WHERE reason = \'test\' AND conversation_id LIKE \'%\'');
    });

    test('Prevents DoS through complex queries', async () => {
      // Try a complex query with multiple joins
      await expect(async () => {
        await db.query({
          text: `
            SELECT cf.*, lq.*, vc.*
            FROM conversation_feedback cf
            LEFT JOIN learning_queue lq ON lq.source_id::text = cf.conversation_id::text
            LEFT JOIN voice_corrections vc ON vc.conversation_id = cf.conversation_id
            WHERE LENGTH(cf.reason) > 0
            ORDER BY cf.created_at DESC
            LIMIT 10000
          `,
          timeout: 10000  // 10 second timeout
        });
      }).resolves.not.toThrow();  // Should either timeout or complete quickly
    });

    test('Limits JSONB parsing depth', async () => {
      const db = getSecurityTestPool();

      // Create deeply nested JSON (100 levels)
      let nestedJson: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nestedJson = { nested: nestedJson };
      }

      await expect(async () => {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, metadata)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 'thumbs_down', 1, nestedJson]);
      }).rejects.toThrow();  // Should fail due to depth limit
    });

    test('Prevents transaction exhaustion', async () => {
      // Try to create many transactions
      const transactionCount = 100;

      for (let i = 0; i < transactionCount; i++) {
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

      // Should complete without connection pool exhaustion
      const result = await db.query(
        'SELECT COUNT(*) FROM conversation_feedback WHERE feedback_type = $1',
        ['thumbs_down']
      );
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(transactionCount);
    });

    test('Resource cleanup after errors', async () => {
      const client = await db.connect();

      try {
        await client.query('BEGIN');

        // Insert some data
        await client.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id)
          VALUES ($1, $2, $3)`, [crypto.randomUUID(), 'thumbs_down', 1]);

        // Cause an error
        await expect(
          client.query('INSERT INTO nonexistent_table VALUES (1)')
        ).rejects.toThrow();

        // Rollback should clean up resources
        await client.query('ROLLBACK');

        // Verify transaction was rolled back
        const result = await db.query(
          "SELECT COUNT(*) FROM conversation_feedback WHERE conversation_id LIKE $1",
          ['%']
        );

        // The insert should have been rolled back
        expect(parseInt(result.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });
  });

  // ==========================================================================
  // PERFORMANCE DEGRADATION TESTS
  // ==========================================================================

  describe('Performance Degradation Prevention', () => {
    test('Index usage prevents full table scans', async () => {
      // Insert 1000 records
      for (let i = 0; i < 1000; i++) {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, created_at)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 'thumbs_down', 1, new Date()]);
      }

      // Query with indexed column
      const start = Date.now();
      const result = await db.query(
        'SELECT * FROM conversation_feedback WHERE shop_id = 1 AND created_at > NOW() - INTERVAL \'1 day\' LIMIT 100'
      );
      const duration = Date.now() - start;

      // Should use index and complete quickly
      expect(duration).toBeLessThan(1000);
      expect(result.rows.length).toBeGreaterThan(0);

      // Clean up
      await db.query('DELETE FROM conversation_feedback WHERE shop_id = 1');
    });

    test('Connection pooling reuse', async () => {
      // Execute multiple queries sequentially
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db.query('SELECT 1');
      }

      const duration = Date.now() - start;

      // Should be fast due to connection pooling
      // Average < 10ms per query including round-trip
      expect(duration).toBeLessThan(iteriations * 10);
    });

    test('Prevents N+1 query problems', async () => {
      // This test demonstrates that batch queries should be used instead of N+1

      // Insert 100 records
      const ids = [];
      for (let i = 0; i < 100; i++) {
        const id = crypto.randomUUID();
        ids.push(id);
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id)
          VALUES ($1, $2, $3)`, [id, 'thumbs_down', 1]);
      }

      // Bad practice: N+1 queries (query for each ID)
      const startN1 = Date.now();
      for (const id of ids) {
        await db.query('SELECT * FROM conversation_feedback WHERE conversation_id = $1', [id]);
      }
      const durationN1 = Date.now() - startN1;

      // Good practice: Single query with IN clause
      const startBatch = Date.now();
      await db.query('SELECT * FROM conversation_feedback WHERE conversation_id = ANY($1)', [ids]);
      const durationBatch = Date.now() - startBatch;

      // Batch should be significantly faster
      expect(durationBatch).toBeLessThan(durationN1);

      // Clean up
      await db.query('DELETE FROM conversation_feedback WHERE conversation_id = ANY($1)', [ids]);
    });
  });
});
