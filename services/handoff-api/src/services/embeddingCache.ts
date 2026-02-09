/**
 * Embedding Cache - In-memory caching for embedding vectors
 *
 * Purpose:
 * - Reduce redundant Ollama API calls for identical text
 * - Improve response time for repeated queries
 * - Lower computational overhead
 *
 * Features:
 * - TTL-based expiration (1 hour default)
 * - Automatic cleanup of stale entries
 * - Cache statistics for monitoring
 */

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

interface CacheStats {
  size: number;
  keys: string[];
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = 1000 * 60 * 60; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cached embeddings

// ============================================================================
// CACHE STORAGE
// ============================================================================

const embeddingCache = new Map<string, CacheEntry>();
let totalHits = 0;
let totalMisses = 0;

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get cached embedding if available and not expired
 *
 * @param text - Text to look up in cache
 * @returns Embedding vector or null if not found/expired
 */
export function getCachedEmbedding(text: string): number[] | null {
  const cached = embeddingCache.get(text);

  if (!cached) {
    totalMisses++;
    return null;
  }

  // Check if entry has expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    embeddingCache.delete(text);
    totalMisses++;
    return null;
  }

  totalHits++;
  return cached.embedding;
}

/**
 * Store embedding in cache with timestamp
 *
 * @param text - Text key for the embedding
 * @param embedding - Embedding vector to cache
 */
export function setCachedEmbedding(text: string, embedding: number[]): void {
  // Enforce maximum cache size
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) {
      embeddingCache.delete(firstKey);
    }
  }

  embeddingCache.set(text, {
    embedding,
    timestamp: Date.now(),
  });
}

/**
 * Clear all cached embeddings
 *
 * Useful for testing or memory management
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  totalHits = 0;
  totalMisses = 0;
}

/**
 * Get cache statistics
 *
 * @returns Current cache metrics
 */
export function getCacheStats(): CacheStats {
  const total = totalHits + totalMisses;
  const hitRate = total > 0 ? (totalHits / total) * 100 : 0;

  return {
    size: embeddingCache.size,
    keys: Array.from(embeddingCache.keys()).slice(0, 10), // Return first 10 keys
    hitRate: parseFloat(hitRate.toFixed(2)),
    totalHits,
    totalMisses,
  };
}

/**
 * Clean up expired cache entries
 *
 * Normally expired entries are removed on access, but this
 * function can be called periodically to actively clean up
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  // Iterate over cache entries to find expired ones
  const entries = Array.from(embeddingCache.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, entry] = entries[i];
    if (now - entry.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  }

  // Delete expired entries
  for (let i = 0; i < keysToDelete.length; i++) {
    embeddingCache.delete(keysToDelete[i]);
  }

  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
  }
}

// ============================================================================
// PERIODIC CLEANUP
// ============================================================================

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      cleanupExpiredEntries();
    },
    1000 * 60 * 10
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getCachedEmbedding,
  setCachedEmbedding,
  clearEmbeddingCache,
  getCacheStats,
  cleanupExpiredEntries,
};
