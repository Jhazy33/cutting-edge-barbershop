/**
 * Feedback Service
 *
 * Handles user feedback, owner corrections, voice transcripts,
 * and learning queue management for the continuous learning system.
 */

import { query } from '../utils/db.js';

// ============================================================================
// TYPES
// ============================================================================

interface ConversationFeedback {
  conversationId: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'star_rating' | 'emoji';
  rating?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

interface OwnerCorrection {
  conversationId: string;
  originalResponse: string;
  correctedAnswer: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  correctionContext?: string;
  metadata?: Record<string, any>;
}

interface VoiceTranscript {
  conversationId?: string;
  transcript: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  entities?: Array<Record<string, any>>;
  learningInsights?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface LearningQueueQuery {
  shopId?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
}

interface CorrectionApproval {
  learningQueueId: string;
  reviewedBy: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate conversation feedback input
 */
function validateConversationFeedback(data: ConversationFeedback): { valid: boolean; error?: string } {
  if (!data.conversationId || typeof data.conversationId !== 'string') {
    return { valid: false, error: 'conversationId is required and must be a string' };
  }

  if (!isValidUUID(data.conversationId)) {
    return { valid: false, error: 'conversationId must be a valid UUID' };
  }

  if (!data.feedbackType || typeof data.feedbackType !== 'string') {
    return { valid: false, error: 'feedbackType is required' };
  }

  const validFeedbackTypes = ['thumbs_up', 'thumbs_down', 'star_rating', 'emoji'];
  if (!validFeedbackTypes.includes(data.feedbackType)) {
    return { valid: false, error: `feedbackType must be one of: ${validFeedbackTypes.join(', ')}` };
  }

  if (data.rating !== undefined) {
    if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
      return { valid: false, error: 'rating must be a number between 1 and 5' };
    }
  }

  if (data.reason && typeof data.reason !== 'string') {
    return { valid: false, error: 'reason must be a string' };
  }

  if (data.reason && data.reason.length > 1000) {
    return { valid: false, error: 'reason must be less than 1000 characters' };
  }

  return { valid: true };
}

/**
 * Validate owner correction input
 */
function validateOwnerCorrection(data: OwnerCorrection): { valid: boolean; error?: string } {
  if (!data.conversationId || typeof data.conversationId !== 'string') {
    return { valid: false, error: 'conversationId is required and must be a string' };
  }

  if (!isValidUUID(data.conversationId)) {
    return { valid: false, error: 'conversationId must be a valid UUID' };
  }

  if (!data.originalResponse || typeof data.originalResponse !== 'string') {
    return { valid: false, error: 'originalResponse is required' };
  }

  if (data.originalResponse.trim().length < 10) {
    return { valid: false, error: 'originalResponse must be at least 10 characters' };
  }

  if (data.originalResponse.length > 10000) {
    return { valid: false, error: 'originalResponse must be less than 10000 characters' };
  }

  if (!data.correctedAnswer || typeof data.correctedAnswer !== 'string') {
    return { valid: false, error: 'correctedAnswer is required' };
  }

  if (data.correctedAnswer.trim().length < 10) {
    return { valid: false, error: 'correctedAnswer must be at least 10 characters' };
  }

  if (data.correctedAnswer.length > 10000) {
    return { valid: false, error: 'correctedAnswer must be less than 10000 characters' };
  }

  if (data.priority) {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(data.priority)) {
      return { valid: false, error: `priority must be one of: ${validPriorities.join(', ')}` };
    }
  }

  if (data.correctionContext && typeof data.correctionContext !== 'string') {
    return { valid: false, error: 'correctionContext must be a string' };
  }

  if (data.correctionContext && data.correctionContext.length > 5000) {
    return { valid: false, error: 'correctionContext must be less than 5000 characters' };
  }

