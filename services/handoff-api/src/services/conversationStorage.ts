/**
 * Conversation Storage Service
 *
 * Automatic conversation capture and analysis for continuous learning.
 *
 * Features:
 * - Store conversations with embeddings for RAG search
 * - Batch processing for performance (every 10 convos or 30 seconds)
 * - AI-powered knowledge extraction from conversations
 * - Flag conversations needing human review
 * - Async processing with <100ms synchronous overhead
 * - Comprehensive error handling with retry logic
 */

import { query } from '../utils/db';
import { generateEmbedding, generateBatchEmbeddings } from './memoryService';
import { extractKnowledgeInsights, detectConfusion, identifyNewInfo } from '../utils/aiExtractor';
import { recordPerformance } from './performanceMonitor';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationData {
  id: string;
  userId: string;
  shopId: number;
  channel: 'web' | 'telegram' | 'api' | 'voice';
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  metadata?: Record<string, any>;
}

export interface StoredConversation {
  id: string;
  userId: string;
  shopId: number;
  channel: string;
  transcript: string;
  summary: string;
  embedding: number[];
  metadata: Record<string, any>;
  needsReview: boolean;
  reviewReason: string | null;
  createdAt: Date;
}

export interface KnowledgeInsight {
  type: 'new_info' | 'correction' | 'pattern' | 'faq';
  content: string;
  confidence: number;
  category?: string;
}

