/**
 * Knowledge Conflict Resolver
 *
 * Advanced conflict detection and resolution for knowledge base updates.
 * Uses vector similarity to detect duplicates, similar content, and contradictions.
 *
 * Features:
 * - Vector similarity search for conflict detection
 * - Automatic conflict resolution strategies
 * - Knowledge merging algorithms
 * - Version tracking and history
 * - Performance optimization with caching
 */

import { query } from '../utils/db.js';
import { generateEmbedding } from './memoryService.js';
import { recordPerformance } from './performanceMonitor.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ConflictDetection {
  hasConflict: boolean;
  conflicts: DetectedConflict[];
  confidence: number;
}

export interface DetectedConflict {
  id: string;
  content: string;
  similarity: number;
  conflictType: 'exact_duplicate' | 'near_duplicate' | 'similar' | 'contradictory';
  severity: 'low' | 'medium' | 'high';
  suggestedAction: 'replace' | 'merge' | 'keep_both' | 'skip';
  reason: string;
}

export interface KnowledgeMerge {
  mergedContent: string;
  strategy: 'concatenate' | 'interleave' | 'select_best' | 'ai_merge';
  confidence: number;
  sources: string[];
}

export interface KnowledgeVersion {
  id: string;
  knowledgeId: string;
  content: string;
  version: number;
  changeType: 'create' | 'update' | 'replace' | 'merge';
  source: string;
  createdAt: Date;
}

