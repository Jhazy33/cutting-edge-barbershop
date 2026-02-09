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
console.log(`   GET  /api/health - Health check`);
