/**
 * Memory Service - RAG Vector Search & Embedding Generation
 *
 * Features:
 * - Vector similarity search using pgvector/HNSW indexes
 * - Secure parameterized queries (SQL injection protected)
 * - Retry logic for Ollama API calls
 * - Comprehensive input validation
 * - Knowledge base search with shop isolation
 */

import { query } from '../utils/db';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const MAX_RETRIES = 3;
const EMBEDDING_DIMENSIONS = 768;

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  shop_id: number;
  category: string | null;
  content: string;
  similarity: number;
  source?: string;
  metadata?: Record<string, any>;
}

export interface ConversationMemory {
  id: string;
  user_id: string;
  channel: string;
  transcript?: string;
  summary?: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at: Date;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateText(text: string, fieldName: string, minLength: number = 1): void {
  if (!text || typeof text !== 'string' || text.trim().length < minLength) {
    throw new Error(
      `Invalid ${fieldName}: must be a string with at least ${minLength} characters`
    );
  }
}

function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Invalid userId: must be a non-empty string');
  }
}

function validateShopId(shopId: number): void {
  if (!shopId || typeof shopId !== 'number' || shopId <= 0) {
    throw new Error('Invalid shopId: must be a positive number');
  }
}

function validateChannel(channel: string): void {
  if (!channel || typeof channel !== 'string' || channel.trim().length === 0) {
    throw new Error('Invalid channel: must be a non-empty string');
  }
}

// ============================================================================
// EMBEDDING GENERATION (with Retry Logic)
// ============================================================================

/**
 * Generate embedding vector from text using Ollama
 *
 * @param text - Input text to embed
 * @returns Promise<number[]> - 768-dimensional vector
 * @throws Error if all retries fail
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Input validation
  validateText(text, 'text');

  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBED_MODEL,
          prompt: text.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as EmbeddingResult;

      // Validate embedding dimensions
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid response: embedding is missing or not an array');
      }

      if (data.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${data.embedding.length}`
        );
      }

      return data.embedding;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Embedding generation attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
        error
      );

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  throw new Error(
    `Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

// ============================================================================
// KNOWLEDGE BASE SEARCH (Vector Similarity)
// ============================================================================

/**
 * Search knowledge base using vector similarity
 *
 * Uses the knowledge_base_rag table (created in migration 008)
 * with pgvector HNSW index for fast approximate nearest neighbor search
 *
 * @param queryText - Query text to search for
 * @param shopId - Shop ID for multi-tenancy isolation
 * @param limit - Maximum number of results (default: 5)
 * @param category - Optional category filter
 * @returns Promise<KnowledgeBaseEntry[]> - Similar knowledge base entries
 */
