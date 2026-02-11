/**
 * Auto-Store Middleware
 *
 * Hono middleware for automatic conversation storage and analysis.
 *
 * Features:
 * - Intercept all chat API calls
 * - Auto-store conversation data
 * - Generate embeddings asynchronously
 * - Extract potential knowledge updates
 * - Performance target: <100ms overhead
 * - Batch processing for efficiency
 *
 * Usage:
 * ```typescript
 * app.use('/api/chat*', autoStoreMiddleware());
 * ```
 */

import { Context, Next } from 'hono';
import { addToBatch, flushBatch } from '../services/conversationStorage';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SYNC_TIMEOUT_MS = 100; // Max time for synchronous operations

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationMetadata {
  userId: string;
  shopId: number;
  channel: 'web' | 'telegram' | 'api' | 'voice';
  conversationId: string;
  startTime: Date;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Auto-store middleware for Hono
 *
 * Captures conversation data from chat endpoints and stores asynchronously.
 * Synchronous operations complete in <100ms to avoid blocking responses.
 */
export function autoStoreMiddleware() {
  return async (c: Context, next: Next) => {
    // Only process chat endpoints
    if (!isChatEndpoint(c.req.path)) {
      return next();
    }

    const startTime = Date.now();

    try {
      // Extract conversation data from request
      const conversationData = await extractConversationData(c);

      if (!conversationData) {
        // No conversation data to store, proceed normally
        return next();
      }

      // Add to batch for storage (fast, non-blocking)
      const storagePromise = addToBatch(conversationData);

      // Wait for response first (don't block)
      const response = await next();

      // Complete storage in background with timeout
      Promise.race([
        storagePromise,
        new Promise((resolve) => setTimeout(resolve, SYNC_TIMEOUT_MS)),
      ]).catch((error) => {
        console.error('❌ Background storage failed:', error);
      });

      // Log performance
      const duration = Date.now() - startTime;
      if (duration > SYNC_TIMEOUT_MS) {
        console.warn(`⚠️  Auto-store middleware slow: ${duration}ms`);
      } else {
        console.log(`✅ Auto-store middleware: ${duration}ms (<${SYNC_TIMEOUT_MS}ms target)`);
      }

      return response;
    } catch (error) {
      console.error('❌ Auto-store middleware error:', error);

      // Don't block the request if middleware fails
      return next();
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if request is for a chat endpoint
 */
function isChatEndpoint(path: string): boolean {
  const chatEndpoints = [
    '/api/chat',
    '/api/conversations',
    '/api/messages',
    '/api/ask',
    '/api/query',
  ];

  return chatEndpoints.some((endpoint) => path.startsWith(endpoint));
}

/**
 * Extract conversation data from request context
 *
 * @param c - Hono context
 * @returns Promise<ConversationData | null>
 */
async function extractConversationData(c: Context): Promise<any | null> {
  try {
    // Clone request to avoid consuming original body
    const requestBody = await c.req.json().catch(() => null);

    if (!requestBody) {
      return null;
    }

    // Extract metadata from headers or body
    const userId =
      c.req.header('X-User-ID') ||
      requestBody.userId ||
      requestBody.user_id ||
      'anonymous';

    const shopId =
      parseInt(c.req.header('X-Shop-ID') || requestBody.shopId || requestBody.shop_id || '1');

    const channel =
      (c.req.header('X-Channel') as any) ||
      requestBody.channel ||
      'web';

    const conversationId =
      c.req.header('X-Conversation-ID') ||
      requestBody.conversationId ||
      requestBody.conversation_id ||
      generateConversationId();

    // Extract messages from various request formats
    const messages = extractMessages(requestBody);

    if (!messages || messages.length === 0) {
      return null;
    }

    return {
      id: conversationId,
      userId,
      shopId,
      channel,
      messages,
      metadata: {
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
        userAgent: c.req.header('User-Agent') || 'unknown',
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('❌ Failed to extract conversation data:', error);
    return null;
  }
}

/**
 * Extract messages from various request formats
 *
 * Supports common chat API formats:
 * - OpenAI-style: { messages: [{role, content}] }
 * - Simple: { message, response }
 * - Array: { userMessage, assistantMessage }
 */
function extractMessages(body: any): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const now = new Date();

  // Format 1: OpenAI-style messages array
  if (body.messages && Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || now,
        });
      }
    }
  }

  // Format 2: Simple message + response
  if (body.message && body.response) {
    messages.push(
      {
        role: 'user',
        content: body.message,
        timestamp: body.messageTimestamp || now,
      },
      {
        role: 'assistant',
        content: body.response,
        timestamp: body.responseTimestamp || now,
      }
    );
  }

  // Format 3: User message only (request)
  if (body.userMessage || body.user_message || body.prompt || body.query) {
    const userContent =
      body.userMessage || body.user_message || body.prompt || body.query;

    messages.push({
      role: 'user',
      content: userContent,
      timestamp: now,
    });
  }

  // Format 4: Assistant response only
  if (body.assistantMessage || body.assistant_message || body.response || body.answer) {
    const assistantContent =
      body.assistantMessage || body.assistant_message || body.response || body.answer;

    messages.push({
      role: 'assistant',
      content: assistantContent,
      timestamp: now,
    });
  }

  return messages;
}

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Flush batch on process shutdown
 */
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n👋 Received ${signal}, flushing conversation batch...`);

    try {
      await flushBatch();
      console.log('✅ Batch flushed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error flushing batch:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default autoStoreMiddleware;
