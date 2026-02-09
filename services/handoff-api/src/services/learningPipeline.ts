/**
 * Learning Pipeline Service
 *
 * Manages the end-to-end learning pipeline for processing pending learning items,
 * applying knowledge updates to the knowledge base, and handling conflicts.
 *
 * Features:
 * - Batch process pending learning items
 * - Approve/reject learning items with reasons
 * - Conflict detection and resolution
 * - Knowledge base updates with embeddings
 * - Pipeline metrics and statistics
 * - Retry logic for failed operations
 */

import { query, getClient } from '../utils/db.js';
import { generateEmbedding } from './memoryService.js';
import { recordPerformance } from './performanceMonitor.js';

// ============================================================================
// TYPES
// ============================================================================

export interface LearningQueueItem {
  id: string;
  shopId: number;
  sourceType: 'correction' | 'feedback' | 'conversation';
  sourceId: string;
  proposedContent: string;
  category: string;
  confidenceScore: number;
  metadata: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt: Date;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  applied: number;
  conflicts: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
  duration: number;
}

export interface ConflictInfo {
  existingId: string;
  existingContent: string;
  similarity: number;
  conflictType: 'duplicate' | 'similar' | 'contradictory';
  suggestedAction: 'replace' | 'merge' | 'keep_both';
}

export interface PipelineMetrics {
  pendingItems: number;
  approvedItems: number;
  appliedToday: number;
  avgProcessingTime: number;
  conflictRate: number;
  topCategories: Array<{ category: string; count: number }>;
}

export interface ApprovalResult {
  success: boolean;
  learningQueueId?: string;
  applied?: boolean;
  conflictDetected?: boolean;
  conflictInfo?: ConflictInfo;
  error?: string;
}

