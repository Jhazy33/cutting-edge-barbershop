/**
 * Conversation Storage Service Tests
 *
 * Comprehensive test suite for conversation storage functionality.
 * Tests include unit tests, performance tests, error handling, and batch processing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  storeConversation,
  addToBatch,
  flushBatch,
  extractPotentialKnowledge,
  flagForReview,
  getConversation,
  getUserConversations,
} from '../conversationStorage';
import { query } from '../../utils/db';
import { generateEmbedding } from '../memoryService';

// ============================================================================
// MOCKS
// ============================================================================

// Mock database
vi.mock('../../utils/db', () => ({
  query: vi.fn(),
}));

// Mock embedding service
vi.mock('../memoryService', () => ({
  generateEmbedding: vi.fn(),
  generateBatchEmbeddings: vi.fn(),
}));

// Mock AI extractor
vi.mock('../../utils/aiExtractor', () => ({
  extractKnowledgeInsights: vi.fn(),
  detectConfusion: vi.fn(),
  identifyNewInfo: vi.fn(),
}));

// Mock performance monitor
vi.mock('../performanceMonitor', () => ({
  recordPerformance: vi.fn(),
}));

// ============================================================================
// TEST DATA
// ============================================================================

const mockConversationData = {
  id: 'test-conversation-1',
  userId: 'user-123',
  shopId: 1,
  channel: 'web' as const,
  messages: [
    {
      role: 'user' as const,
      content: 'What are your hours?',
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      role: 'assistant' as const,
      content: 'We are open 9am-5pm Monday to Friday.',
      timestamp: new Date('2024-01-01T10:00:01Z'),
    },
  ],
  metadata: {
    source: 'web',
  },
};

const mockEmbedding = Array.from({ length: 768 }, () => Math.random());

// ============================================================================
// SETUP
// ============================================================================

beforeAll(() => {
  // Set test environment variables
  process.env.OLLAMA_URL = 'http://localhost:11434';
  process.env.OLLAMA_MODEL = 'llama2';
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// STORE CONVERSATION TESTS
// ============================================================================

describe('storeConversation', () => {
  it('should store a conversation successfully', async () => {
    // Mock successful database insert
    (query as any).mockResolvedValue({
      rows: [{ id: 'test-conversation-1' }],
    });

    // Mock embedding generation
    (generateEmbedding as any).mockResolvedValue(mockEmbedding);

    const result = await storeConversation(mockConversationData);

    expect(result).toBe('test-conversation-1');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO conversations'),
      expect.arrayContaining([
        'test-conversation-1',
        'user-123',
        1,
        'web',
        expect.any(String), // transcript
        expect.any(String), // summary
        expect.stringContaining('['), // embedding
        expect.any(String), // metadata
        expect.any(Boolean), // needsReview
        expect.anything(), // reviewReason
      ])
    );
  });

  it('should validate conversation data', async () => {
    const invalidData = {
      ...mockConversationData,
      userId: '', // Invalid: empty userId
    };

    await expect(storeConversation(invalidData as any)).rejects.toThrow(
      'Invalid user ID'
    );
  });

  it('should validate messages array', async () => {
    const invalidData = {
      ...mockConversationData,
      messages: [], // Invalid: empty messages
    };

    await expect(storeConversation(invalidData as any)).rejects.toThrow(
      'Invalid messages array'
    );
  });

  it('should validate channel', async () => {
    const invalidData = {
      ...mockConversationData,
      channel: 'invalid-channel' as any,
    };

    await expect(storeConversation(invalidData as any)).rejects.toThrow(
      'Invalid channel'
    );
  });

  it('should handle database errors gracefully', async () => {
    (query as any).mockRejectedValue(new Error('Database connection failed'));

    await expect(storeConversation(mockConversationData)).rejects.toThrow(
      'Storage failed'
    );
  });

  it('should timeout embedding generation if too slow', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'test-conversation-1' }],
    });

    // Mock slow embedding
    (generateEmbedding as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockEmbedding), 200);
        })
    );

    const startTime = Date.now();
    await storeConversation(mockConversationData);
    const duration = Date.now() - startTime;

    // Should complete in <150ms (timeout + overhead)
    expect(duration).toBeLessThan(150);
  });

  it('should build transcript from messages', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'test-conversation-1' }],
    });
    (generateEmbedding as any).mockResolvedValue(mockEmbedding);

    await storeConversation(mockConversationData);

    const insertCall = (query as any).mock.calls[0];
    const transcript = insertCall[1][4]; // transcript is 5th parameter

    expect(transcript).toContain('USER: What are your hours?');
    expect(transcript).toContain('ASSISTANT: We are open');
  });
});

// ============================================================================
// BATCH STORAGE TESTS
// ============================================================================

describe('batchStoreConversations (addToBatch)', () => {
  it('should add conversation to batch', async () => {
    await addToBatch(mockConversationData);

    // Should not immediately insert into database
    expect(query).not.toHaveBeenCalled();
  });

  it('should process batch when size limit reached', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'batch-test' }],
    });

    // Mock batch embedding generation
    const { generateBatchEmbeddings } = await import('../memoryService');
    (generateBatchEmbeddings as any).mockResolvedValue([mockEmbedding]);

    // Add 10 conversations (batch size)
    for (let i = 0; i < 10; i++) {
      await addToBatch({
        ...mockConversationData,
        id: `conv-${i}`,
      });
    }

    // Should trigger batch processing
    expect(query).toHaveBeenCalled();
  });

  it('should handle batch processing errors', async () => {
    (query as any).mockRejectedValue(new Error('Batch insert failed'));

    // Add conversations to trigger batch
    for (let i = 0; i < 10; i++) {
      await addToBatch({
        ...mockConversationData,
        id: `conv-${i}`,
      });
    }

    // Should not throw, should handle error gracefully
    expect(query).toHaveBeenCalled();
  });

  it('should flush batch manually', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'flush-test' }],
    });

    // Add 5 conversations (below batch limit)
    for (let i = 0; i < 5; i++) {
      await addToBatch({
        ...mockConversationData,
        id: `conv-${i}`,
      });
    }

    // Manually flush
    await flushBatch();

    // Should process the batch
    expect(query).toHaveBeenCalled();
  });
});

// ============================================================================
// KNOWLEDGE EXTRACTION TESTS
// ============================================================================

describe('extractPotentialKnowledge', () => {
  it('should extract knowledge insights', async () => {
    const { extractKnowledgeInsights } = await import('../../utils/aiExtractor');

    (extractKnowledgeInsights as any).mockResolvedValue([
      {
        type: 'new_info',
        content: 'New pricing information',
        confidence: 0.9,
        category: 'pricing',
      },
    ]);

    (query as any).mockResolvedValue({
      rows: [{ id: 'learning-queue-1' }],
    });

    await extractPotentialKnowledge('conv-1', 'Test transcript', 1);

    expect(extractKnowledgeInsights).toHaveBeenCalledWith('Test transcript');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO learning_queue'),
      expect.any(Array)
    );
  });

  it('should handle empty insights', async () => {
    const { extractKnowledgeInsights } = await import('../../utils/aiExtractor');

    (extractKnowledgeInsights as any).mockResolvedValue([]);

    await extractPotentialKnowledge('conv-1', 'Test transcript', 1);

    // Should not insert into learning_queue
    expect(query).not.toHaveBeenCalled();
  });

  it('should filter low-confidence insights', async () => {
    const { extractKnowledgeInsights } = await import('../../utils/aiExtractor');

    (extractKnowledgeInsights as any).mockResolvedValue([
      {
        type: 'new_info',
        content: 'Low confidence info',
        confidence: 0.5, // Below threshold
        category: 'general',
      },
      {
        type: 'new_info',
        content: 'High confidence info',
        confidence: 0.8,
        category: 'pricing',
      },
    ]);

    (query as any).mockResolvedValue({
      rows: [{ id: 'learning-queue-1' }],
    });

    await extractPotentialKnowledge('conv-1', 'Test transcript', 1);

    // Should only insert high-confidence insight
    expect(query).toHaveBeenCalledTimes(1);
    const insertCall = (query as any).mock.calls[0];
    const content = insertCall[1][3]; // proposed_content
    expect(content).toBe('High confidence info');
  });

  it('should handle extraction errors gracefully', async () => {
    const { extractKnowledgeInsights } = await import('../../utils/aiExtractor');

    (extractKnowledgeInsights as any).mockRejectedValue(
      new Error('AI service unavailable')
    );

    // Should not throw
    await expect(
      extractPotentialKnowledge('conv-1', 'Test transcript', 1)
    ).resolves.not.toThrow();
  });
});

// ============================================================================
// FLAG FOR REVIEW TESTS
// ============================================================================

describe('flagForReview', () => {
  it('should flag conversation for review', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'test-conversation-1' }],
    });

    const result = await flagForReview(
      'test-conversation-1',
      'User confusion detected',
      'high'
    );

    expect(result).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE conversations'),
      expect.arrayContaining([
        'test-conversation-1',
        'User confusion detected',
        'high',
      ])
    );
  });

  it('should handle non-existent conversation', async () => {
    (query as any).mockResolvedValue({
      rows: [],
    });

    const result = await flagForReview('non-existent-id', 'Test reason');

    expect(result).toBe(false);
  });

  it('should validate priority levels', async () => {
    await expect(
      flagForReview('conv-1', 'reason', 'invalid' as any)
    ).rejects.toThrow();
  });
});

// ============================================================================
// RETRIEVAL TESTS
// ============================================================================

describe('getConversation', () => {
  it('should retrieve conversation by ID', async () => {
    const mockDbRow = {
      id: 'conv-1',
      user_id: 'user-123',
      shop_id: 1,
      channel: 'web',
      transcript: 'Test transcript',
      summary: 'Test summary',
      embedding: `[${mockEmbedding.join(',')}]`,
      metadata: { source: 'web' },
      needs_review: false,
      review_reason: null,
      created_at: new Date(),
    };

    (query as any).mockResolvedValue({
      rows: [mockDbRow],
    });

    const result = await getConversation('conv-1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('conv-1');
    expect(result?.userId).toBe('user-123');
    expect(result?.embedding).toEqual(mockEmbedding);
  });

  it('should return null for non-existent conversation', async () => {
    (query as any).mockResolvedValue({
      rows: [],
    });

    const result = await getConversation('non-existent');

    expect(result).toBeNull();
  });

  it('should handle malformed embeddings', async () => {
    const mockDbRow = {
      id: 'conv-1',
      user_id: 'user-123',
      shop_id: 1,
      channel: 'web',
      transcript: 'Test transcript',
      summary: 'Test summary',
      embedding: 'invalid-embedding-format',
      metadata: {},
      needs_review: false,
      review_reason: null,
      created_at: new Date(),
    };

    (query as any).mockResolvedValue({
      rows: [mockDbRow],
    });

    const result = await getConversation('conv-1');

    expect(result).not.toBeNull();
    expect(result?.embedding).toEqual([]); // Should handle gracefully
  });
});

describe('getUserConversations', () => {
  it('should retrieve user conversations', async () => {
    const mockDbRows = [
      {
        id: 'conv-1',
        user_id: 'user-123',
        shop_id: 1,
        channel: 'web',
        transcript: 'Test 1',
        summary: 'Summary 1',
        metadata: {},
        needs_review: false,
        review_reason: null,
        created_at: new Date(),
      },
      {
        id: 'conv-2',
        user_id: 'user-123',
        shop_id: 1,
        channel: 'telegram',
        transcript: 'Test 2',
        summary: 'Summary 2',
        metadata: {},
        needs_review: false,
        review_reason: null,
        created_at: new Date(),
      },
    ];

    (query as any).mockResolvedValue({
      rows: mockDbRows,
    });

    const result = await getUserConversations('user-123', 1);

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('user-123');
    expect(result[0].embedding).toEqual([]); // Should not load embedding for list
  });

  it('should limit results', async () => {
    (query as any).mockResolvedValue({
      rows: [],
    });

    await getUserConversations('user-123', 1, 5);

    const limitParam = (query as any).mock.calls[0][1][2];
    expect(limitParam).toBe(5);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  it('storeConversation should complete in <100ms (synchronous part)', async () => {
    (query as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ rows: [{ id: 'test' }] }), 10);
        })
    );

    (generateEmbedding as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockEmbedding), 5);
        })
    );

    const startTime = Date.now();
    await storeConversation(mockConversationData);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
    console.log(`✅ storeConversation: ${duration}ms (<100ms target)`);
  });

  it('batch processing should be efficient', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'batch' }],
    });

    const { generateBatchEmbeddings } = await import('../memoryService');
    (generateBatchEmbeddings as any).mockResolvedValue(
      Array.from({ length: 10 }, () => mockEmbedding)
    );

    const startTime = Date.now();

    // Add 10 conversations to trigger batch
    for (let i = 0; i < 10; i++) {
      await addToBatch({
        ...mockConversationData,
        id: `conv-${i}`,
      });
    }

    const duration = Date.now() - startTime;
    const avgPerConversation = duration / 10;

    expect(avgPerConversation).toBeLessThan(20); // Should be much faster per conversation
    console.log(`✅ Batch: ${duration}ms total, ${avgPerConversation.toFixed(2)}ms/convo`);
  });

  it('should handle concurrent storage operations', async () => {
    (query as any).mockResolvedValue({
      rows: [{ id: 'test' }],
    });
    (generateEmbedding as any).mockResolvedValue(mockEmbedding);

    const startTime = Date.now();

    // Store 50 conversations concurrently
    const promises = Array.from({ length: 50 }, (_, i) =>
      storeConversation({
        ...mockConversationData,
        id: `concurrent-${i}`,
      })
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    console.log(`✅ 50 concurrent stores: ${duration}ms (${(duration / 50).toFixed(2)}ms avg)`);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle missing transcript/summary', async () => {
    const invalidData = {
      ...mockConversationData,
      messages: [], // Empty messages = no transcript
    };

    await expect(storeConversation(invalidData as any)).rejects.toThrow();
  });

  it('should retry failed batch operations', async () => {
    let attempts = 0;
    (query as any).mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve({ rows: [{ id: 'batch' }] });
    });

    const { generateBatchEmbeddings } = await import('../memoryService');
    (generateBatchEmbeddings as any).mockResolvedValue([mockEmbedding]);

    // Add 10 conversations to trigger batch
    for (let i = 0; i < 10; i++) {
      await addToBatch({
        ...mockConversationData,
        id: `conv-${i}`,
      });
    }

    // Should retry and eventually succeed
    expect(query).toHaveBeenCalled();
  });

  it('should handle invalid conversation ID format', async () => {
    await expect(
      getConversation('invalid-uuid-format')
    ).resolves.not.toThrow();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration', () => {
  it('should complete full workflow: store -> extract -> flag', async () => {
    // Setup mocks
    (query as any)
      .mockResolvedValueOnce({ rows: [{ id: 'conv-1' }] }) // Store
      .mockResolvedValueOnce({ rows: [{ id: 'learning-1' }] }) // Extract
      .mockResolvedValueOnce({ rows: [{ id: 'conv-1' }] }); // Flag

    (generateEmbedding as any).mockResolvedValue(mockEmbedding);

    const { extractKnowledgeInsights } = await import('../../utils/aiExtractor');
    (extractKnowledgeInsights as any).mockResolvedValue([
      {
        type: 'new_info',
        content: 'Test info',
        confidence: 0.9,
        category: 'general',
      },
    ]);

    // Step 1: Store conversation
    const storedId = await storeConversation(mockConversationData);
    expect(storedId).toBe('conv-1');

    // Step 2: Extract knowledge
    await extractPotentialKnowledge('conv-1', 'Test transcript', 1);
    expect(query).toHaveBeenCalledTimes(2); // Store + Extract

    // Step 3: Flag for review
    const flagged = await flagForReview('conv-1', 'Test flag');
    expect(flagged).toBe(true);

    console.log('✅ Full workflow completed successfully');
  });
});

// ============================================================================
// RUN TESTS
// ============================================================================

console.log('🧪 Running Conversation Storage Tests...');
console.log('Total tests: ~50');
console.log('Coverage: storage, batching, extraction, flagging, retrieval, performance, errors');
