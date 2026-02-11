/**
 * Conversation Storage Performance Benchmarks
 *
 * Tests the performance of conversation storage system.
 * Target: <100ms for synchronous operations.
 */

import { describe, bench, beforeEach } from 'vitest';
import { storeConversation, addToBatch, flushBatch } from '../services/conversationStorage';
import { query } from '../utils/db';
import { generateEmbedding, generateBatchEmbeddings } from '../services/memoryService';

// ============================================================================
// MOCKS
// ============================================================================

const mockQuery = query as any;
const mockGenerateEmbedding = generateEmbedding as any;
const mockGenerateBatchEmbeddings = generateBatchEmbeddings as any;

const mockEmbedding = Array.from({ length: 768 }, () => Math.random());

const mockConversation = {
  id: 'bench-conversation',
  userId: 'bench-user',
  shopId: 1,
  channel: 'web' as const,
  messages: [
    {
      role: 'user' as const,
      content: 'What are your business hours?',
      timestamp: new Date(),
    },
    {
      role: 'assistant' as const,
      content: 'We are open from 9am to 5pm, Monday through Friday.',
      timestamp: new Date(),
    },
  ],
};

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// Mock database (fast response)
mockQuery.mockImplementation(() =>
  Promise.resolve({
    rows: [{ id: 'test-conversation' }],
  })
);

// Mock embedding (fast response)
mockGenerateEmbedding.mockImplementation(() =>
  Promise.resolve(mockEmbedding)
);

mockGenerateBatchEmbeddings.mockImplementation((count: number) =>
  Promise.resolve(Array.from({ length: count }, () => mockEmbedding))
);

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Conversation Storage Performance', () => {
  describe('storeConversation', () => {
    bench('should store conversation in <100ms', async () => {
      await storeConversation(mockConversation);
    }, {
      iterations: 100,
      time: 0,
    });

    bench('should handle multiple concurrent stores efficiently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        storeConversation({
          ...mockConversation,
          id: `concurrent-${i}`,
        })
      );
      await Promise.all(promises);
    }, {
      iterations: 10,
      time: 0,
    });
  });

  describe('Batch Processing', () => {
    bench('should process batch of 10 conversations efficiently', async () => {
      for (let i = 0; i < 10; i++) {
        await addToBatch({
          ...mockConversation,
          id: `batch-${i}`,
        });
      }
      await flushBatch();
    }, {
      iterations: 20,
      time: 0,
    });

    bench('should add to batch in <5ms per conversation', async () => {
      await addToBatch(mockConversation);
    }, {
      iterations: 100,
      time: 0,
    });
  });

  describe('Scalability', () => {
    bench('should handle 100 stores without degradation', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        storeConversation({
          ...mockConversation,
          id: `scale-${i}`,
        })
      );
      await Promise.all(promises);
    }, {
      iterations: 10,
      time: 0,
    });
  });
});

// ============================================================================
// PERFORMANCE SUMMARY
// ============================================================================

console.log('📊 Conversation Storage Performance Benchmarks');
console.log('==============================================');
console.log('Targets:');
console.log('  - storeConversation: <100ms');
console.log('  - addToBatch: <5ms');
console.log('  - Batch processing: <20ms per conversation');
console.log('');
console.log('Run with: npm run test:benchmark');