export interface RejectionResult {
  success: boolean;
  learningQueueId?: string;
  reason?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const CONFLICT_THRESHOLD = 0.85; // Similarity threshold for conflict detection
const DUPLICATE_THRESHOLD = 0.95; // Similarity threshold for duplicates

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process pending learning items in batch
 *
 * @param batchSize - Number of items to process (default: 20)
 * @returns Promise<ProcessingResult> - Processing statistics
 */
export async function processPendingLearning(batchSize: number = BATCH_SIZE): Promise<ProcessingResult> {
  const startTime = Date.now();
  const result: ProcessingResult = {
    success: true,
    processed: 0,
    applied: 0,
    conflicts: 0,
    failed: 0,
    errors: [],
    duration: 0
  };

  try {
    console.log(`🚀 Starting batch processing (max ${batchSize} items)...`);

    // Get pending items ordered by priority (confidence_score) and age
    const pendingResult = await query<LearningQueueItem>(
      `SELECT id, shop_id, source_type, source_id, proposed_content, category, confidence_score, metadata, status, created_at
       FROM learning_queue
       WHERE status = 'pending'
       ORDER BY confidence_score DESC, created_at ASC
       LIMIT $1`,
      [batchSize]
    );

    if (pendingResult.rows.length === 0) {
      console.log('ℹ️  No pending items to process');
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(`📦 Processing ${pendingResult.rows.length} items...`);

    // Process each item
    for (const item of pendingResult.rows) {
      result.processed++;

      try {
        // Check for conflicts
        const conflicts = await checkForConflicts(item);

        if (conflicts.length > 0) {
          result.conflicts++;

          // Auto-resolve based on confidence and similarity
          const resolution = await resolveConflict(item, conflicts[0]);

          if (resolution.action === 'apply') {
            await applyLearningItem(item);
            result.applied++;
          } else if (resolution.action === 'skip') {
            console.log(`⏭️  Skipping item ${item.id} due to conflict`);
          }
        } else {
          // No conflicts, apply directly
          await applyLearningItem(item);
          result.applied++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`❌ Failed to process item ${item.id}:`, error);
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.failed === 0;

    console.log(`✅ Batch processing complete: ${result.applied}/${result.processed} applied (${result.duration}ms)`);

    // Record performance
    recordPerformance('learning_batch_process', result.duration, result.success, {
      batchSize: result.processed,
      applied: result.applied,
      conflicts: result.conflicts,
      failed: result.failed
    });

    return result;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.success = false;
    console.error('❌ Batch processing failed:', error);
    throw error;
  }
}

/**
 * Approve and apply a learning item
 *
 * @param learningQueueId - Learning queue item ID
 * @param forceApply - Force apply even if conflicts exist
 * @returns Promise<ApprovalResult> - Approval result
 */
export async function approveLearningItem(
  learningQueueId: string,
  forceApply: boolean = false
): Promise<ApprovalResult> {
  try {
    // Validate input
    if (!learningQueueId || typeof learningQueueId !== 'string') {
      return { success: false, error: 'Invalid learning queue ID' };
    }

    // Get learning item
    const itemResult = await query<LearningQueueItem>(
      'SELECT * FROM learning_queue WHERE id = $1',
      [learningQueueId]
    );

    if (itemResult.rows.length === 0) {
      return { success: false, error: 'Learning item not found' };
    }

    const item = itemResult.rows[0];

    // Check for conflicts
    const conflicts = await checkForConflicts(item);

    if (conflicts.length > 0 && !forceApply) {
      return {
        success: true,
        learningQueueId: item.id,
        applied: false,
        conflictDetected: true,
        conflictInfo: conflicts[0]
      };
    }

    // Apply the learning item
    await applyLearningItem(item);

    return {
      success: true,
      learningQueueId: item.id,
      applied: true,
      conflictDetected: conflicts.length > 0
    };
  } catch (error) {
    console.error(`❌ Failed to approve learning item ${learningQueueId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reject a learning item with reason
 *
 * @param learningQueueId - Learning queue item ID
 * @param reason - Rejection reason
 * @returns Promise<RejectionResult> - Rejection result
 */
export async function rejectLearningItem(
  learningQueueId: string,
  reason: string
): Promise<RejectionResult> {
  try {
    // Validate input
    if (!learningQueueId || typeof learningQueueId !== 'string') {
      return { success: false, error: 'Invalid learning queue ID' };
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return { success: false, error: 'Rejection reason is required' };
    }

    // Update status to rejected
    await query(
      `UPDATE learning_queue
       SET status = 'rejected',
           rejection_reason = $2,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [learningQueueId, reason.trim()]
    );

    console.log(`❌ Learning item rejected: ${learningQueueId} - ${reason}`);

    return {
      success: true,
      learningQueueId,
      reason: reason.trim()
    };
  } catch (error) {
    console.error(`❌ Failed to reject learning item ${learningQueueId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Check for conflicts with existing knowledge
 *
 * @param item - Learning queue item
 * @returns Promise<ConflictInfo[]> - Array of conflicts found
 */
export async function checkForConflicts(item: LearningQueueItem): Promise<ConflictInfo[]> {
  try {
    const startTime = Date.now();

    // Generate embedding for proposed content
    const embedding = await generateEmbedding(item.proposedContent);
    const vectorStr = `[${embedding.join(',')}]`;

    // Search for similar existing knowledge
    const similarResult = await query(
      `SELECT
        id,
        content,
        1 - (embedding <=> $1) as similarity
       FROM knowledge_base_rag
       WHERE shop_id = $2
       ORDER BY embedding <=> $1
       LIMIT 5`,
      [vectorStr, item.shopId]
    );

    const conflicts: ConflictInfo[] = [];

    for (const row of similarResult.rows) {
      const similarity = parseFloat(row.similarity);

      if (similarity >= DUPLICATE_THRESHOLD) {
        conflicts.push({
          existingId: row.id,
          existingContent: row.content,
          similarity,
          conflictType: 'duplicate',
          suggestedAction: 'replace'
        });
      } else if (similarity >= CONFLICT_THRESHOLD) {
        conflicts.push({
          existingId: row.id,
          existingContent: row.content,
          similarity,
          conflictType: 'similar',
          suggestedAction: 'merge'
        });
      }
    }

    const duration = Date.now() - startTime;
    recordPerformance('conflict_check', duration, true, {
      conflictsFound: conflicts.length
    });

    return conflicts;
  } catch (error) {
    console.error('❌ Conflict check failed:', error);
    throw error;
  }
}

// ============================================================================
// KNOWLEDGE APPLICATION
// ============================================================================

/**
 * Apply learning item to knowledge base
 *
 * @param item - Learning queue item to apply
 * @returns Promise<void>
 */
async function applyLearningItem(item: LearningQueueItem): Promise<void> {
  const startTime = Date.now();
  let success = false;

  try {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Generate embedding
      const embedding = await generateEmbedding(item.proposedContent);
      const vectorStr = `[${embedding.join(',')}]`;

      // Insert into knowledge base
      const insertResult = await client.query(
        `INSERT INTO knowledge_base_rag (
          shop_id, content, category, source, embedding, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          item.shopId,
          item.proposedContent,
          item.category,
          `learning_${item.sourceType}`,
          vectorStr,
          JSON.stringify({
            ...item.metadata,
            sourceId: item.sourceId,
            learningQueueId: item.id,
            confidenceScore: item.confidenceScore,
            appliedAt: new Date().toISOString()
          })
        ]
      );

      // Update learning queue status
      await client.query(
        `UPDATE learning_queue
         SET status = 'applied',
             applied_at = CURRENT_TIMESTAMP,
             knowledge_base_id = $2
         WHERE id = $1`,
        [item.id, insertResult.rows[0].id]
      );

      await client.query('COMMIT');

      success = true;
      const duration = Date.now() - startTime;

      recordPerformance('learning_apply', duration, true);

      console.log(`✅ Learning applied: ${item.id} -> ${insertResult.rows[0].id} (${duration}ms)`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    recordPerformance('learning_apply', duration, false);
    console.error(`❌ Failed to apply learning item ${item.id}:`, error);
    throw error;
  }
}

/**
 * Update existing knowledge in the knowledge base
 *
 * @param knowledgeId - Knowledge base entry ID
 * @param newContent - New content
 * @param item - Learning queue item
 * @returns Promise<void>
 */
async function updateKnowledge(
  knowledgeId: string,
  newContent: string,
  item: LearningQueueItem
): Promise<void> {
  const startTime = Date.now();
  let success = false;

  try {
    // Generate new embedding
    const embedding = await generateEmbedding(newContent);
    const vectorStr = `[${embedding.join(',')}]`;

    // Update knowledge base
    await query(
      `UPDATE knowledge_base_rag
       SET content = $2,
           embedding = $3,
           metadata = jsonb_set(
             metadata,
             '{lastUpdated}',
             $4
           )
       WHERE id = $1`,
      [
        knowledgeId,
        newContent,
        vectorStr,
        JSON.stringify(new Date().toISOString())
      ]
    );

    // Update learning queue status
    await query(
      `UPDATE learning_queue
       SET status = 'applied',
           applied_at = CURRENT_TIMESTAMP,
           knowledge_base_id = $2
       WHERE id = $1`,
      [item.id, knowledgeId]
    );

    success = true;
    const duration = Date.now() - startTime;

    recordPerformance('knowledge_update', duration, true);

    console.log(`✅ Knowledge updated: ${knowledgeId} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordPerformance('knowledge_update', duration, false);
    console.error(`❌ Failed to update knowledge ${knowledgeId}:`, error);
    throw error;
  }
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve conflict between learning item and existing knowledge
 *
 * @param item - Learning queue item
 * @param conflict - Conflict information
 * @returns Promise<{ action: 'apply' | 'skip' | 'update', reason: string }>
 */
async function resolveConflict(
  item: LearningQueueItem,
  conflict: ConflictInfo
): Promise<{ action: 'apply' | 'skip' | 'update'; reason: string }> {
  try {
    // High confidence duplicate - replace existing
    if (conflict.conflictType === 'duplicate' && item.confidenceScore > 0.9) {
      await updateKnowledge(conflict.existingId, item.proposedContent, item);
      return {
        action: 'update',
        reason: `High confidence duplicate (${item.confidenceScore}) - replaced existing knowledge`
      };
    }

    // Similar content - check if we should merge
    if (conflict.conflictType === 'similar') {
      // If new content is more detailed, update
      if (item.proposedContent.length > conflict.existingContent.length * 1.2) {
        await updateKnowledge(conflict.existingId, item.proposedContent, item);
        return {
          action: 'update',
          reason: 'New content is more detailed - updated existing knowledge'
        };
      }

      // Otherwise skip to avoid losing existing knowledge
      return {
        action: 'skip',
        reason: 'Similar content exists - keeping existing knowledge'
      };
    }

    // Default: apply as new entry
    return {
      action: 'apply',
      reason: 'No significant conflict - applying as new knowledge'
    };
  } catch (error) {
    console.error('❌ Conflict resolution failed:', error);
    return {
      action: 'skip',
      reason: 'Conflict resolution error - skipping item'
    };
  }
}

// ============================================================================
// METRICS
// ============================================================================

/**
 * Get pipeline metrics and statistics
 *
 * @param shopId - Optional shop ID filter
 * @returns Promise<PipelineMetrics> - Pipeline metrics
 */
export async function getLearningMetrics(shopId?: number): Promise<PipelineMetrics> {
  try {
    let sql = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_items,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_items,
        COUNT(*) FILTER (WHERE status = 'applied' AND DATE(applied_at) = CURRENT_DATE) as applied_today
      FROM learning_queue
    `;
    const params: any[] = [];

    if (shopId) {
      sql += ' WHERE shop_id = $1';
      params.push(shopId);
    }

    const statsResult = await query(sql, params);
    const stats = statsResult.rows[0];

    // Get average processing time
    const perfResult = await query(
      `SELECT AVG(duration) as avg_time
       FROM performance_metrics
       WHERE operation_name = 'learning_apply'
         AND created_at > NOW() - INTERVAL '24 hours'
         AND success = true`
    );

    // Calculate conflict rate
    const conflictResult = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE metadata->>'conflicts' IS NOT NULL AND (metadata->>'conflicts')::int > 0) as with_conflicts
       FROM performance_metrics
       WHERE operation_name = 'learning_batch_process'
         AND created_at > NOW() - INTERVAL '7 days'`
    );

    const conflictRate =
      conflictResult.rows[0].total > 0
        ? (conflictResult.rows[0].with_conflicts / conflictResult.rows[0].total) * 100
        : 0;

    // Get top categories
    const categoryResult = await query(
      `SELECT category, COUNT(*) as count
       FROM learning_queue
       WHERE status IN ('applied', 'approved')
       ${shopId ? 'AND shop_id = $1' : ''}
       GROUP BY category
       ORDER BY count DESC
       LIMIT 5`
    );

    const metrics: PipelineMetrics = {
      pendingItems: parseInt(stats.pending_items) || 0,
      approvedItems: parseInt(stats.approved_items) || 0,
      appliedToday: parseInt(stats.applied_today) || 0,
      avgProcessingTime: parseFloat(perfResult.rows[0].avg_time) || 0,
      conflictRate: Math.round(conflictRate * 100) / 100,
      topCategories: categoryResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count)
      }))
    };

    return metrics;
  } catch (error) {
    console.error('❌ Failed to get learning metrics:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  processPendingLearning,
  approveLearningItem,
  rejectLearningItem,
  checkForConflicts,
  getLearningMetrics
};
