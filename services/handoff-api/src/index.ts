/**
 * Handoff API Server
 *
 * Provides RAG (Retrieval-Augmented Generation) endpoints for the chatbot:
 * - POST /api/knowledge/search - Search knowledge base
 * - POST /api/knowledge/learn - Add new knowledge
 * - GET /api/health - Health check
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { searchKnowledgeBaseOptimized, addKnowledge } from './services/memoryService.js';
import {
  submitConversationFeedback,
  submitOwnerCorrection,
  submitVoiceTranscript,
  getPendingCorrections,
  approveCorrection
} from './services/feedbackService.js';
import { autoStoreMiddleware, setupGracefulShutdown } from './middleware/autoStoreMiddleware.js';
import {
  getConversation,
  getUserConversations,
  flagForReview,
  getConversationsNeedingReview
} from './services/conversationStorage.js';

// ============================================================================
// APP INITIALIZATION
// ============================================================================

const app = new Hono();
const PORT = parseInt(process.env.PORT || '3000');

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3010', 'https://cuttingedge.cihconsultingllc.com'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Auto-store conversation middleware
// Automatically captures and analyzes all chat conversations
app.use('/api/chat*', autoStoreMiddleware());
app.use('/api/conversations*', autoStoreMiddleware());
app.use('/api/messages*', autoStoreMiddleware());

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'cutting-edge-handoff-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// KNOWLEDGE BASE SEARCH ENDPOINT
// ============================================================================

/**
 * POST /api/knowledge/search
 *
 * Search knowledge base and return relevant context using vector similarity
 *
 * Request body:
 * {
 *   "query": "haircut prices",
 *   "shopId": 1,
 *   "limit": 5,
 *   "category": "pricing",
 *   "threshold": 0.7
 * }
 */
