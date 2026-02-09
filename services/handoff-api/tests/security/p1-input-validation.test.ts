/**
 * P1 Input Validation Tests
 *
 * Tests for input validation implementation
 * Verifies that all inputs are properly validated for length, format, and range
 *
 * Total Tests: 30
 * - Length Validation Tests: 10
 * - Format Validation Tests: 10
 * - Range Validation Tests: 10
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getSecurityTestPool, setupSecurityTests, cleanupSecurityTests, setupBeforeEachSecurityTest, insertTestFeedback, insertLearningQueue } from './setup';

describe('P1 Input Validation Tests', () => {
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
  // A. LENGTH VALIDATION TESTS (10 tests)
  // ==========================================================================

  describe('Input Length Validation', () => {
    test('conversation_feedback.reason max 2000 chars enforced', async () => {
      const longText = 'a'.repeat(2001);

      await expect(async () => {
        await insertTestFeedback({
          conversation_id: 'sec_test_len_1',
          feedback_type: 'thumbs_down',
          reason: longText,
        });
      }).rejects.toThrow(/value too long|exceeds maximum length|string data right truncation/i);
    });

    test('conversation_feedback.reason allows 2000 chars', async () => {
      const db = getSecurityTestPool();
      const longText = 'a'.repeat(2000);

      await expect(
        insertTestFeedback({
          conversation_id: 'sec_test_len_2',
          feedback_type: 'thumbs_down',
          reason: longText,
        })
      ).resolves.not.toThrow();

      // Verify it was inserted
      const result = await db.query(
        'SELECT reason FROM conversation_feedback WHERE conversation_id = $1',
        ['sec_test_len_2']
      );
      expect(result.rows[0].reason.length).toBe(2000);
    });

    test('Empty reason rejected or trimmed', async () => {
      await expect(async () => {
        await insertTestFeedback({
          conversation_id: 'sec_test_len_3',
          feedback_type: 'thumbs_down',
          reason: '   ',  // Only whitespace
        });
      }).rejects.toThrow(/cannot be empty|required|null constraint/i);
    });

    test('conversation_id max length enforced', async () => {
      const longId = 'a'.repeat(256);  // Assuming VARCHAR(255)

      await expect(async () => {
        await insertTestFeedback({
          conversation_id: longId,
          feedback_type: 'thumbs_down',
        });
      }).rejects.toThrow(/value too long|exceeds maximum length|string data right truncation/i);
    });

    test('feedback_type max length enforced', async () => {
      const longType = 'a'.repeat(256);

      await expect(async () => {
        await insertTestFeedback({
          conversation_id: 'sec_test_len_4',
          feedback_type: longType,
        });
      }).rejects.toThrow(/value too long|exceeds maximum length|string data right truncation/i);
    });

    test('learning_queue.proposed_content max length enforced', async () => {
      const db = getSecurityTestPool();
      const longContent = 'a'.repeat(10001);  // Assuming TEXT has practical limits

      await expect(async () => {
        await db.query(`INSERT INTO learning_queue
          (shop_id, source_type, source_id, proposed_content, confidence_score)
          VALUES ($1, $2, $3, $4, $5)`, [1, 'test', 'sec_test_len_5', longContent, 85]);
      }).rejects.toThrow();  // Either succeeds (TEXT is unlimited) or fails with practical limit
    });

    test('learning_queue.category max length enforced', async () => {
      const db = getSecurityTestPool();
      const longCategory = 'a'.repeat(256);

      await expect(async () => {
        await db.query(`INSERT INTO learning_queue
          (shop_id, source_type, source_id, proposed_content, confidence_score, category)
          VALUES ($1, $2, $3, $4, $5, $6)`, [1, 'test', 'sec_test_len_6', 'test', 85, longCategory]);
      }).rejects.toThrow(/value too long|exceeds maximum length|string data right truncation/i);
    });

    test('metadata JSONB size limit enforced', async () => {
      const db = getSecurityTestPool();
      const hugeMetadata = { data: 'x'.repeat(1000000) };  // 1MB of JSON

      await expect(async () => {
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, metadata)
          VALUES ($1, $2, $3, $4)`, ['sec_test_len_7', 'thumbs_down', 1, hugeMetadata]);
      }).rejects.toThrow();  // Should fail due to JSONB size limit
    });

    test('Empty strings handled correctly', async () => {
      await expect(
        insertTestFeedback({
          conversation_id: 'sec_test_len_8',
          feedback_type: 'thumbs_down',
          reason: '',
        })
      ).resolves.not.toThrow();  // Empty string should be allowed (NULL vs empty string)
    });

    test('Unicode characters counted correctly', async () => {
      const unicodeText = '😀'.repeat(500);  // 500 emojis (500 chars, not 1500 bytes)

      await expect(
        insertTestFeedback({
          conversation_id: 'sec_test_len_9',
          feedback_type: 'thumbs_down',
          reason: unicodeText,
        })
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // B. FORMAT VALIDATION TESTS (10 tests)
  // ==========================================================================

  describe('Format Validation', () => {
    test('Invalid UUID format rejected', async () => {
      await expect(async () => {
        await insertTestFeedback({
          conversation_id: 'not-a-uuid',
          feedback_type: 'thumbs_down',
        });
      }).rejects.toThrow(/invalid uuid|invalid input syntax for type uuid/i);
    });

    test('Valid UUID accepted', async () => {
      const validUuid = crypto.randomUUID();

      await expect(
        insertTestFeedback({
          conversation_id: validUuid,
          feedback_type: 'thumbs_down',
        })
      ).resolves.not.toThrow();
    });

    test('Invalid feedback_type rejected', async () => {
      await expect(async () => {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'invalid_type',
        });
      }).rejects.toThrow(/check constraint|invalid feedback_type/i);
    });

    test('Valid feedback_type accepted', async () => {
      const validTypes = ['thumbs_up', 'thumbs_down', 'star_rating'];

      for (const type of validTypes) {
        await expect(
          insertTestFeedback({
            conversation_id: crypto.randomUUID(),
            feedback_type: type,
          })
        ).resolves.not.toThrow();
      }
    });

    test('Invalid status rejected', async () => {
      const db = getSecurityTestPool();

      await expect(async () => {
        await db.query(`INSERT INTO learning_queue
          (shop_id, source_type, source_id, proposed_content, confidence_score, status)
          VALUES ($1, $2, $3, $4, $5, $6)`, [1, 'test', 'sec_test_fmt_1', 'test', 85, 'invalid_status']);
      }).rejects.toThrow(/check constraint|invalid status/i);
    });

    test('Valid status accepted', async () => {
      const db = getSecurityTestPool();
      const validStatuses = ['pending', 'approved', 'rejected', 'applied'];

      for (const status of validStatuses) {
        await expect(
          db.query(`INSERT INTO learning_queue
            (shop_id, source_type, source_id, proposed_content, confidence_score, status)
            VALUES ($1, $2, $3, $4, $5, $6)`, [1, 'test', `sec_test_fmt_${status}`, 'test', 85, status])
        ).resolves.not.toThrow();
      }
    });

    test('Invalid priority rejected', async () => {
      const db = getSecurityTestPool();

      await expect(async () => {
        await db.query(`INSERT INTO learning_queue
          (shop_id, source_type, source_id, proposed_content, confidence_score, priority)
          VALUES ($1, $2, $3, $4, $5, $6)`, [1, 'test', 'sec_test_fmt_2', 'test', 85, 'invalid_priority']);
      }).rejects.toThrow(/check constraint|invalid priority/i);
    });

    test('Valid priority accepted', async () => {
      const db = getSecurityTestPool();
      const validPriorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of validPriorities) {
        await expect(
          db.query(`INSERT INTO learning_queue
            (shop_id, source_type, source_id, proposed_content, confidence_score, priority)
            VALUES ($1, $2, $3, $4, $5, $6)`, [1, 'test', `sec_test_fmt_${priority}`, 'test', 85, priority])
        ).resolves.not.toThrow();
      }
    });

    test('Invalid JSONB in metadata rejected', async () => {
      await expect(async () => {
        const db = getSecurityTestPool();
        await db.query(`INSERT INTO conversation_feedback
          (conversation_id, feedback_type, shop_id, metadata)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 'thumbs_down', 1, 'invalid json']);
      }).rejects.toThrow(/invalid input syntax for type jsonb/i);
    });

    test('Valid JSONB in metadata accepted', async () => {
      await expect(
        insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'thumbs_down',
          metadata: { test: 'value', nested: { data: 123 } },
        })
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // C. RANGE VALIDATION TESTS (10 tests)
  // ==========================================================================

  describe('Range Validation', () => {
    test('Rating must be 1-5', async () => {
      await expect(async () => {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'star_rating',
          rating: 0,
        });
      }).rejects.toThrow(/rating must be between|check constraint/i);

      await expect(async () => {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'star_rating',
          rating: 6,
        });
      }).rejects.toThrow(/rating must be between|check constraint/i);
    });

    test('Valid rating accepted', async () => {
      const validRatings = [1, 2, 3, 4, 5];

      for (const rating of validRatings) {
        await expect(
          insertTestFeedback({
            conversation_id: crypto.randomUUID(),
            feedback_type: 'star_rating',
            rating: rating,
          })
        ).resolves.not.toThrow();
      }
    });

    test('Confidence score 0-100', async () => {
      const db = getSecurityTestPool();

      await expect(async () => {
        await db.query(`INSERT INTO learning_queue
          (shop_id, source_type, source_id, proposed_content, confidence_score)
          VALUES ($1, $2, $3, $4, $5)`, [1, 'test', 'sec_test_range_1', 'test', -1]);
      }).rejects.toThrow(/confidence score must be between|check constraint/i);

      await expect(async () => {
        await db.query(`INSERT INTO learning_queue
          (shop_id, source_type, source_id, proposed_content, confidence_score)
          VALUES ($1, $2, $3, $4, $5)`, [1, 'test', 'sec_test_range_2', 'test', 101]);
      }).rejects.toThrow(/confidence score must be between|check constraint/i);
    });

    test('Valid confidence score accepted', async () => {
      const db = getSecurityTestPool();
      const validScores = [0, 50, 100, 99, 1];

      for (const score of validScores) {
        await expect(
          db.query(`INSERT INTO learning_queue
            (shop_id, source_type, source_id, proposed_content, confidence_score)
            VALUES ($1, $2, $3, $4, $5)`, [1, 'test', `sec_test_range_${score}`, 'test', score])
        ).resolves.not.toThrow();
      }
    });

    test('Shop ID must be positive', async () => {
      await expect(async () => {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'thumbs_down',
          shop_id: 0,
        });
      }).rejects.toThrow(/shop_id must be positive|check constraint/i);

      await expect(async () => {
        await insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'thumbs_down',
          shop_id: -1,
        });
      }).rejects.toThrow(/shop_id must be positive|check constraint/i);
    });

    test('Valid shop ID accepted', async () => {
      await expect(
        insertTestFeedback({
          conversation_id: crypto.randomUUID(),
          feedback_type: 'thumbs_down',
          shop_id: 1,
        })
      ).resolves.not.toThrow();
    });

    test('Audio duration must be positive', async () => {
      const db = getSecurityTestPool();

      await expect(async () => {
        await db.query(`INSERT INTO voice_corrections
          (conversation_id, shop_id, transcript, audio_duration)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 1, 'test', -1]);
      }).rejects.toThrow(/audio_duration must be positive|check constraint/i);
    });

    test('Valid audio duration accepted', async () => {
      const db = getSecurityTestPool();

      await expect(
        db.query(`INSERT INTO voice_corrections
          (conversation_id, shop_id, transcript, audio_duration)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 1, 'test', 150])
      ).resolves.not.toThrow();
    });

    test('Confidence in voice_corrections must be 0-1', async () => {
      const db = getSecurityTestPool();

      await expect(async () => {
        await db.query(`INSERT INTO voice_corrections
          (conversation_id, shop_id, transcript, confidence)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 1, 'test', 1.5]);
      }).rejects.toThrow(/confidence must be between|check constraint/i);

      await expect(async () => {
        await db.query(`INSERT INTO voice_corrections
          (conversation_id, shop_id, transcript, confidence)
          VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 1, 'test', -0.1]);
      }).rejects.toThrow(/confidence must be between|check constraint/i);
    });

    test('Valid confidence in voice_corrections accepted', async () => {
      const db = getSecurityTestPool();
      const validConfidences = [0, 0.5, 1, 0.99, 0.01];

      for (const conf of validConfidences) {
        await expect(
          db.query(`INSERT INTO voice_corrections
            (conversation_id, shop_id, transcript, confidence)
            VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), 1, 'test', conf])
        ).resolves.not.toThrow();
      }
    });
  });
});