export interface ConversationSummary {
  conversationId: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  entities: Array<{ text: string; type: string }>;
  suggestedActions: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 30000;
const MAX_RETRIES = 3;
const STORAGE_TIMEOUT_MS = 100; // Target: <100ms for sync operations

// In-memory batch buffer
let conversationBatch: ConversationData[] = [];
let batchTimer: NodeJS.Timeout | null = null;

// ============================================================================
// CONVERSATION STORAGE (Individual)
// ============================================================================

/**
 * Store a single conversation with embedding
 *
 * @param data - Conversation data
 * @returns Promise<string> - ID of stored conversation
 */
export async function storeConversation(data: ConversationData): Promise<string> {
  const startTime = Date.now();
  let success = false;

  try {
    // Validate input
    validateConversationData(data);

    // Build transcript and summary
    const transcript = buildTranscript(data.messages);
    const summary = await summarizeConversation(transcript);

    // Generate embedding asynchronously
    const embeddingPromise = generateEmbedding(summary);

    // Detect if conversation needs review (fast operation)
    const needsReviewCheck = await detectConfusion(transcript);

    // Store in database first (synchronous path)
    const embedding = await Promise.race([
      embeddingPromise,
      new Promise<number[]>((resolve) =>
        setTimeout(() => resolve([]), STORAGE_TIMEOUT_MS)
      )
    ]);

    const sql = `
      INSERT INTO conversations (
        id, user_id, shop_id, channel, transcript, summary,
        embedding, metadata, needs_review, review_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
    `;

    const params = [
      data.id,
      data.userId,
      data.shopId,
      data.channel,
      transcript,
      summary,
      embedding.length > 0 ? `[${embedding.join(',')}]` : null,
      JSON.stringify(data.metadata || {}),
      needsReviewCheck.needsReview,
      needsReviewCheck.reason || null,
    ];

    const result = await query<{ id: string }>(sql, params);
    success = true;

    // Complete embedding generation in background if it timed out
    if (embedding.length === 0) {
      embeddingPromise.then(async (emb) => {
        try {
          await query(
            'UPDATE conversations SET embedding = $1 WHERE id = $2',
            [`[${emb.join(',')}]`, data.id]
          );
          console.log(`✅ Background embedding updated for conversation ${data.id}`);
        } catch (error) {
          console.error(`❌ Failed to update embedding for ${data.id}:`, error);
        }
      });
    }

    // Extract potential knowledge asynchronously
    extractPotentialKnowledge(data.id, transcript, data.shopId).catch((error) => {
      console.error(`❌ Knowledge extraction failed for ${data.id}:`, error);
    });

    const duration = Date.now() - startTime;
    recordPerformance('conversation_store', duration, true);
    console.log(`✅ Conversation stored: ${data.id} (${duration}ms)`);

    return result.rows[0].id;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordPerformance('conversation_store', duration, false);
    console.error('❌ Failed to store conversation:', error);
    throw new Error(`Storage failed: ${(error as Error).message}`);
  }
}

// ============================================================================
// BATCH STORAGE (Performance Optimized)
// ============================================================================

/**
 * Add conversation to batch buffer
 *
 * @param data - Conversation data
 * @returns Promise<void>
 */
export async function addToBatch(data: ConversationData): Promise<void> {
  try {
    // Validate input
    validateConversationData(data);

    // Add to batch
    conversationBatch.push(data);

    console.log(`📦 Added to batch: ${data.id} (${conversationBatch.length}/${BATCH_SIZE})`);

    // Process batch if full
    if (conversationBatch.length >= BATCH_SIZE) {
      await processBatch();
    } else if (!batchTimer) {
      // Set timer for auto-flush
      batchTimer = setTimeout(() => {
        processBatch().catch((error) => {
          console.error('❌ Batch processing failed:', error);
        });
      }, BATCH_INTERVAL_MS);
    }
  } catch (error) {
    console.error('❌ Failed to add to batch:', error);
    throw error;
  }
}

/**
 * Process batch of conversations
 *
 * @returns Promise<void>
 */
async function processBatch(): Promise<void> {
  if (conversationBatch.length === 0) {
    return;
  }

  const batch = [...conversationBatch];
  conversationBatch = [];

  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  const startTime = Date.now();
  console.log(`🚀 Processing batch of ${batch.length} conversations...`);

  try {
    // Build summaries for all conversations
    const transcripts = batch.map((data) => buildTranscript(data.messages));
    const summaries = await Promise.all(
      transcripts.map((t) => summarizeConversation(t))
    );

    // Generate embeddings in batch
    const embeddings = await generateBatchEmbeddings(summaries);

    // Insert all conversations in single query
    const valuesSql = batch.map((_, i) => {
      const offset = i * 10;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
    }).join(', ');

    const sql = `
      INSERT INTO conversations (
        id, user_id, shop_id, channel, transcript, summary,
        embedding, metadata, needs_review, review_reason
      )
      VALUES ${valuesSql}
      RETURNING id;
    `;

    const params: any[] = [];
    for (let i = 0; i < batch.length; i++) {
      const data = batch[i];
      const transcript = transcripts[i];
      const summary = summaries[i];
      const embedding = embeddings[i];

      params.push(
        data.id,
        data.userId,
        data.shopId,
        data.channel,
        transcript,
        summary,
        `[${embedding.join(',')}]`,
        JSON.stringify(data.metadata || {}),
        false, // needsReview
        null // reviewReason
      );
    }

    await query(sql, params);

    const duration = Date.now() - startTime;
    const avgPerConversation = Math.round(duration / batch.length);
    recordPerformance('batch_conversation_store', duration, true, {
      batchSize: batch.length,
      avgPerConversation,
    });

    console.log(`✅ Batch stored: ${batch.length} conversations (${duration}ms, ${avgPerConversation}ms/convo)`);

    // Extract knowledge from batch asynchronously
    for (let i = 0; i < batch.length; i++) {
      extractPotentialKnowledge(batch[i].id, transcripts[i], batch[i].shopId).catch(
        (error) => {
          console.error(`❌ Knowledge extraction failed for ${batch[i].id}:`, error);
        }
      );
    }
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    // Re-add failed batch to buffer for retry
    conversationBatch.unshift(...batch);

    // Exponential backoff for retry
    setTimeout(() => {
      processBatch().catch(console.error);
    }, 1000 * Math.pow(2, MAX_RETRIES - conversationBatch.length / BATCH_SIZE));
  }
}

/**
 * Force flush batch buffer
 *
 * @returns Promise<void>
 */
export async function flushBatch(): Promise<void> {
  if (conversationBatch.length > 0) {
    await processBatch();
  }
}

// ============================================================================
// KNOWLEDGE EXTRACTION
// ============================================================================

/**
 * Extract potential knowledge from conversation
 *
 * @param conversationId - Conversation ID
 * @param transcript - Conversation transcript
 * @param shopId - Shop ID
 * @returns Promise<void>
 */
export async function extractPotentialKnowledge(
  conversationId: string,
  transcript: string,
  shopId: number
): Promise<void> {
  try {
    console.log(`🔍 Extracting knowledge from ${conversationId}...`);

    // Use AI to extract insights
    const insights = await extractKnowledgeInsights(transcript);

    if (insights.length === 0) {
      console.log(`ℹ️  No knowledge extracted from ${conversationId}`);
      return;
    }

    // Store insights in learning_queue for human review
    for (const insight of insights) {
      if (insight.confidence < 0.7) {
        continue; // Skip low-confidence insights
      }

      const learningSql = `
        INSERT INTO learning_queue (
          shop_id, source_type, source_id, proposed_content,
          category, confidence_score, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `;

      await query(learningSql, [
        shopId,
        'conversation',
        conversationId,
        insight.content,
        insight.category || 'general',
        insight.confidence,
        JSON.stringify({
          insightType: insight.type,
          extractedAt: new Date().toISOString(),
        }),
      ]);

      console.log(`✅ Knowledge extracted: ${insight.type} - ${insight.content.substring(0, 50)}...`);
    }
  } catch (error) {
    console.error(`❌ Knowledge extraction error for ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Identify new information not in knowledge base
 *
 * @param transcript - Conversation transcript
 * @param shopId - Shop ID
 * @returns Promise<Array<{ content: string; confidence: number }>>
 */
export async function identifyNewInformation(
  transcript: string,
  shopId: number
): Promise<Array<{ content: string; confidence: number }>> {
  try {
    const newInfo = await identifyNewInfo(transcript, shopId);
    return newInfo;
  } catch (error) {
    console.error('❌ Failed to identify new information:', error);
    return [];
  }
}

// ============================================================================
// FLAGGING FOR REVIEW
// ============================================================================

/**
 * Flag conversation for human review
 *
 * @param conversationId - Conversation ID
 * @param reason - Reason for review
 * @param priority - Priority level
 * @returns Promise<boolean>
 */
export async function flagForReview(
  conversationId: string,
  reason: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<boolean> {
  try {
    const sql = `
      UPDATE conversations
      SET needs_review = true,
          review_reason = $2,
          review_priority = $3,
          needs_review_since = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;

    const result = await query<{ id: string }>(sql, [conversationId, reason, priority]);

    if (result.rows.length > 0) {
      console.log(`🚩 Flagged for review: ${conversationId} (${priority} priority)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Failed to flag conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Get conversations needing review
 *
 * @param shopId - Shop ID
 * @param limit - Maximum number of results
 * @returns Promise<StoredConversation[]>
 */
export async function getConversationsNeedingReview(
  shopId: number,
  limit: number = 50
): Promise<StoredConversation[]> {
  try {
    const sql = `
      SELECT
        id, user_id, shop_id, channel, transcript, summary,
        metadata, needs_review, review_reason, created_at
      FROM conversations
      WHERE shop_id = $1
        AND needs_review = true
      ORDER BY review_priority DESC, needs_review_since ASC
      LIMIT $2;
    `;

    const result = await query<any>(sql, [shopId, limit]);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      shopId: row.shop_id,
      channel: row.channel,
      transcript: row.transcript,
      summary: row.summary,
      embedding: [], // Not loaded for review list
      metadata: row.metadata,
      needsReview: row.needs_review,
      reviewReason: row.review_reason,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('❌ Failed to get conversations needing review:', error);
    throw error;
  }
}

// ============================================================================
// RETRIEVAL
// ============================================================================

/**
 * Get conversation by ID
 *
 * @param conversationId - Conversation ID
 * @returns Promise<StoredConversation | null>
 */
export async function getConversation(
  conversationId: string
): Promise<StoredConversation | null> {
  try {
    const sql = `
      SELECT
        id, user_id, shop_id, channel, transcript, summary,
        embedding, metadata, needs_review, review_reason, created_at
      FROM conversations
      WHERE id = $1;
    `;

    const result = await query<any>(sql, [conversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      shopId: row.shop_id,
      channel: row.channel,
      transcript: row.transcript,
      summary: row.summary,
      embedding: row.embedding ? parseEmbedding(row.embedding) : [],
      metadata: row.metadata,
      needsReview: row.needs_review,
      reviewReason: row.review_reason,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error(`❌ Failed to get conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Search conversations by user
 *
 * @param userId - User ID
 * @param shopId - Shop ID
 * @param limit - Maximum number of results
 * @returns Promise<StoredConversation[]>
 */
export async function getUserConversations(
  userId: string,
  shopId: number,
  limit: number = 20
): Promise<StoredConversation[]> {
  try {
    const sql = `
      SELECT
        id, user_id, shop_id, channel, transcript, summary,
        metadata, needs_review, review_reason, created_at
      FROM conversations
      WHERE user_id = $1 AND shop_id = $2
      ORDER BY created_at DESC
      LIMIT $3;
    `;

    const result = await query<any>(sql, [userId, shopId, limit]);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      shopId: row.shop_id,
      channel: row.channel,
      transcript: row.transcript,
      summary: row.summary,
      embedding: [], // Not loaded for list view
      metadata: row.metadata,
      needsReview: row.needs_review,
      reviewReason: row.review_reason,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error(`❌ Failed to get user conversations:`, error);
    throw error;
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Validate conversation data
 */
function validateConversationData(data: ConversationData): void {
  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Invalid conversation ID');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  if (!data.shopId || typeof data.shopId !== 'number' || data.shopId <= 0) {
    throw new Error('Invalid shop ID');
  }

  if (
    !data.channel ||
    !['web', 'telegram', 'api', 'voice'].includes(data.channel)
  ) {
    throw new Error('Invalid channel');
  }

  if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
    throw new Error('Invalid messages array');
  }

  for (const msg of data.messages) {
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      throw new Error('Invalid message role');
    }
    if (!msg.content || typeof msg.content !== 'string') {
      throw new Error('Invalid message content');
    }
  }
}

/**
 * Build transcript from messages
 */
function buildTranscript(messages: ConversationData['messages']): string {
  return messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');
}

/**
 * Generate conversation summary (basic implementation)
 */
async function summarizeConversation(transcript: string): Promise<string> {
  // For now, use first 500 chars as summary
  // TODO: Replace with AI-based summarization
  if (transcript.length <= 500) {
    return transcript;
  }

  return transcript.substring(0, 497) + '...';
}

/**
 * Parse embedding from database format
 */
function parseEmbedding(embeddingStr: string): number[] {
  try {
    // Remove array brackets and split by comma
    const clean = embeddingStr.replace(/^\[|\]$/g, '');
    return clean.split(',').map((n) => parseFloat(n));
  } catch (error) {
    console.error('❌ Failed to parse embedding:', error);
    return [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  storeConversation,
  batchStoreConversations: addToBatch,
  flushBatch,
  extractPotentialKnowledge,
  identifyNewInformation,
  flagForReview,
  getConversationsNeedingReview,
  getConversation,
  getUserConversations,
};
