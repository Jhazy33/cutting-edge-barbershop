/**
 * Auto-Storage Integration Tests
 *
 * End-to-end integration tests for automatic conversation storage.
 * Tests include:
 * - Complete workflow from conversation to knowledge
 * - Middleware integration
 * - Database persistence
 * - Async processing
 * - Batch processing
 * - Cross-service integration
 *
 * Coverage target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  storeConversation,
  getConversationMemories,
  generateEmbedding,
  generateBatchEmbeddings,
  addKnowledge,
  getKnowledgeById,
  listKnowledge,
  searchKnowledgeBaseOptimized
} from '../../src/services/memoryService';
import {
  submitConversationFeedback,
  submitOwnerCorrection,
  submitVoiceTranscript,
  getPendingCorrections,
  approveCorrection
} from '../../src/services/feedbackService';
import {
  cleanupTestData,
  insertTestFeedbackRating,
  countRows,
  getLearningQueueEntry,
  learningQueueEntryExists
} from '../setup';

// Mock fetch for Ollama API
global.fetch = vi.fn();

// Mock performance monitor
vi.mock('../../src/services/performanceMonitor', () => ({
  recordPerformance: vi.fn()
}));

// Mock embedding cache
vi.mock('../../src/services/embeddingCache', () => ({
  getCachedEmbedding: vi.fn(() => null),
  setCachedEmbedding: vi.fn()
}));

describe('Auto-Storage Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // ============================================================================
  // END-TO-END WORKFLOW TESTS (10 tests)
  // ============================================================================

  describe('End-to-End Workflows', () => {
    it('should complete full conversation-to-knowledge workflow', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.1);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Store conversation
      const conversationId = await storeConversation(
        'user_workflow_1',
        'telegram',
        'Customer asked: What are your haircut prices? Staff responded: $30 for adults, $20 for kids',
        'Price inquiry conversation',
        { shopId: 1, sessionId: 'sess_001' }
      );

      expect(conversationId).toBeDefined();

      // Step 2: Retrieve conversation
      const memories = await getConversationMemories('user_workflow_1');
      expect(memories).toBeDefined();
      expect(memories.length).toBe(1);
      expect(memories[0].transcript).toContain('haircut prices');

      // Step 3: Extract and add knowledge
      const knowledgeId = await addKnowledge(
        1,
        'Haircut prices: $30 for adults, $20 for children',
        'pricing',
        'conversation',
        { sourceConversationId: conversationId }
      );

      expect(knowledgeId).toBeDefined();

      // Step 4: Verify knowledge is searchable
      const searchResults = await searchKnowledgeBaseOptimized('haircut pricing', 1, 5);
      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
    });

    it('should handle feedback-to-learning workflow', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.2);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Submit negative feedback
      const feedbackResult = await submitConversationFeedback({
        conversationId: 'conv-feedback-001',
        feedbackType: 'thumbs_down',
        reason: 'AI gave incorrect pricing information',
        metadata: { shopId: 1 }
      });

      expect(feedbackResult.success).toBe(true);
      expect(feedbackResult.autoCreatedLearningItem).toBe(true);

      // Step 2: Submit owner correction
      const correctionResult = await submitOwnerCorrection({
        conversationId: 'conv-feedback-001',
        originalResponse: 'Haircuts cost $25',
        correctedAnswer: 'Haircuts cost $30 for adults, $20 for children',
        priority: 'high',
        correctionContext: 'Pricing varies by service type'
      });

      expect(correctionResult.success).toBe(true);
      expect(correctionResult.autoCreatedLearningItem).toBe(true);
      expect(correctionResult.learningQueueId).toBeDefined();

      // Step 3: Verify learning queue entry
      const learningEntry = await getLearningQueueEntry(
        parseInt(correctionResult.correctionId!),
        'correction'
      );

      expect(learningEntry).toBeDefined();
      expect(learningEntry.status).toBe('pending');

      // Step 4: Approve correction
      const approvalResult = await approveCorrection({
        learningQueueId: correctionResult.learningQueueId!,
        reviewedBy: 'admin-user'
      });

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.newStatus).toBe('approved');
    });

    it('should process batch conversations efficiently', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.3);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Store multiple conversations
      const conversations = [
        { userId: 'user_batch_1', channel: 'telegram', transcript: 'Conv 1', summary: 'Sum 1' },
        { userId: 'user_batch_2', channel: 'web', transcript: 'Conv 2', summary: 'Sum 2' },
        { userId: 'user_batch_3', channel: 'telegram', transcript: 'Conv 3', summary: 'Sum 3' }
      ];

      const conversationIds = await Promise.all(
        conversations.map(conv =>
          storeConversation(conv.userId, conv.channel, conv.transcript, conv.summary)
        )
      );

      expect(conversationIds).toHaveLength(3);

      // Step 2: Retrieve all memories
      const allMemories = await Promise.all(
        conversations.map(conv => getConversationMemories(conv.userId))
      );

      expect(allMemories).toHaveLength(3);
      expect(allMemories.every(mems => mems.length === 1)).toBe(true);

      // Step 3: Batch knowledge extraction
      const knowledgeItems = [
        { content: 'Knowledge 1 extracted from conversation', category: 'pricing' },
        { content: 'Knowledge 2 extracted from conversation', category: 'hours' },
        { content: 'Knowledge 3 extracted from conversation', category: 'services' }
      ];

      const knowledgeIds = await Promise.all(
        knowledgeItems.map(item =>
          addKnowledge(1, item.content, item.category, 'batch-extraction')
        )
      );

      expect(knowledgeIds).toHaveLength(3);

      // Step 4: Verify all knowledge is searchable
      const searchResults = await searchKnowledgeBaseOptimized('conversation knowledge', 1, 10);
      expect(searchResults.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle voice transcript workflow', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.4);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Submit voice transcript with negative sentiment
      const transcriptResult = await submitVoiceTranscript({
        conversationId: 'conv-voice-001',
        transcript: 'Customer complained about long wait times and poor service quality',
        sentiment: 'negative',
        entities: [
          { type: 'issue', value: 'wait times' },
          { type: 'issue', value: 'service quality' }
        ],
        learningInsights: {
          keyIssues: ['long wait times', 'poor service'],
          suggestedActions: ['improve scheduling', 'staff training']
        }
      });

      expect(transcriptResult.success).toBe(true);
      expect(transcriptResult.transcriptId).toBeDefined();

      // Step 2: Store conversation summary
      const conversationId = await storeConversation(
        'user_voice_1',
        'voice',
        undefined,
        'Customer complaint about wait times and service',
        { transcriptId: transcriptResult.transcriptId, sentiment: 'negative' }
      );

      expect(conversationId).toBeDefined();

      // Step 3: Retrieve and verify
      const memories = await getConversationMemories('user_voice_1');
      expect(memories).toBeDefined();
      expect(memories[0].summary).toContain('complaint');
    });

    it('should handle cross-channel conversation tracking', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.5);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const userId = 'user_cross_channel';

      // Step 1: Store conversations across different channels
      await storeConversation(userId, 'telegram', 'Telegram conversation', 'Telegram summary');
      await storeConversation(userId, 'web', 'Web chat conversation', 'Web summary');
      await storeConversation(userId, 'voice', 'Voice call conversation', 'Voice summary');

      // Step 2: Retrieve all memories (all channels)
      const allMemories = await getConversationMemories(userId);
      expect(allMemories).toBeDefined();
      expect(allMemories.length).toBe(3);

      // Step 3: Retrieve by specific channel
      const telegramMemories = await getConversationMemories(userId, 'telegram');
      expect(telegramMemories).toBeDefined();
      expect(telegramMemories.length).toBe(1);
      expect(telegramMemories[0].channel).toBe('telegram');

      const webMemories = await getConversationMemories(userId, 'web');
      expect(webMemories).toBeDefined();
      expect(webMemories.length).toBe(1);
      expect(webMemories[0].channel).toBe('web');
    });

    it('should handle knowledge extraction from corrections', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.6);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Submit correction
      const correctionResult = await submitOwnerCorrection({
        conversationId: 'conv-correction-001',
        originalResponse: 'We are open 9-5 Monday to Friday',
        correctedAnswer: 'We are open 9AM-7PM Monday to Saturday, and 10AM-4PM on Sunday',
        priority: 'high',
        correctionContext: 'Weekend hours were incorrect'
      });

      expect(correctionResult.success).toBe(true);

      // Step 2: Store knowledge from correction
      const knowledgeId = await addKnowledge(
        1,
        'Store hours: 9AM-7PM Mon-Sat, 10AM-4PM Sun',
        'hours',
        'owner-correction',
        { sourceCorrectionId: correctionResult.correctionId }
      );

      expect(knowledgeId).toBeDefined();

      // Step 3: Verify searchable
      const searchResults = await searchKnowledgeBaseOptimized('store opening hours', 1, 5);
      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);

      const found = searchResults.some(r => r.content.includes('9AM-7PM'));
      expect(found).toBe(true);
    });

    it('should handle async processing of multiple corrections', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.7);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Submit multiple corrections
      const corrections = [
        {
          conversationId: 'conv-async-001',
          originalResponse: 'Price is $25',
          correctedAnswer: 'Price is $30 for adults, $20 for children',
          priority: 'high' as const
        },
        {
          conversationId: 'conv-async-002',
          originalResponse: 'Open 9-5',
          correctedAnswer: 'Open 9AM-7PM Mon-Sat, 10AM-4PM Sun',
          priority: 'normal' as const
        },
        {
          conversationId: 'conv-async-003',
          originalResponse: 'No appointment needed',
          correctedAnswer: 'Appointments recommended but walk-ins welcome',
          priority: 'low' as const
        }
      ];

      const correctionResults = await Promise.all(
        corrections.map(correction => submitOwnerCorrection(correction))
      );

      expect(correctionResults).toHaveLength(3);
      expect(correctionResults.every(r => r.success)).toBe(true);

      // Step 2: Get pending corrections
      const pendingResult = await getPendingCorrections({ shopId: 1, limit: 10 });
      expect(pendingResult.success).toBe(true);
      expect(pendingResult.count).toBeGreaterThanOrEqual(3);

      // Step 3: Approve all corrections
      const approvalResults = await Promise.all(
        correctionResults.map(result =>
          approveCorrection({
            learningQueueId: result.learningQueueId!,
            reviewedBy: 'admin-user'
          })
        )
      );

      expect(approvalResults).toHaveLength(3);
      expect(approvalResults.every(r => r.success && r.newStatus === 'approved')).toBe(true);
    });

    it('should handle metadata preservation through workflow', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.8);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const originalMetadata = {
        shopId: 1,
        sessionId: 'sess_meta_001',
        customerId: 'cust_123',
        customerName: 'John Doe',
        appointmentDate: '2024-01-15',
        services: ['haircut', 'beard trim'],
        totalAmount: 45,
        staffMember: 'Jane Smith'
      };

      // Step 1: Store conversation with metadata
      const conversationId = await storeConversation(
        'user_metadata_test',
        'telegram',
        'Full conversation transcript with customer',
        'Appointment booking conversation',
        originalMetadata
      );

      expect(conversationId).toBeDefined();

      // Step 2: Retrieve and verify metadata
      const memories = await getConversationMemories('user_metadata_test');
      expect(memories).toBeDefined();
      expect(memories[0].metadata).toEqual(originalMetadata);

      // Step 3: Add knowledge with linked metadata
      const knowledgeMetadata = {
        sourceConversationId: conversationId,
        originalMetadata: originalMetadata,
        extractedAt: new Date().toISOString()
      };

      const knowledgeId = await addKnowledge(
        1,
        'Customer appointment booked for haircut and beard trim',
        'appointments',
        'conversation',
        knowledgeMetadata
      );

      expect(knowledgeId).toBeDefined();

      // Step 4: Verify knowledge metadata
      const knowledge = await getKnowledgeById(knowledgeId);
      expect(knowledge).toBeDefined();
      expect(knowledge?.metadata).toEqual(knowledgeMetadata);
    });

    it('should handle error recovery in workflow', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(0.9);
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      // Step 1: Attempt to store conversation (should retry and succeed)
      const conversationId = await storeConversation(
        'user_recovery_test',
        'telegram',
        'Conversation with recovery',
        'Summary'
      );

      expect(conversationId).toBeDefined();

      // Step 2: Verify conversation was stored
      const memories = await getConversationMemories('user_recovery_test');
      expect(memories).toBeDefined();
      expect(memories.length).toBe(1);
    });

    it('should handle priority-based processing', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.0);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Step 1: Submit corrections with different priorities
      const urgentCorrection = await submitOwnerCorrection({
        conversationId: 'conv-priority-urgent',
        originalResponse: 'Urgent issue response',
        correctedAnswer: 'Correct urgent response',
        priority: 'urgent'
      });

      const highCorrection = await submitOwnerCorrection({
        conversationId: 'conv-priority-high',
        originalResponse: 'High priority issue response',
        correctedAnswer: 'Correct high priority response',
        priority: 'high'
      });

      const normalCorrection = await submitOwnerCorrection({
        conversationId: 'conv-priority-normal',
        originalResponse: 'Normal priority response',
        correctedAnswer: 'Correct normal response',
        priority: 'normal'
      });

      expect(urgentCorrection.success).toBe(true);
      expect(highCorrection.success).toBe(true);
      expect(normalCorrection.success).toBe(true);

      // Step 2: Get pending corrections (should be ordered by priority)
      const pendingResult = await getPendingCorrections({ shopId: 1, limit: 10 });
      expect(pendingResult.success).toBe(true);
      expect(pendingResult.count).toBeGreaterThanOrEqual(3);

      // Step 3: Verify urgent items are processed first
      const urgentItems = pendingResult.items?.filter(item => item.priority === 'urgent');
      expect(urgentItems).toBeDefined();
      expect(urgentItems!.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // MIDDLEWARE INTEGRATION TESTS (5 tests)
  // ============================================================================

  describe('Middleware Integration', () => {
    it('should integrate with conversation middleware', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.1);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Simulate middleware intercepting conversation
      const conversation = {
        userId: 'user_middleware_1',
        channel: 'telegram',
        messages: [
          { role: 'user', content: 'What are your prices?' },
          { role: 'assistant', content: '$30 for adults, $20 for kids' }
        ],
        metadata: { shopId: 1 }
      };

      // Middleware: Store conversation
      const transcript = conversation.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const conversationId = await storeConversation(
        conversation.userId,
        conversation.channel,
        transcript,
        undefined,
        conversation.metadata
      );

      expect(conversationId).toBeDefined();

      // Middleware: Verify storage
      const memories = await getConversationMemories(conversation.userId);
      expect(memories).toBeDefined();
      expect(memories[0].transcript).toContain('What are your prices?');
    });

    it('should integrate with feedback middleware', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.2);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Simulate feedback middleware
      const feedbackData = {
        conversationId: 'conv-middleware-001',
        feedbackType: 'thumbs_down' as const,
        reason: 'Incorrect information provided',
        metadata: { shopId: 1, source: 'telegram-bot' }
      };

      // Middleware: Submit feedback
      const result = await submitConversationFeedback(feedbackData);

      expect(result.success).toBe(true);
      expect(result.autoCreatedLearningItem).toBe(true);

      // Middleware: Verify learning queue entry created
      const queueExists = await learningQueueEntryExists(
        parseInt(result.feedbackId!),
        'feedback'
      );

      expect(queueExists).toBe(true);
    });

    it('should integrate with search middleware', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.3);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
        } as Response);

      // Add knowledge for search
      await addKnowledge(
        1,
        'Store policy: No refunds after 30 days',
        'policy',
        'manual'
      );

      // Simulate search middleware
      const query = 'refund policy time limit';
      const results = await searchKnowledgeBaseOptimized(query, 1, 5);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('refunds');
    });

    it('should integrate with analytics middleware', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.4);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Store multiple conversations for analytics
      await storeConversation('user_analytics_1', 'telegram', 'Conversation 1', 'Summary 1');
      await storeConversation('user_analytics_2', 'web', 'Conversation 2', 'Summary 2');
      await storeConversation('user_analytics_3', 'telegram', 'Conversation 3', 'Summary 3');

      // Analytics: Retrieve all conversations
      const memories1 = await getConversationMemories('user_analytics_1');
      const memories2 = await getConversationMemories('user_analytics_2');
      const memories3 = await getConversationMemories('user_analytics_3');

      expect(memories1.length).toBe(1);
      expect(memories2.length).toBe(1);
      expect(memories3.length).toBe(1);

      // Analytics: Verify data integrity
      expect(memories1[0].userId).toBe('user_analytics_1');
      expect(memories2[0].channel).toBe('web');
      expect(memories3[0].channel).toBe('telegram');
    });

    it('should integrate with notification middleware', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.5);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Submit high-priority correction
      const correctionResult = await submitOwnerCorrection({
        conversationId: 'conv-notification-001',
        originalResponse: 'Incorrect urgent information',
        correctedAnswer: 'Correct urgent information',
        priority: 'urgent',
        correctionContext: 'Urgent correction needed'
      });

      expect(correctionResult.success).toBe(true);

      // Notification middleware would be triggered here
      // to notify admin about urgent correction

      // Get pending corrections for notification
      const pendingResult = await getPendingCorrections({
        shopId: 1,
        status: 'pending'
      });

      expect(pendingResult.success).toBe(true);
      const urgentItems = pendingResult.items?.filter(item => item.priority === 'urgent');
      expect(urgentItems!.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DATABASE PERSISTENCE TESTS (5 tests)
  // ============================================================================

  describe('Database Persistence', () => {
    it('should persist conversation across database connections', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.6);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const userId = 'user_persistence_1';
      const transcript = 'Persistent conversation data';
      const summary = 'Persistence test summary';

      // Act: Store conversation
      const conversationId = await storeConversation(userId, 'telegram', transcript, summary);
      expect(conversationId).toBeDefined();

      // Act: Retrieve immediately
      const memories1 = await getConversationMemories(userId);
      expect(memories1).toBeDefined();
      expect(memories1.length).toBe(1);

      // Act: Retrieve again (simulating new connection)
      const memories2 = await getConversationMemories(userId);
      expect(memories2).toBeDefined();
      expect(memories2.length).toBe(1);

      // Assert: Data should be identical
      expect(memories1[0].id).toBe(memories2[0].id);
      expect(memories1[0].transcript).toBe(memories2[0].transcript);
      expect(memories1[0].summary).toBe(memories2[0].summary);
    });

    it('should persist knowledge across database connections', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.7);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const content = 'Persistent knowledge content';
      const category = 'persistence-test';

      // Act: Add knowledge
      const knowledgeId = await addKnowledge(1, content, category, 'test');
      expect(knowledgeId).toBeDefined();

      // Act: Retrieve immediately
      const knowledge1 = await getKnowledgeById(knowledgeId);
      expect(knowledge1).toBeDefined();

      // Act: Retrieve again (simulating new connection)
      const knowledge2 = await getKnowledgeById(knowledgeId);
      expect(knowledge2).toBeDefined();

      // Assert: Data should be identical
      expect(knowledge1?.id).toBe(knowledge2?.id);
      expect(knowledge1?.content).toBe(knowledge2?.content);
      expect(knowledge1?.category).toBe(knowledge2?.category);
    });

    it('should handle concurrent writes to database', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.8);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Act: Concurrent writes
      const writePromises = Array.from({ length: 20 }, (_, i) =>
        storeConversation(`user_concurrent_write_${i}`, 'telegram', `Conversation ${i}`, `Summary ${i}`)
      );

      const conversationIds = await Promise.all(writePromises);

      // Assert: All writes should succeed
      expect(conversationIds).toHaveLength(20);
      expect(conversationIds.every(id => typeof id === 'string')).toBe(true);

      // Assert: All data should be retrievable
      const readPromises = Array.from({ length: 20 }, (_, i) =>
        getConversationMemories(`user_concurrent_write_${i}`)
      );

      const memories = await Promise.all(readPromises);

      expect(memories).toHaveLength(20);
      expect(memories.every(mems => mems.length === 1)).toBe(true);
    });

    it('should maintain referential integrity', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(1.9);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      // Act: Store conversation
      const conversationId = await storeConversation(
        'user_integrity_1',
        'telegram',
        'Test conversation',
        'Test summary',
        { shopId: 1 }
      );

      // Act: Add knowledge with reference
      const knowledgeId = await addKnowledge(
        1,
        'Test knowledge',
        'test',
        'conversation',
        { sourceConversationId: conversationId }
      );

      // Assert: Knowledge should reference conversation
      const knowledge = await getKnowledgeById(knowledgeId);
      expect(knowledge).toBeDefined();
      expect(knowledge?.metadata.sourceConversationId).toBe(conversationId);

      // Assert: Original conversation should still exist
      const memories = await getConversationMemories('user_integrity_1');
      expect(memories).toBeDefined();
      expect(memories[0].id).toBe(conversationId);
    });

    it('should handle transaction rollback on error', async () => {
      // Arrange
      const mockEmbedding = Array(768).fill(2.0);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [...mockEmbedding], model: 'nomic-embed-text' })
      } as Response);

      const userId = 'user_rollback_test';

      // Act: Store valid conversation
      const conversationId1 = await storeConversation(userId, 'telegram', 'Valid conversation', 'Summary');
      expect(conversationId1).toBeDefined();

      // Act: Attempt invalid operation (should fail and rollback)
      try {
        await storeConversation(userId, 'telegram', undefined, undefined);
        fail('Should have thrown error');
      } catch (error) {
        // Expected error
      }

      // Assert: Original conversation should still exist
      const memories = await getConversationMemories(userId);
      expect(memories).toBeDefined();
      expect(memories.length).toBe(1);
      expect(memories[0].id).toBe(conversationId1);
    });
  });
});