app.post('/api/knowledge/search', async (c) => {
  try {
    const body = await c.req.json();
    const {
      query,
      shopId = 1,
      limit = 5,
      category,
      threshold = 0.7
    } = body;

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return c.json({
        error: 'Query must be at least 3 characters'
      }, 400);
    }

    if (!shopId || typeof shopId !== 'number' || shopId <= 0) {
      return c.json({
        error: 'Valid shopId is required'
      }, 400);
    }

    if (limit && (limit < 1 || limit > 100)) {
      return c.json({
        error: 'Limit must be between 1 and 100'
      }, 400);
    }

    if (threshold && (threshold < 0 || threshold > 1)) {
      return c.json({
        error: 'Threshold must be between 0 and 1'
      }, 400);
    }

    // Search knowledge base
    const results = await searchKnowledgeBaseOptimized(
      query.trim(),
      shopId,
      limit,
      category,
      threshold
    );

    return c.json({
      query,
      results: results.map(r => ({
        content: r.content,
        category: r.category,
        similarity: r.similarity,
        source: r.source
      })),
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Knowledge search failed:', error);
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// KNOWLEDGE BASE LEARN ENDPOINT
// ============================================================================

/**
 * POST /api/knowledge/learn
 *
 * Add new knowledge to the knowledge base
 *
 * Request body:
 * {
 *   "shopId": 1,
 *   "content": "Haircuts cost $30",
 *   "category": "pricing",
 *   "source": "manual",
 *   "metadata": {}
 * }
 */
app.post('/api/knowledge/learn', async (c) => {
  try {
    const body = await c.req.json();
    const {
      shopId,
      content,
      category,
      source,
      metadata
    } = body;

    // Input validation
    if (!shopId || typeof shopId !== 'number' || shopId <= 0) {
      return c.json({
        error: 'Valid shopId is required'
      }, 400);
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return c.json({
        error: 'Content must be at least 10 characters'
      }, 400);
    }

    // Add knowledge
    const id = await addKnowledge(
      shopId,
      content,
      category,
      source,
      metadata
    );

    return c.json({
      success: true,
      id,
      message: 'Knowledge added successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to add knowledge:', error);
    return c.json({
      error: 'Failed to add knowledge',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// FEEDBACK API ENDPOINTS
// ============================================================================

/**
 * POST /api/feedback/rating
 *
 * Submit user feedback (thumbs up/down, star rating) for a conversation
 *
 * Request body:
 * {
 *   "conversationId": "uuid",
 *   "feedbackType": "thumbs_up" | "thumbs_down" | "star_rating" | "emoji",
 *   "rating": 1-5,  // optional, only for star_rating
 *   "reason": "text explaining feedback",  // optional
 *   "metadata": {}  // optional
 * }
 *
 * Note: Database trigger will auto-create learning_queue entry for negative feedback
 */
app.post('/api/feedback/rating', async (c) => {
  try {
    const body = await c.req.json();

    // Submit feedback
    const result = await submitConversationFeedback(body);

    if (!result.success) {
      return c.json({
        error: 'Failed to submit feedback',
        message: result.error
      }, 400);
    }

    return c.json({
      success: true,
      feedbackId: result.feedbackId,
      autoCreatedLearningItem: result.autoCreatedLearningItem,
      message: 'Feedback submitted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Feedback submission failed:', error);
    return c.json({
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/feedback/correction
 *
 * Submit owner correction for incorrect AI response
 *
 * Request body:
 * {
 *   "conversationId": "uuid",
 *   "originalResponse": "the incorrect AI response",
 *   "correctedAnswer": "the correct answer",
 *   "priority": "low" | "normal" | "high" | "urgent",  // optional, default: normal
 *   "correctionContext": "when/how this correction applies",  // optional
 *   "metadata": {}  // optional
 * }
 *
 * Note: Database trigger will auto-create learning_queue entry
 */
app.post('/api/feedback/correction', async (c) => {
  try {
    const body = await c.req.json();

    // Submit correction
    const result = await submitOwnerCorrection(body);

    if (!result.success) {
      return c.json({
        error: 'Failed to submit correction',
        message: result.error
      }, 400);
    }

    return c.json({
      success: true,
      correctionId: result.correctionId,
      autoCreatedLearningItem: result.autoCreatedLearningItem,
      learningQueueId: result.learningQueueId,
      message: 'Correction submitted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Correction submission failed:', error);
    return c.json({
      error: 'Failed to submit correction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/feedback/voice-correction
 *
 * Submit voice transcript with sentiment analysis
 *
 * Request body:
 * {
 *   "conversationId": "uuid",  // optional
 *   "transcript": "the voice conversation transcript",
 *   "sentiment": "positive" | "neutral" | "negative" | "mixed",
 *   "entities": [],  // optional, extracted entities
 *   "learningInsights": {},  // optional, AI-extracted insights
 *   "metadata": {}  // optional
 * }
 */
app.post('/api/feedback/voice-correction', async (c) => {
  try {
    const body = await c.req.json();

    // Submit voice transcript
    const result = await submitVoiceTranscript(body);

    if (!result.success) {
      return c.json({
        error: 'Failed to submit voice transcript',
        message: result.error
      }, 400);
    }

    return c.json({
      success: true,
      transcriptId: result.transcriptId,
      message: 'Voice transcript submitted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Voice transcript submission failed:', error);
    return c.json({
      error: 'Failed to submit voice transcript',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/feedback/pending
 *
 * Get pending corrections from the learning queue
 *
 * Query parameters:
 * - shopId: number (optional) - Filter by shop ID
 * - limit: number (optional, default: 50, max: 1000) - Number of items to return
 * - status: string (optional, default: "pending") - Filter by status
 *
 * Example: GET /api/feedback/pending?shopId=1&limit=20&status=pending
 */
app.get('/api/feedback/pending', async (c) => {
  try {
    const shopId = c.req.query('shopId');
    const limit = c.req.query('limit');
    const status = c.req.query('status');

    const queryParams: any = {};

    if (shopId) {
      queryParams.shopId = parseInt(shopId);
      if (isNaN(queryParams.shopId)) {
        return c.json({
          error: 'Invalid shopId parameter',
          message: 'shopId must be a valid number'
        }, 400);
      }
    }

    if (limit) {
      queryParams.limit = parseInt(limit);
      if (isNaN(queryParams.limit)) {
        return c.json({
          error: 'Invalid limit parameter',
          message: 'limit must be a valid number'
        }, 400);
      }
    }

    if (status) {
      queryParams.status = status;
    }

    // Get pending corrections
    const result = await getPendingCorrections(queryParams);

    if (!result.success) {
      return c.json({
        error: 'Failed to get pending corrections',
        message: result.error
      }, 400);
    }

    return c.json({
      success: true,
      items: result.items,
      count: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get pending corrections:', error);
    return c.json({
      error: 'Failed to get pending corrections',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/feedback/approve
 *
 * Approve a correction from the learning queue
 *
 * Request body:
 * {
 *   "learningQueueId": "uuid",
 *   "reviewedBy": "admin-username-or-id"
 * }
 *
 * This updates the learning_queue status to 'approved'
 * and marks it as ready to be applied to the knowledge base.
 */
app.post('/api/feedback/approve', async (c) => {
  try {
    const body = await c.req.json();

    // Approve correction
    const result = await approveCorrection(body);

    if (!result.success) {
      return c.json({
        error: 'Failed to approve correction',
        message: result.error
      }, 400);
    }

    return c.json({
      success: true,
      learningQueueId: result.learningQueueId,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      message: 'Correction approved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Correction approval failed:', error);
    return c.json({
      error: 'Failed to approve correction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// CONVERSATION STORAGE ENDPOINTS
// ============================================================================

/**
 * GET /api/conversations/:id
 *
 * Get a specific conversation by ID
 *
 * Params:
 * - id: Conversation ID (UUID)
 *
 * Returns full conversation details including transcript and metadata
 */
app.get('/api/conversations/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!id || typeof id !== 'string') {
      return c.json({
        error: 'Invalid conversation ID'
      }, 400);
    }

    const conversation = await getConversation(id);

    if (!conversation) {
      return c.json({
        error: 'Conversation not found'
      }, 404);
    }

    return c.json({
      success: true,
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        shopId: conversation.shopId,
        channel: conversation.channel,
        summary: conversation.summary,
        metadata: conversation.metadata,
        needsReview: conversation.needsReview,
        reviewReason: conversation.reviewReason,
        createdAt: conversation.createdAt,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return c.json({
      error: 'Failed to get conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/conversations/user/:userId
 *
 * Get all conversations for a specific user
 *
 * Params:
 * - userId: User ID
 *
 * Query parameters:
 * - shopId: Shop ID (required)
 * - limit: Maximum number of results (default: 20, max: 100)
 *
 * Example: GET /api/conversations/user/user-123?shopId=1&limit=10
 */
app.get('/api/conversations/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const shopIdParam = c.req.query('shopId');
    const limitParam = c.req.query('limit');

    if (!userId || typeof userId !== 'string') {
      return c.json({
        error: 'Invalid user ID'
      }, 400);
    }

    if (!shopIdParam) {
      return c.json({
        error: 'shopId query parameter is required'
      }, 400);
    }

    const shopId = parseInt(shopIdParam);
    if (isNaN(shopId) || shopId <= 0) {
      return c.json({
        error: 'Invalid shopId'
      }, 400);
    }

    const limit = limitParam ? parseInt(limitParam) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return c.json({
        error: 'Invalid limit (must be 1-100)'
      }, 400);
    }

    const conversations = await getUserConversations(userId, shopId, limit);

    return c.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv.id,
        userId: conv.userId,
        shopId: conv.shopId,
        channel: conv.channel,
        summary: conv.summary,
        metadata: conv.metadata,
        needsReview: conv.needsReview,
        reviewReason: conv.reviewReason,
        createdAt: conv.createdAt,
      })),
      count: conversations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get user conversations:', error);
    return c.json({
      error: 'Failed to get user conversations',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/conversations/flag
 *
 * Flag a conversation for human review
 *
 * Request body:
 * {
 *   "conversationId": "uuid",
 *   "reason": "User confusion detected",
 *   "priority": "low" | "normal" | "high" | "urgent"
 * }
 */
app.post('/api/conversations/flag', async (c) => {
  try {
    const body = await c.req.json();
    const { conversationId, reason, priority = 'normal' } = body;

    if (!conversationId || typeof conversationId !== 'string') {
      return c.json({
        error: 'conversationId is required'
      }, 400);
    }

    if (!reason || typeof reason !== 'string') {
      return c.json({
        error: 'reason is required'
      }, 400);
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return c.json({
        error: `priority must be one of: ${validPriorities.join(', ')}`
      }, 400);
    }

    const result = await flagForReview(conversationId, reason, priority);

    if (!result) {
      return c.json({
        error: 'Conversation not found'
      }, 404);
    }

    return c.json({
      success: true,
      message: 'Conversation flagged for review',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to flag conversation:', error);
    return c.json({
      error: 'Failed to flag conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/conversations/review
 *
 * Get conversations that need human review
 *
 * Query parameters:
 * - shopId: Shop ID (required)
 * - limit: Maximum number of results (default: 50, max: 100)
 *
 * Returns conversations ordered by priority and time
 */
app.get('/api/conversations/review', async (c) => {
  try {
    const shopIdParam = c.req.query('shopId');
    const limitParam = c.req.query('limit');

    if (!shopIdParam) {
      return c.json({
        error: 'shopId query parameter is required'
      }, 400);
    }

    const shopId = parseInt(shopIdParam);
    if (isNaN(shopId) || shopId <= 0) {
      return c.json({
        error: 'Invalid shopId'
      }, 400);
    }

    const limit = limitParam ? parseInt(limitParam) : 50;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return c.json({
        error: 'Invalid limit (must be 1-100)'
      }, 400);
    }

    const conversations = await getConversationsNeedingReview(shopId, limit);

    return c.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv.id,
        userId: conv.userId,
        channel: conv.channel,
        summary: conv.summary,
        reviewReason: conv.reviewReason,
        createdAt: conv.createdAt,
      })),
      count: conversations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get conversations for review:', error);
    return c.json({
      error: 'Failed to get conversations for review',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500);
});

app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: `Route ${c.req.method} ${c.req.path} not found`
  }, 404);
});

// ============================================================================
// START SERVER
// ============================================================================

console.log(`🚀 Starting Cutting Edge Handoff API on port ${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`✅ Server running at http://localhost:${PORT}`);
console.log(`📚 Endpoints:`);
console.log(`   POST /api/knowledge/search - Search knowledge base`);
console.log(`   POST /api/knowledge/learn - Add new knowledge`);
console.log(`   POST /api/feedback/rating - Submit conversation feedback`);
console.log(`   POST /api/feedback/correction - Submit owner correction`);
console.log(`   POST /api/feedback/voice-correction - Submit voice transcript`);
console.log(`   GET  /api/feedback/pending - Get pending corrections`);
console.log(`   POST /api/feedback/approve - Approve correction`);
console.log(`   GET  /api/conversations/:id - Get conversation by ID`);
console.log(`   GET  /api/conversations/user/:userId - Get user conversations`);
console.log(`   POST /api/conversations/flag - Flag conversation for review`);
console.log(`   GET  /api/conversations/review - Get conversations needing review`);
console.log(`   GET  /api/health - Health check`);

// Setup graceful shutdown for conversation batch flushing
setupGracefulShutdown();