  return { valid: true };
}

/**
 * Validate voice transcript input
 */
function validateVoiceTranscript(data: VoiceTranscript): { valid: boolean; error?: string } {
  if (data.conversationId && !isValidUUID(data.conversationId)) {
    return { valid: false, error: 'conversationId must be a valid UUID' };
  }

  if (!data.transcript || typeof data.transcript !== 'string') {
    return { valid: false, error: 'transcript is required' };
  }

  if (data.transcript.trim().length < 10) {
    return { valid: false, error: 'transcript must be at least 10 characters' };
  }

  if (data.transcript.length > 50000) {
    return { valid: false, error: 'transcript must be less than 50000 characters' };
  }

  if (!data.sentiment || typeof data.sentiment !== 'string') {
    return { valid: false, error: 'sentiment is required' };
  }

  const validSentiments = ['positive', 'neutral', 'negative', 'mixed'];
  if (!validSentiments.includes(data.sentiment)) {
    return { valid: false, error: `sentiment must be one of: ${validSentiments.join(', ')}` };
  }

  if (data.entities && !Array.isArray(data.entities)) {
    return { valid: false, error: 'entities must be an array' };
  }

  return { valid: true };
}

/**
 * Validate learning queue query parameters
 */
function validateLearningQueueQuery(params: LearningQueueQuery): { valid: boolean; error?: string } {
  if (params.shopId !== undefined) {
    if (typeof params.shopId !== 'number' || params.shopId <= 0) {
      return { valid: false, error: 'shopId must be a positive number' };
    }
  }

  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 1000) {
      return { valid: false, error: 'limit must be between 1 and 1000' };
    }
  }

  if (params.status) {
    const validStatuses = ['pending', 'approved', 'rejected', 'applied'];
    if (!validStatuses.includes(params.status)) {
      return { valid: false, error: `status must be one of: ${validStatuses.join(', ')}` };
    }
  }

  return { valid: true };
}

/**
 * Validate correction approval input
 */