export async function searchKnowledgeBase(
  queryText: string,
  shopId: number,
  limit: number = 5,
  category?: string
): Promise<KnowledgeBaseEntry[]> {
  // Input validation
  validateText(queryText, 'queryText', 3);
  validateShopId(shopId);

  if (limit < 1 || limit > 100) {
    throw new Error('Invalid limit: must be between 1 and 100');
  }

  // Generate embedding for query
  const embedding = await generateEmbedding(queryText);

  // Convert to pgvector array syntax
  // Note: This is safe because embedding is generated by our code, not user input
  const vectorStr = `[${embedding.join(',')}]`;

  // Build parameterized query (SQL injection protected)
  let sql: string;
  const params: (string | number)[] = [vectorStr, shopId, limit];

  if (category && category.trim()) {
    sql = `
      SELECT
        id,
        shop_id,
        category,
        content,
        source,
        1 - (embedding <=> $1) as similarity,
        metadata
      FROM knowledge_base_rag
      WHERE shop_id = $2
        AND category = $4
      ORDER BY embedding <=> $1
      LIMIT $3;
    `;
    params.push(category.trim());
  } else {
    sql = `
      SELECT
        id,
        shop_id,
        category,
        content,
        source,
        1 - (embedding <=> $1) as similarity,
        metadata
      FROM knowledge_base_rag
      WHERE shop_id = $2
      ORDER BY embedding <=> $1
      LIMIT $3;
    `;
  }

  try {
    const result = await query<KnowledgeBaseEntry>(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Knowledge base search failed:', error);
    throw new Error(`Search failed: ${(error as Error).message}`);
  }
}

/**
 * Search knowledge base using the optimized search function
 *
 * Uses the search_knowledge_base() function created in migration 008
 * which includes proper indexing and optional category filtering
 *
 * @param queryText - Query text to search for
 * @param shopId - Shop ID for multi-tenancy isolation
 * @param limit - Maximum number of results (default: 5)
 * @param category - Optional category filter
 * @param threshold - Minimum similarity threshold (default: 0.0)
 * @returns Promise<KnowledgeBaseEntry[]> - Similar knowledge base entries
 */
export async function searchKnowledgeBaseOptimized(
  queryText: string,
  shopId: number,
  limit: number = 5,
  category?: string,
  threshold: number = 0.0
): Promise<KnowledgeBaseEntry[]> {
  // Input validation
  validateText(queryText, 'queryText', 3);
  validateShopId(shopId);

  if (limit < 1 || limit > 100) {
    throw new Error('Invalid limit: must be between 1 and 100');
  }

  if (threshold < 0 || threshold > 1) {
    throw new Error('Invalid threshold: must be between 0 and 1');
  }

  // Generate embedding for query
  const embedding = await generateEmbedding(queryText);
  const vectorStr = `[${embedding.join(',')}]`;

  // Call the search_knowledge_base function (created in migration 008)
  const sql = `
    SELECT * FROM search_knowledge_base(
      $1::integer,
      $2::vector(768),
      $3::integer,
      $4::text,
      $5::numeric
    );
  `;

  const params = [shopId, vectorStr, limit, category || null, threshold];

  try {
    const result = await query<KnowledgeBaseEntry>(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Optimized knowledge base search failed:', error);
    throw new Error(`Search failed: ${(error as Error).message}`);
  }
}

// ============================================================================
// CONVERSATION MEMORY (Store & Retrieve)
// ============================================================================

/**
 * Store conversation transcript/summary with embedding
 *
 * @param userId - User identifier
 * @param channel - Channel identifier (e.g., 'telegram', 'web')
 * @param transcript - Full conversation transcript (optional)
 * @param summary - Conversation summary (optional)
 * @param metadata - Additional metadata (optional)
 * @returns Promise<string> - ID of inserted record
 */
export async function storeConversation(
  userId: string,
  channel: string,
  transcript?: string,
  summary?: string,
  metadata?: Record<string, any>
): Promise<string> {
  // Input validation
  validateUserId(userId);
  validateChannel(channel);

  if (!transcript && !summary) {
    throw new Error(
      'Invalid input: at least one of transcript or summary is required'
    );
  }

  // Generate embedding from summary if available, otherwise transcript
  const textToEmbed = (summary || transcript || '').trim();
  const embedding = await generateEmbedding(textToEmbed);

  // Parameterized query (SQL injection protected)
  const sql = `
    INSERT INTO conversation_memory (user_id, channel, transcript, summary, embedding, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id;
  `;

  const params = [
    userId.trim(),
    channel.trim(),
    transcript || null,
    summary || null,
    `[${embedding.join(',')}]`, // Vector array syntax
    metadata ? JSON.stringify(metadata) : '{}',
  ];

  try {
    const result = await query<{ id: string }>(sql, params);
    return result.rows[0].id;
  } catch (error) {
    console.error('Failed to store conversation:', error);
    throw new Error(`Storage failed: ${(error as Error).message}`);
  }
}

/**
 * Retrieve conversation memories by user
 *
 * @param userId - User identifier
 * @param channel - Optional channel filter
 * @param limit - Maximum number of results (default: 10)
 * @returns Promise<ConversationMemory[]> - Conversation memories
 */
export async function getConversationMemories(
  userId: string,
  channel?: string,
  limit: number = 10
): Promise<ConversationMemory[]> {
  // Input validation
  validateUserId(userId);

  if (limit < 1 || limit > 100) {
    throw new Error('Invalid limit: must be between 1 and 100');
  }

  // Build parameterized query
  let sql: string;
  const params: (string | number)[] = [userId, limit];

  if (channel && channel.trim()) {
    validateChannel(channel);
    sql = `
      SELECT id, user_id, channel, transcript, summary, metadata, created_at
      FROM conversation_memory
      WHERE user_id = $1
        AND channel = $3
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    params.splice(1, 0, limit); // Reorder params
    params.push(channel.trim());
  } else {
    sql = `
      SELECT id, user_id, channel, transcript, summary, metadata, created_at
      FROM conversation_memory
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
  }

  try {
    const result = await query<ConversationMemory>(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Failed to retrieve conversation memories:', error);
    throw new Error(`Retrieval failed: ${(error as Error).message}`);
  }
}

// ============================================================================
// KNOWLEDGE BASE MANAGEMENT (CRUD)
// ============================================================================

/**
 * Add knowledge base entry
 *
 * @param shopId - Shop ID
 * @param content - Knowledge content
 * @param category - Category classification
 * @param source - Source identifier
 * @param metadata - Additional metadata
 * @returns Promise<string> - ID of inserted record
 */
export async function addKnowledge(
  shopId: number,
  content: string,
  category?: string,
  source?: string,
  metadata?: Record<string, any>
): Promise<string> {
  // Input validation
  validateShopId(shopId);
  validateText(content, 'content', 10);

  // Generate embedding
  const embedding = await generateEmbedding(content.trim());

  // Parameterized query
  const sql = `
    INSERT INTO knowledge_base_rag (shop_id, content, category, source, embedding, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id;
  `;

  const params = [
    shopId,
    content.trim(),
    category?.trim() || null,
    source?.trim() || null,
    `[${embedding.join(',')}]`,
    metadata ? JSON.stringify(metadata) : '{}',
  ];

  try {
    const result = await query<{ id: string }>(sql, params);
    return result.rows[0].id;
  } catch (error) {
    console.error('Failed to add knowledge:', error);
    throw new Error(`Insert failed: ${(error as Error).message}`);
  }
}

/**
 * Get knowledge base entry by ID
 *
 * @param id - Entry ID
 * @returns Promise<KnowledgeBaseEntry | null> - Knowledge entry or null
 */
export async function getKnowledgeById(
  id: string
): Promise<KnowledgeBaseEntry | null> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Invalid id: must be a non-empty string');
  }

  const sql = `
    SELECT id, shop_id, category, content, source, metadata, created_at
    FROM knowledge_base_rag
    WHERE id = $1;
  `;

  try {
    const result = await query<KnowledgeBaseEntry>(sql, [id.trim()]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to get knowledge:', error);
    throw new Error(`Retrieval failed: ${(error as Error).message}`);
  }
}

/**
 * List knowledge base entries for a shop
 *
 * @param shopId - Shop ID
 * @param category - Optional category filter
 * @param limit - Maximum number of results (default: 50)
 * @returns Promise<KnowledgeBaseEntry[]> - Knowledge entries
 */
export async function listKnowledge(
  shopId: number,
  category?: string,
  limit: number = 50
): Promise<KnowledgeBaseEntry[]> {
  // Input validation
  validateShopId(shopId);

  if (limit < 1 || limit > 500) {
    throw new Error('Invalid limit: must be between 1 and 500');
  }

  // Build parameterized query
  let sql: string;
  const params: (string | number)[] = [shopId, limit];

  if (category && category.trim()) {
    sql = `
      SELECT id, shop_id, category, content, source, metadata, created_at
      FROM knowledge_base_rag
      WHERE shop_id = $1
        AND category = $3
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    params.splice(1, 0, limit);
    params.push(category.trim());
  } else {
    sql = `
      SELECT id, shop_id, category, content, source, metadata, created_at
      FROM knowledge_base_rag
      WHERE shop_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
  }

  try {
    const result = await query<KnowledgeBaseEntry>(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Failed to list knowledge:', error);
    throw new Error(`List failed: ${(error as Error).message}`);
  }
}

/**
 * Delete knowledge base entry
 *
 * @param id - Entry ID
 * @returns Promise<boolean> - True if deleted, false if not found
 */
export async function deleteKnowledge(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Invalid id: must be a non-empty string');
  }

  const sql = `
    DELETE FROM knowledge_base_rag
    WHERE id = $1
    RETURNING id;
  `;

  try {
    const result = await query<{ id: string }>(sql, [id.trim()]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to delete knowledge:', error);
    throw new Error(`Delete failed: ${(error as Error).message}`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateEmbedding,
  searchKnowledgeBase,
  searchKnowledgeBaseOptimized,
  storeConversation,
  getConversationMemories,
  addKnowledge,
  getKnowledgeById,
  listKnowledge,
  deleteKnowledge,
};