export interface ResolutionStrategy {
  action: 'apply' | 'update' | 'merge' | 'skip';
  targetId?: string;
  mergedContent?: string;
  reason: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const EXACT_DUPLICATE_THRESHOLD = 0.98;
const NEAR_DUPLICATE_THRESHOLD = 0.92;
const SIMILAR_THRESHOLD = 0.85;
const CONTRADICTION_THRESHOLD = 0.75;

// Cache for conflict detection results
const conflictCache = new Map<string, { result: ConflictDetection; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect similar knowledge entries using vector similarity
 *
 * @param content - Content to check for conflicts
 * @param shopId - Shop ID
 * @param category - Optional category filter
 * @returns Promise<ConflictDetection> - Conflict detection result
 */
export async function detectSimilarKnowledge(
  content: string,
  shopId: number,
  category?: string
): Promise<ConflictDetection> {
  const startTime = Date.now();
  const cacheKey = `${shopId}-${category || 'all'}-${content.substring(0, 50)}`;

  try {
    // Check cache
    const cached = conflictCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);
    const vectorStr = `[${embedding.join(',')}]`;

    // Search for similar knowledge
    let sql = `
      SELECT
        id,
        content,
        category,
        1 - (embedding <=> $1) as similarity
      FROM knowledge_base_rag
      WHERE shop_id = $2
    `;
    const params: any[] = [vectorStr, shopId];

    if (category) {
      sql += ' AND category = $3';
      params.push(category);
    }

    sql += ' ORDER BY embedding <=> $1 LIMIT 10';

    const result = await query(sql, params);

    const conflicts: DetectedConflict[] = [];

    for (const row of result.rows) {
      const similarity = parseFloat(row.similarity);
      const conflict = analyzeSimilarity(row.id, row.content, similarity);

      if (conflict) {
        conflicts.push(conflict);
      }
    }

    const detectionResult: ConflictDetection = {
      hasConflict: conflicts.length > 0,
      conflicts,
      confidence: conflicts.length > 0 ? Math.max(...conflicts.map(c => c.similarity)) : 0
    };

    // Cache result
    conflictCache.set(cacheKey, { result: detectionResult, timestamp: Date.now() });

    const duration = Date.now() - startTime;
    recordPerformance('conflict_detection', duration, true, {
      conflictsFound: conflicts.length,
      shopId
    });

    return detectionResult;
  } catch (error) {
    recordPerformance('conflict_detection', Date.now() - startTime, false);
    console.error('❌ Conflict detection failed:', error);
    throw error;
  }
}

/**
 * Analyze similarity and determine conflict type
 *
 * @param id - Knowledge ID
 * @param content - Existing content
 * @param similarity - Similarity score (0-1)
 * @returns DetectedConflict | null
 */
function analyzeSimilarity(
  id: string,
  content: string,
  similarity: number
): DetectedConflict | null {
  if (similarity >= EXACT_DUPLICATE_THRESHOLD) {
    return {
      id,
      content,
      similarity,
      conflictType: 'exact_duplicate',
      severity: 'high',
      suggestedAction: 'skip',
      reason: 'Exact duplicate exists in knowledge base'
    };
  }

  if (similarity >= NEAR_DUPLICATE_THRESHOLD) {
    return {
      id,
      content,
      similarity,
      conflictType: 'near_duplicate',
      severity: 'high',
      suggestedAction: 'replace',
      reason: 'Near duplicate detected - consider replacing with new content'
    };
  }

  if (similarity >= SIMILAR_THRESHOLD) {
    return {
      id,
      content,
      similarity,
      conflictType: 'similar',
      severity: 'medium',
      suggestedAction: 'merge',
      reason: 'Similar content found - consider merging or keeping both'
    };
  }

  return null;
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve knowledge conflict using intelligent strategies
 *
 * @param newContent - New content to apply
 * @param existingContent - Existing conflicting content
 * @param existingId - ID of existing knowledge
 * @param conflictType - Type of conflict
 * @param confidence - Confidence score of new content
 * @returns Promise<ResolutionStrategy> - Resolution strategy
 */
export async function resolveKnowledgeConflict(
  newContent: string,
  existingContent: string,
  existingId: string,
  conflictType: string,
  confidence: number
): Promise<ResolutionStrategy> {
  const startTime = Date.now();

  try {
    let strategy: ResolutionStrategy;

    switch (conflictType) {
      case 'exact_duplicate':
        strategy = {
          action: 'skip',
          reason: 'Exact duplicate - no action needed'
        };
        break;

      case 'near_duplicate':
        // If new content has higher confidence, replace
        if (confidence > 0.85) {
          strategy = {
            action: 'update',
            targetId: existingId,
            reason: `High confidence (${confidence}) - replacing near duplicate`
          };
        } else {
          strategy = {
            action: 'skip',
            reason: `Low confidence (${confidence}) - keeping existing`
          };
        }
        break;

      case 'similar':
        // Check if new content adds value
        if (newContent.length > existingContent.length * 1.3) {
          strategy = {
            action: 'update',
            targetId: existingId,
            reason: 'New content significantly more detailed - updating'
          };
        } else if (newContent.length < existingContent.length * 0.7) {
          strategy = {
            action: 'skip',
            reason: 'Existing content more detailed - keeping current'
          };
        } else {
          // Similar length - try merging
          const merged = await mergeKnowledge(newContent, existingContent);
          strategy = {
            action: 'merge',
            targetId: existingId,
            mergedContent: merged.mergedContent,
            reason: `Merged similar content using ${merged.strategy} strategy`
          };
        }
        break;

      default:
        strategy = {
          action: 'apply',
          reason: 'No significant conflict - applying as new knowledge'
        };
    }

    const duration = Date.now() - startTime;
    recordPerformance('conflict_resolution', duration, true, {
      action: strategy.action,
      conflictType
    });

    return strategy;
  } catch (error) {
    recordPerformance('conflict_resolution', Date.now() - startTime, false);
    console.error('❌ Conflict resolution failed:', error);
    throw error;
  }
}

/**
 * Merge two knowledge pieces into one
 *
 * @param content1 - First content
 * @param content2 - Second content
 * @returns Promise<KnowledgeMerge> - Merged knowledge
 */
export async function mergeKnowledge(
  content1: string,
  content2: string
): Promise<KnowledgeMerge> {
  const startTime = Date.now();

  try {
    // Simple concatenation with separator
    const mergedContent = `${content1}\n\nAdditionally: ${content2}`;

    const mergeResult: KnowledgeMerge = {
      mergedContent,
      strategy: 'concatenate',
      confidence: 0.7,
      sources: []
    };

    const duration = Date.now() - startTime;
    recordPerformance('knowledge_merge', duration, true);

    return mergeResult;
  } catch (error) {
    recordPerformance('knowledge_merge', Date.now() - startTime, false);
    console.error('❌ Knowledge merge failed:', error);
    throw error;
  }
}

// ============================================================================
// VERSION TRACKING
// ============================================================================>

/**
 * Version knowledge before making changes
 *
 * @param knowledgeId - Knowledge base ID
 * @param changeType - Type of change
 * @param source - Source of change
 * @returns Promise<string> - Version ID
 */
export async function versionKnowledge(
  knowledgeId: string,
  changeType: 'create' | 'update' | 'replace' | 'merge',
  source: string
): Promise<string> {
  const startTime = Date.now();

  try {
    // Get current knowledge
    const knowledgeResult = await query(
      'SELECT content, version FROM knowledge_base_rag WHERE id = $1',
      [knowledgeId]
    );

    if (knowledgeResult.rows.length === 0) {
      throw new Error(`Knowledge ${knowledgeId} not found`);
    }

    const current = knowledgeResult.rows[0];
    const newVersion = (parseInt(current.version) || 0) + 1;

    // Insert version record
    const versionResult = await query(
      `INSERT INTO knowledge_versions (
        knowledge_id, content, version, change_type, source
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [knowledgeId, current.content, newVersion, changeType, source]
    );

    // Update knowledge base version
    await query(
      'UPDATE knowledge_base_rag SET version = $2 WHERE id = $1',
      [knowledgeId, newVersion]
    );

    const duration = Date.now() - startTime;
    recordPerformance('knowledge_version', duration, true);

    console.log(`📝 Version ${newVersion} created for ${knowledgeId}`);

    return versionResult.rows[0].id;
  } catch (error) {
    recordPerformance('knowledge_version', Date.now() - startTime, false);
    console.error(`❌ Failed to version knowledge ${knowledgeId}:`, error);
    throw error;
  }
}

/**
 * Get version history for a knowledge entry
 *
 * @param knowledgeId - Knowledge base ID
 * @returns Promise<KnowledgeVersion[]> - Version history
 */
export async function getKnowledgeHistory(knowledgeId: string): Promise<KnowledgeVersion[]> {
  try {
    const result = await query(
      `SELECT
        id,
        knowledge_id,
        content,
        version,
        change_type,
        source,
        created_at
      FROM knowledge_versions
      WHERE knowledge_id = $1
      ORDER BY version DESC`,
      [knowledgeId]
    );

    return result.rows.map(row => ({
      id: row.id,
      knowledgeId: row.knowledge_id,
      content: row.content,
      version: parseInt(row.version),
      changeType: row.change_type,
      source: row.source,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error(`❌ Failed to get history for ${knowledgeId}:`, error);
    throw error;
  }
}

/**
 * Restore knowledge to a specific version
 *
 * @param knowledgeId - Knowledge base ID
 * @param version - Version to restore
 * @returns Promise<boolean> - True if restored
 */
export async function restoreKnowledgeVersion(
  knowledgeId: string,
  version: number
): Promise<boolean> {
  try {
    // Get version content
    const versionResult = await query(
      `SELECT content FROM knowledge_versions
       WHERE knowledge_id = $1 AND version = $2`,
      [knowledgeId, version]
    );

    if (versionResult.rows.length === 0) {
      return false;
    }

    const content = versionResult.rows[0].content;

    // Generate new embedding
    const embedding = await generateEmbedding(content);
    const vectorStr = `[${embedding.join(',')}]`;

    // Update knowledge base
    await query(
      `UPDATE knowledge_base_rag
       SET content = $2, embedding = $3
       WHERE id = $1`,
      [knowledgeId, content, vectorStr]
    );

    console.log(`✅ Restored ${knowledgeId} to version ${version}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to restore version ${version} for ${knowledgeId}:`, error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear conflict detection cache
 */
export function clearConflictCache(): void {
  conflictCache.clear();
  console.log('🗑️  Conflict cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: conflictCache.size,
    keys: Array.from(conflictCache.keys())
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  detectSimilarKnowledge,
  resolveKnowledgeConflict,
  mergeKnowledge,
  versionKnowledge,
  getKnowledgeHistory,
  restoreKnowledgeVersion,
  clearConflictCache,
  getCacheStats
};