function validateCorrectionApproval(data: CorrectionApproval): { valid: boolean; error?: string } {
  if (!data.learningQueueId || typeof data.learningQueueId !== 'string') {
    return { valid: false, error: 'learningQueueId is required and must be a string' };
  }

  if (!isValidUUID(data.learningQueueId)) {
    return { valid: false, error: 'learningQueueId must be a valid UUID' };
  }

  if (!data.reviewedBy || typeof data.reviewedBy !== 'string') {
    return { valid: false, error: 'reviewedBy is required' };
  }

  if (data.reviewedBy.trim().length < 1) {
    return { valid: false, error: 'reviewedBy must not be empty' };
  }

  if (data.reviewedBy.length > 255) {
    return { valid: false, error: 'reviewedBy must be less than 255 characters' };
  }

  return { valid: true };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Submit conversation feedback (thumbs up/down, rating)
 *
 * This inserts into conversation_feedback table.
 * Database trigger will auto-create learning_queue entry for negative feedback.
 */
export async function submitConversationFeedback(data: ConversationFeedback): Promise<{
  success: boolean;
  feedbackId?: string;
  autoCreatedLearningItem?: boolean;
  error?: string;
}> {
  try {
    // Validate input
    const validation = validateConversationFeedback(data);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if conversation exists
    const conversationCheck = await query(
      'SELECT id FROM conversations WHERE id = $1',
      [data.conversationId]
    );

    if (conversationCheck.rows.length === 0) {
      return { success: false, error: 'Conversation not found' };
    }

    // Insert feedback
    const insertResult = await query(
      `INSERT INTO conversation_feedback (conversation_id, feedback_type, rating, reason, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.conversationId,
        data.feedbackType,
        data.rating || null,
        data.reason || null,
        JSON.stringify(data.metadata || {})
      ]
    );

    const feedbackId = insertResult.rows[0].id;

    // Check if learning queue item was auto-created by trigger
    // (happens for thumbs_down or low ratings)
    const autoCreatedLearningItem =
      data.feedbackType === 'thumbs_down' ||
      (data.rating !== undefined && data.rating <= 2);

    console.log(`✅ Feedback submitted: ${feedbackId} (type: ${data.feedbackType})`);

    return {
      success: true,
      feedbackId,
      autoCreatedLearningItem
    };
  } catch (error) {
    console.error('❌ Failed to submit conversation feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Submit owner correction
 *
 * This inserts into owner_corrections table.
 * Database trigger will auto-create learning_queue entry.
 */
export async function submitOwnerCorrection(data: OwnerCorrection): Promise<{
  success: boolean;
  correctionId?: string;
  autoCreatedLearningItem?: boolean;
  learningQueueId?: string;
  error?: string;
}> {
  try {
    // Validate input
    const validation = validateOwnerCorrection(data);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if conversation exists
    const conversationCheck = await query(
      'SELECT id FROM conversations WHERE id = $1',
      [data.conversationId]
    );

    if (conversationCheck.rows.length === 0) {
      return { success: false, error: 'Conversation not found' };
    }

    // Insert correction
    const insertResult = await query(
      `INSERT INTO owner_corrections (
        conversation_id, original_response, corrected_answer,
        priority, correction_context, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        data.conversationId,
        data.originalResponse,
        data.correctedAnswer,
        data.priority || 'normal',
        data.correctionContext || null,
        JSON.stringify(data.metadata || {})
      ]
    );

    const correctionId = insertResult.rows[0].id;

    // Get the auto-created learning queue item from trigger
    const learningQueueResult = await query(
      `SELECT id FROM learning_queue
       WHERE source_type = 'correction'
       AND source_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [correctionId]
    );

    const learningQueueId = learningQueueResult.rows[0]?.id;

    console.log(`✅ Owner correction submitted: ${correctionId} (priority: ${data.priority || 'normal'})`);

    return {
      success: true,
      correctionId,
      autoCreatedLearningItem: true,
      learningQueueId
    };
  } catch (error) {
    console.error('❌ Failed to submit owner correction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Submit voice transcript with sentiment analysis
 */
export async function submitVoiceTranscript(data: VoiceTranscript): Promise<{
  success: boolean;
  transcriptId?: string;
  error?: string;
}> {
  try {
    // Validate input
    const validation = validateVoiceTranscript(data);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // If conversationId provided, check if it exists
    if (data.conversationId) {
      const conversationCheck = await query(
        'SELECT id FROM conversations WHERE id = $1',
        [data.conversationId]
      );

      if (conversationCheck.rows.length === 0) {
        return { success: false, error: 'Conversation not found' };
      }
    }

    // Insert transcript
    const insertResult = await query(
      `INSERT INTO voice_transcripts (
        conversation_id, transcript, sentiment, entities, learning_insights, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        data.conversationId || null,
        data.transcript,
        data.sentiment,
        JSON.stringify(data.entities || []),
        JSON.stringify(data.learningInsights || {}),
        JSON.stringify(data.metadata || {})
      ]
    );

    const transcriptId = insertResult.rows[0].id;

    console.log(`✅ Voice transcript submitted: ${transcriptId} (sentiment: ${data.sentiment})`);

    return {
      success: true,
      transcriptId
    };
  } catch (error) {
    console.error('❌ Failed to submit voice transcript:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get pending corrections from learning queue
 */
export async function getPendingCorrections(queryParams: LearningQueueQuery): Promise<{
  success: boolean;
  items?: Array<{
    id: string;
    status: string;
    sourceType: string;
    sourceId: string;
    shopId: number;
    proposedContent: string;
    category: string;
    confidenceScore: number;
    metadata: Record<string, any>;
    createdAt: Date;
  }>;
  count?: number;
  error?: string;
}> {
  try {
    // Validate query parameters
    const validation = validateLearningQueueQuery(queryParams);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { shopId, limit = 50, status = 'pending' } = queryParams;

    // Build query dynamically
    let sql = `
      SELECT
        id, status, source_type, source_id, shop_id,
        proposed_content, category, confidence_score, metadata, created_at
      FROM learning_queue
      WHERE status = $1
    `;
    const params: any[] = [status];
    let paramIndex = 2;

    if (shopId) {
      sql += ` AND shop_id = $${paramIndex}`;
      params.push(shopId);
      paramIndex++;
    }

    sql += ` ORDER BY created_at ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);

    console.log(`✅ Retrieved ${result.rows.length} pending corrections`);

    return {
      success: true,
      items: result.rows.map(row => ({
        id: row.id,
        status: row.status,
        sourceType: row.source_type,
        sourceId: row.source_id,
        shopId: row.shop_id,
        proposedContent: row.proposed_content,
        category: row.category,
        confidenceScore: row.confidence_score,
        metadata: row.metadata,
        createdAt: row.created_at
      })),
      count: result.rows.length
    };
  } catch (error) {
    console.error('❌ Failed to get pending corrections:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Approve a correction from learning queue
 */
export async function approveCorrection(data: CorrectionApproval): Promise<{
  success: boolean;
  learningQueueId?: string;
  previousStatus?: string;
  newStatus?: string;
  error?: string;
}> {
  try {
    // Validate input
    const validation = validateCorrectionApproval(data);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if learning queue item exists
    const checkResult = await query(
      `SELECT id, status FROM learning_queue WHERE id = $1`,
      [data.learningQueueId]
    );

    if (checkResult.rows.length === 0) {
      return { success: false, error: 'Learning queue item not found' };
    }

    const previousStatus = checkResult.rows[0].status;

    // Update status to approved
    const updateResult = await query(
      `UPDATE learning_queue
       SET status = 'approved',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $2::uuid
       WHERE id = $1
       RETURNING id, status`,
      [data.learningQueueId, data.reviewedBy]
    );

    console.log(`✅ Correction approved: ${data.learningQueueId} by ${data.reviewedBy}`);

    return {
      success: true,
      learningQueueId: updateResult.rows[0].id,
      previousStatus,
      newStatus: 'approved'
    };
  } catch (error) {
    console.error('❌ Failed to approve correction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
