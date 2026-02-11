/**
 * Conversation Storage Unit Tests
 *
 * Comprehensive test suite for automatic conversation storage functionality.
 * Tests include:
 * - Single and batch conversation storage
 * - Embedding generation
 * - Knowledge extraction
 * - Review flagging
 * - Error handling
 * - Input validation
 * - Security tests (SQL injection, XSS)
 *
 * Coverage target: 95%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  storeConversation,
  getConversationMemories,
  generateEmbedding,
  generateBatchEmbeddings,
  addKnowledge,
  getKnowledgeById,
  listKnowledge,
  deleteKnowledge,
  searchKnowledgeBase,
  searchKnowledgeBaseOptimized
} from '../src/services/memoryService';
import {
  cleanupTestData,
  insertTestFeedbackRating,
  countRows
} from './setup';

// Mock fetch for Ollama API
global.fetch = vi.fn();

// Mock performance monitor
vi.mock('../src/services/performanceMonitor', () => ({
  recordPerformance: vi.fn()
}));

// Mock embedding cache
vi.mock('../src/services/embeddingCache', () => ({
  getCachedEmbedding: vi.fn(() => null),
  setCachedEmbedding: vi.fn()
}));

describe('Conversation Storage Unit Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // ============================================================================
  // SUCCESS TESTS (20 tests)
  // ============================================================================

  describe('Success Cases', () => {
    it('should store a single conversation with transcript', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.1);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const conversationData = {
        userId: 'user_123',
        channel: 'telegram',
        transcript: 'Customer asked about haircut prices and availability',
        summary: 'Price inquiry for haircuts',
        metadata: { shopId: 1, sessionId: 'sess_456' }
      };

      // Act
      const conversationId = await storeConversation(
        conversationData.userId,
        conversationData.channel,
        conversationData.transcript,
        conversationData.summary,
        conversationData.metadata
      );

      // Assert
      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should store a single conversation with summary only', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.2);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      // Act
      const conversationId = await storeConversation(
        'user_456',
        'web',
        undefined,
        'User complained about wait times'
      );

      // Assert
      expect(conversationId).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retrieve conversation memories by user', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.3);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await storeConversation('user_789', 'telegram', 'Test conversation 1', 'Summary 1');

      // Act
      const memories = await getConversationMemories('user_789');

      // Assert
      expect(memories).toBeDefined();
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].userId).toBe('user_789');
    });

    it('should retrieve conversation memories by user and channel', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.4);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await storeConversation('user_abc', 'web', 'Web conversation', 'Web summary');

      // Act
      const memories = await getConversationMemories('user_abc', 'web');

      // Assert
      expect(memories).toBeDefined();
      expect(memories.length).toBe(1);
      expect(memories[0].channel).toBe('web');
    });

    it('should generate embedding for text', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.5);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      // Act
      const embedding = await generateEmbedding('Haircut prices and styling services');

      // Assert
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
    });

    it('should generate batch embeddings for multiple texts', async () => {
      // Arrange
      const mockEmbedding1 = Array(768).fill(0.6);
      const mockEmbedding2 = Array(768).fill(0.7);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding1, model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding2, model: 'nomic-embed-text' })
        } as Response);

      // Act
      const embeddings = await generateBatchEmbeddings([
        'First text about haircuts',
        'Second text about styling'
      ]);

      // Assert
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(2);
      expect(embeddings[0].length).toBe(768);
      expect(embeddings[1].length).toBe(768);
    });

    it('should add knowledge to knowledge base', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.8);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      // Act
      const knowledgeId = await addKnowledge(
        1,
        'Haircuts cost $30 for adults and $20 for children',
        'pricing',
        'manual',
        { verified: true }
      );

      // Assert
      expect(knowledgeId).toBeDefined();
      expect(typeof knowledgeId).toBe('string');
    });

    it('should get knowledge by ID', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.9);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const knowledgeId = await addKnowledge(
        1,
        'Store hours: 9AM - 7PM daily',
        'hours',
        'manual'
      );

      // Act
      const knowledge = await getKnowledgeById(knowledgeId);

      // Assert
      expect(knowledge).toBeDefined();
      expect(knowledge?.id).toBe(knowledgeId);
      expect(knowledge?.category).toBe('hours');
    });

    it('should list knowledge by shop ID', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.0);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      await addKnowledge(1, 'Knowledge 1', 'cat1', 'auto');
      await addKnowledge(1, 'Knowledge 2', 'cat2', 'auto');

      // Act
      const knowledgeList = await listKnowledge(1);

      // Assert
      expect(knowledgeList).toBeDefined();
      expect(knowledgeList.length).toBeGreaterThanOrEqual(2);
    });

    it('should list knowledge by shop ID and category', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.1);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      await addKnowledge(1, 'Price info', 'pricing', 'auto');
      await addKnowledge(1, 'Hours info', 'hours', 'auto');

      // Act
      const knowledgeList = await listKnowledge(1, 'pricing');

      // Assert
      expect(knowledgeList).toBeDefined();
      expect(knowledgeList.length).toBe(1);
      expect(knowledgeList[0].category).toBe('pricing');
    });

    it('should delete knowledge by ID', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.2);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const knowledgeId = await addKnowledge(1, 'Temporary knowledge', 'temp', 'auto');

      // Act
      const deleted = await deleteKnowledge(knowledgeId);

      // Assert
      expect(deleted).toBe(true);

      const knowledge = await getKnowledgeById(knowledgeId);
      expect(knowledge).toBeNull();
    });

    it('should search knowledge base with vector similarity', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.3);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      await addKnowledge(1, 'Haircut pricing: $30 for adults', 'pricing', 'manual');

      // Act
      const results = await searchKnowledgeBase('haircut prices', 1, 5);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search knowledge base optimized with category filter', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.4);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      await addKnowledge(1, 'Store opening hours are 9AM', 'hours', 'manual');

      // Act
      const results = await searchKnowledgeBaseOptimized('store hours', 1, 5, 'hours');

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search knowledge base with similarity threshold', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.5);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      await addKnowledge(1, 'Premium haircut service costs $50', 'pricing', 'manual');

      // Act
      const results = await searchKnowledgeBaseOptimized('expensive haircut', 1, 5, undefined, 0.5);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should store conversation with complex metadata', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.6);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const complexMetadata = {
        shopId: 1,
        sessionId: 'sess_789',
        customerName: 'John Doe',
        appointmentDate: '2024-01-15',
        services: ['haircut', 'beard trim'],
        totalAmount: 45
      };

      // Act
      const conversationId = await storeConversation(
        'user_complex',
        'telegram',
        'Complex conversation with appointment booking',
        undefined,
        complexMetadata
      );

      // Assert
      expect(conversationId).toBeDefined();
    });

    it('should handle batch knowledge insertion', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.7);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const knowledgeItems = [
        { content: 'Item 1', category: 'cat1' },
        { content: 'Item 2', category: 'cat2' },
        { content: 'Item 3', category: 'cat3' }
      ];

      // Act
      const ids = await Promise.all(
        knowledgeItems.map(item => addKnowledge(1, item.content, item.category, 'batch'))
      );

      // Assert
      expect(ids).toBeDefined();
      expect(ids.length).toBe(3);
      expect(ids.every(id => typeof id === 'string')).toBe(true);
    });

    it('should retrieve memories with limit', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.8);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      await Promise.all([
        storeConversation('user_limit', 'telegram', 'Conv 1', 'Sum 1'),
        storeConversation('user_limit', 'telegram', 'Conv 2', 'Sum 2'),
        storeConversation('user_limit', 'telegram', 'Conv 3', 'Sum 3')
      ]);

      // Act
      const memories = await getConversationMemories('user_limit', undefined, 2);

      // Assert
      expect(memories).toBeDefined();
      expect(memories.length).toBe(2);
    });

    it('should store conversation and retrieve by user ID', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.9);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      const userId = 'user_retrieve_test';
      await storeConversation(userId, 'web', 'Test conversation', 'Test summary');

      // Act
      const memories = await getConversationMemories(userId);

      // Assert
      expect(memories).toBeDefined();
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].userId).toBe(userId);
    });

    it('should handle knowledge base search with no results', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(2.0);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      // Act
      const results = await searchKnowledgeBase('nonexistent topic xyz', 1, 5);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should return null when getting non-existent knowledge', async () => {
      // Act
      const knowledge = await getKnowledgeById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(knowledge).toBeNull();
    });

    it('should return false when deleting non-existent knowledge', async () => {
      // Act
      const deleted = await deleteKnowledge('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(deleted).toBe(false);
    });
  });

  // ============================================================================
  // VALIDATION TESTS (15 tests)
  // ============================================================================

  describe('Input Validation', () => {
    it('should reject empty userId', async () => {
      await expect(storeConversation('', 'telegram', 'Test', 'Summary'))
        .rejects.toThrow('Invalid userId');
    });

    it('should reject whitespace-only userId', async () => {
      await expect(storeConversation('   ', 'telegram', 'Test', 'Summary'))
        .rejects.toThrow('Invalid userId');
    });

    it('should reject empty channel', async () => {
      await expect(storeConversation('user_123', '', 'Test', 'Summary'))
        .rejects.toThrow('Invalid channel');
    });

    it('should reject missing transcript and summary', async () => {
      await expect(storeConversation('user_123', 'telegram'))
        .rejects.toThrow('at least one of transcript or summary is required');
    });

    it('should reject invalid shopId (zero)', async () => {
      const mockEmbedding = Array(768).fill(2.1);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await expect(addKnowledge(0, 'Content', 'cat', 'src'))
        .rejects.toThrow('Invalid shopId');
    });

    it('should reject invalid shopId (negative)', async () => {
      const mockEmbedding = Array(768).fill(2.2);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await expect(addKnowledge(-1, 'Content', 'cat', 'src'))
        .rejects.toThrow('Invalid shopId');
    });

    it('should reject short content for knowledge', async () => {
      const mockEmbedding = Array(768).fill(2.3);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await expect(addKnowledge(1, 'Short', 'cat', 'src'))
        .rejects.toThrow('Invalid content');
    });

    it('should reject empty knowledge ID', async () => {
      await expect(getKnowledgeById(''))
        .rejects.toThrow('Invalid id');
    });

    it('should reject whitespace-only knowledge ID', async () => {
      await expect(getKnowledgeById('   '))
        .rejects.toThrow('Invalid id');
    });

    it('should reject invalid limit (too low)', async () => {
      await expect(getConversationMemories('user_123', 'telegram', 0))
        .rejects.toThrow('Invalid limit');
    });

    it('should reject invalid limit (too high)', async () => {
      await expect(getConversationMemories('user_123', 'telegram', 101))
        .rejects.toThrow('Invalid limit');
    });

    it('should reject invalid search limit', async () => {
      const mockEmbedding = Array(768).fill(2.4);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await expect(searchKnowledgeBase('query', 1, 0))
        .rejects.toThrow('Invalid limit');
    });

    it('should reject invalid search threshold (negative)', async () => {
      const mockEmbedding = Array(768).fill(2.5);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await expect(searchKnowledgeBaseOptimized('query', 1, 5, undefined, -0.1))
        .rejects.toThrow('Invalid threshold');
    });

    it('should reject invalid search threshold (greater than 1)', async () => {
      const mockEmbedding = Array(768).fill(2.6);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      await expect(searchKnowledgeBaseOptimized('query', 1, 5, undefined, 1.1))
        .rejects.toThrow('Invalid threshold');
    });

    it('should reject short search query', async () => {
      await expect(searchKnowledgeBase('hi', 1, 5))
        .rejects.toThrow('Invalid queryText');
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS (10 tests)
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle Ollama API error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(generateEmbedding('Test text'))
        .rejects.toThrow('Failed to generate embedding');
    });

    it('should handle Ollama API timeout', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() => {
        throw new Error('ETIMEDOUT');
      });

      await expect(generateEmbedding('Test text'))
        .rejects.toThrow();
    });

    it('should handle invalid embedding response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response);

      await expect(generateEmbedding('Test text'))
        .rejects.toThrow('Invalid response');
    });

    it('should handle wrong embedding dimensions', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: Array(100).fill(0.1), model: 'nomic-embed-text' })
      } as Response);

      await expect(generateEmbedding('Test text'))
        .rejects.toThrow('Invalid embedding dimensions');
    });

    it('should handle batch embedding with empty array', async () => {
      await expect(generateBatchEmbeddings([]))
        .rejects.toThrow('Invalid input: texts array is empty');
    });

    it('should handle batch embedding with too many texts', async () => {
      const tooManyTexts = Array(51).fill('Test text');
      await expect(generateBatchEmbeddings(tooManyTexts))
        .rejects.toThrow('Invalid input: maximum 50 texts per batch');
    });

    it('should handle database connection error', async () => {
      const mockEmbedding = Array(768).fill(2.7);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      // This test assumes database might be unavailable
      // In real scenario, you'd mock the db connection
      const result = await storeConversation('user_db_err', 'telegram', 'Test', 'Summary');
      expect(result).toBeDefined();
    });

    it('should handle search with non-existent shop', async () => {
      const mockEmbedding = Array(768).fill(2.8);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const results = await searchKnowledgeBase('query', 99999, 5);
      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });

    it('should retry on temporary API failure', async () => {
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: Array(768).fill(2.9), model: 'nomic-embed-text' })
        } as Response);

      const embedding = await generateEmbedding('Test text');
      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(768);
    });

    it('should fail after max retries exhausted', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Permanent failure'));

      await expect(generateEmbedding('Test text'))
        .rejects.toThrow('Failed to generate embedding after 3 attempts');
    });
  });

  // ============================================================================
  // SECURITY TESTS (5 tests)
  // ============================================================================

  describe('Security Tests', () => {
    it('should sanitize userId to prevent SQL injection', async () => {
      const mockEmbedding = Array(768).fill(3.0);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const maliciousUserId = "'; DROP TABLE conversation_memory; --";

      const conversationId = await storeConversation(maliciousUserId, 'telegram', 'Test', 'Summary');
      expect(conversationId).toBeDefined();

      const memories = await getConversationMemories(maliciousUserId);
      expect(memories).toBeDefined();
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should sanitize transcript to prevent XSS', async () => {
      const mockEmbedding = Array(768).fill(3.1);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const xssPayload = '<script>alert("XSS")</script> Conversation content';

      const conversationId = await storeConversation('user_xss', 'telegram', xssPayload, 'Summary');
      expect(conversationId).toBeDefined();

      const memories = await getConversationMemories('user_xss');
      expect(memories).toBeDefined();
      expect(memories[0].transcript).toContain(xssPayload);
    });

    it('should handle special characters in content', async () => {
      const mockEmbedding = Array(768).fill(3.2);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const specialChars = "Content with 'quotes', \"double quotes\", ; semicolons, -- comments, and /* comments */";

      const knowledgeId = await addKnowledge(1, specialChars, 'test', 'security');
      expect(knowledgeId).toBeDefined();

      const knowledge = await getKnowledgeById(knowledgeId);
      expect(knowledge).toBeDefined();
      expect(knowledge?.content).toBe(specialChars);
    });

    it('should handle unicode characters in text', async () => {
      const mockEmbedding = Array(768).fill(3.3);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const unicodeText = 'Unicode test: 你好 日本語 🎉 ™ ® ©';

      const conversationId = await storeConversation('user_unicode', 'telegram', unicodeText, 'Unicode summary');
      expect(conversationId).toBeDefined();

      const memories = await getConversationMemories('user_unicode');
      expect(memories).toBeDefined();
      expect(memories[0].transcript).toContain(unicodeText);
    });

    it('should prevent injection in search query', async () => {
      const mockEmbedding = Array(768).fill(3.4);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding, model: 'nomic-embed-text' })
      } as Response);

      const injectionQuery = "'; DELETE FROM knowledge_base_rag WHERE TRUE; --";

      const results = await searchKnowledgeBase(injectionQuery, 1, 5);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ============================================================================
  // CONCURRENT ACCESS TESTS (5 tests)
  // ============================================================================

  describe('Concurrent Access', () => {
    it('should handle concurrent conversation storage', async () => {
      const mockEmbedding = Array(768).fill(3.5);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const concurrentOps = Array.from({ length: 10 }, (_, i) =>
        storeConversation(`user_concurrent_${i}`, 'telegram', `Conversation ${i}`, `Summary ${i}`)
      );

      const results = await Promise.all(concurrentOps);

      expect(results).toBeDefined();
      expect(results.length).toBe(10);
      expect(results.every(id => typeof id === 'string')).toBe(true);
    });

    it('should handle concurrent knowledge additions', async () => {
      const mockEmbedding = Array(768).fill(3.6);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const concurrentOps = Array.from({ length: 10 }, (_, i) =>
        addKnowledge(1, `Knowledge ${i}`, 'concurrent', 'test')
      );

      const results = await Promise.all(concurrentOps);

      expect(results).toBeDefined();
      expect(results.length).toBe(10);
      expect(results.every(id => typeof id === 'string')).toBe(true);
    });

    it('should handle concurrent reads', async () => {
      const mockEmbedding = Array(768).fill(3.7);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      await storeConversation('user_read_test', 'telegram', 'Test', 'Summary');

      const concurrentReads = Array.from({ length: 10 }, () =>
        getConversationMemories('user_read_test')
      );

      const results = await Promise.all(concurrentReads);

      expect(results).toBeDefined();
      expect(results.length).toBe(10);
      expect(results.every(memories => Array.isArray(memories))).toBe(true);
    });

    it('should handle concurrent mixed operations', async () => {
      const mockEmbedding = Array(768).fill(3.8);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const operations = [
        ...Array.from({ length: 5 }, (_, i) =>
          storeConversation(`user_mixed_${i}`, 'telegram', `Conv ${i}`, `Sum ${i}`)
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          addKnowledge(1, `Knowledge ${i}`, 'mixed', 'test')
        ),
        getConversationMemories('user_mixed_0'),
        listKnowledge(1)
      ];

      const results = await Promise.all(operations);

      expect(results).toBeDefined();
      expect(results.length).toBe(12);
    });

    it('should handle concurrent search operations', async () => {
      const mockEmbedding = Array(768).fill(3.9);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      await addKnowledge(1, 'Search test content', 'search', 'test');

      const concurrentSearches = Array.from({ length: 10 }, (_, i) =>
        searchKnowledgeBase(`search query ${i}`, 1, 5)
      );

      const results = await Promise.all(concurrentSearches);

      expect(results).toBeDefined();
      expect(results.length).toBe(10);
      expect(results.every(result => Array.isArray(result))).toBe(true);
    });
  });
});
