/**
 * P1-2 Input Validation Module
 *
 * Critical security layer to prevent:
 * - Knowledge poisoning attacks
 * - SQL injection attacks
 * - XSS attacks
 * - Data integrity violations
 *
 * @author Security Engineer
 * @date 2026-02-09
 * @security P1-2 CRITICAL
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

export interface FeedbackInput {
  conversation_id: string;
  feedback_type: 'thumbs_up' | 'thumbs_down' | 'star_rating' | 'emoji';
  rating?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface CorrectionInput {
  conversation_id: string;
  original_response: string;
  corrected_answer: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  correction_context?: string;
  metadata?: Record<string, any>;
}

export interface LearningQueueInput {
  shop_id: number;
  source_type: 'feedback' | 'correction' | 'transcript' | 'manual';
  source_id?: string;
  proposed_content: string;
  category?: string;
  confidence_score?: number;
  metadata?: Record<string, any>;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
}

export interface AnalyticsInput {
  conversation_id: string;
  response_text: string;
  response_type: string;
  user_engagement_score?: number;
  led_to_conversion?: boolean;
  response_time_ms?: number;
  ab_test_variant?: string;
  metrics?: Record<string, any>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_FEEDBACK_TYPES = new Set(['thumbs_up', 'thumbs_down', 'star_rating', 'emoji']);
const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const VALID_SOURCE_TYPES = new Set(['feedback', 'correction', 'transcript', 'manual']);
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'applied']);
const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'negative', 'mixed']);

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /union\s+select/i,
  /union\s+all/i,
  /--|\/\*|\*\/|;/,
  /or\s+1\s*=\s*1/i,
  /and\s+1\s*=\s*1/i,
  /or\s+true/i,
  /and\s+true/i,
  /;\s*(select|insert|update|delete|drop|alter|create)/i,
  /0x[0-9a-f]+/i,
  /exec\s*\(/i,
  /execute\s*\(/i,
  /waitfor\s+delay/i,
  /\s+go\s*$/i,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*<\/script>/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /<iframe[^>]*>/i,
  /<(object|embed)[^>]*>/i,
  /<style[^>]*>.*expression.*<\/style>/i,
  /&#[0-9]+;/i,
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize text input by removing dangerous characters
 * @param text - Input text to sanitize
 * @returns Sanitized text
 */
export function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // Remove NULL bytes
  sanitized = sanitized.replace(/\x00/g, '');

  // Remove control characters except newlines, tabs, carriage returns
  sanitized = sanitized.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize unicode
  sanitized = sanitized.normalize('NFC');

  return sanitized;
}

/**
 * Detect SQL injection patterns in text
 * @param text - Text to check
 * @returns True if SQL injection detected
 */
export function detectSQLInjection(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect XSS patterns in text
 * @param text - Text to check
 * @returns True if XSS pattern detected
 */
export function detectXSS(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Length check
  if (email.length < 3 || email.length > 254) {
    return false;
  }

  // Format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 * @param id - UUID to validate
 * @returns True if valid UUID format
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // UUID v4 format: 8-4-4-4-12 hex digits
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

/**
 * Validate JSONB structure
 * @param data - Data to validate
 * @returns True if valid JSONB structure
 */
export function validateJSONBStructure(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check for dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype', 'eval', 'function', 'script'];
  for (const key of Object.keys(data)) {
    if (dangerousKeys.some(dangerous => key.toLowerCase().includes(dangerous))) {
      return false;
    }
  }

  // Size check (1MB max)
  const jsonString = JSON.stringify(data);
  if (jsonString.length > 1048576) {
    return false;
  }

  return true;
}

/**
 * Validate text length
 * @param text - Text to validate
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length
 * @returns True if length is valid
 */
export function validateLength(
  text: string | null | undefined,
  minLength: number = 1,
  maxLength: number
): boolean {
  if (text === null || text === undefined) {
    return false;
  }

  const trimmed = text.trim();
  return trimmed.length >= minLength && text.length <= maxLength;
}

/**
 * Validate number range
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if value is in range
 */
export function validateRange(value: number | null | undefined, min: number, max: number): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  return value >= min && value <= max;
}

// ============================================================================
// VALIDATION FUNCTIONS FOR EACH TABLE
// ============================================================================

/**
 * Validate conversation feedback input
 * @param input - Feedback input to validate
 * @returns Validation result with sanitized data
 */
export function validateFeedbackInput(input: FeedbackInput): ValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<FeedbackInput> = { ...input };

  // Validate conversation_id
  if (!sanitized.conversation_id || !isValidUUID(sanitized.conversation_id)) {
    errors.push('Invalid conversation_id format');
  }

  // Validate feedback_type
  if (!sanitized.feedback_type || !VALID_FEEDBACK_TYPES.has(sanitized.feedback_type)) {
    errors.push('Invalid feedback_type. Must be one of: thumbs_up, thumbs_down, star_rating, emoji');
  }

  // Validate rating
  if (sanitized.rating !== undefined) {
    if (!validateRange(sanitized.rating, 1, 5)) {
      errors.push('Rating must be between 1 and 5');
    }
  }

  // Validate and sanitize reason
  if (sanitized.reason !== undefined) {
    if (!validateLength(sanitized.reason, 1, 2000)) {
      errors.push('Reason must be between 1 and 2000 characters');
    } else {
      sanitized.reason = sanitizeInput(sanitized.reason);
      if (detectSQLInjection(sanitized.reason)) {
        errors.push('SQL injection pattern detected in reason');
      }
      if (detectXSS(sanitized.reason)) {
        errors.push('XSS pattern detected in reason');
      }
    }
  }

  // Validate metadata
  if (sanitized.metadata && !validateJSONBStructure(sanitized.metadata)) {
    errors.push('Invalid metadata structure');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate owner correction input
 * @param input - Correction input to validate
 * @returns Validation result with sanitized data
 */
export function validateCorrectionInput(input: CorrectionInput): ValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<CorrectionInput> = { ...input };

  // Validate conversation_id
  if (!sanitized.conversation_id || !isValidUUID(sanitized.conversation_id)) {
    errors.push('Invalid conversation_id format');
  }

  // Validate and sanitize original_response
  if (!sanitized.original_response || !validateLength(sanitized.original_response, 1, 10000)) {
    errors.push('Original response must be between 1 and 10000 characters');
  } else {
    sanitized.original_response = sanitizeInput(sanitized.original_response);
    if (detectSQLInjection(sanitized.original_response)) {
      errors.push('SQL injection pattern detected in original_response');
    }
    if (detectXSS(sanitized.original_response)) {
      errors.push('XSS pattern detected in original_response');
    }
  }

  // Validate and sanitize corrected_answer
  if (!sanitized.corrected_answer || !validateLength(sanitized.corrected_answer, 1, 10000)) {
    errors.push('Corrected answer must be between 1 and 10000 characters');
  } else {
    sanitized.corrected_answer = sanitizeInput(sanitized.corrected_answer);
    if (detectSQLInjection(sanitized.corrected_answer)) {
      errors.push('SQL injection pattern detected in corrected_answer');
    }
    if (detectXSS(sanitized.corrected_answer)) {
      errors.push('XSS pattern detected in corrected_answer');
    }
  }

  // Validate priority
  if (!sanitized.priority || !VALID_PRIORITIES.has(sanitized.priority)) {
    errors.push('Invalid priority. Must be one of: low, normal, high, urgent');
  }

  // Validate and sanitize correction_context
  if (sanitized.correction_context !== undefined) {
    if (!validateLength(sanitized.correction_context, 1, 2000)) {
      errors.push('Correction context must be between 1 and 2000 characters');
    } else {
      sanitized.correction_context = sanitizeInput(sanitized.correction_context);
      if (detectSQLInjection(sanitized.correction_context)) {
        errors.push('SQL injection pattern detected in correction_context');
      }
    }
  }

  // Validate metadata
  if (sanitized.metadata && !validateJSONBStructure(sanitized.metadata)) {
    errors.push('Invalid metadata structure');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate learning queue input
 * @param input - Learning queue input to validate
 * @returns Validation result with sanitized data
 */
export function validateLearningQueueInput(input: LearningQueueInput): ValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<LearningQueueInput> = { ...input };

  // Validate shop_id
  if (!sanitized.shop_id || typeof sanitized.shop_id !== 'number') {
    errors.push('Invalid shop_id');
  }

  // Validate source_type
  if (!sanitized.source_type || !VALID_SOURCE_TYPES.has(sanitized.source_type)) {
    errors.push('Invalid source_type. Must be one of: feedback, correction, transcript, manual');
  }

  // Validate source_id if provided
  if (sanitized.source_id && !isValidUUID(sanitized.source_id)) {
    errors.push('Invalid source_id format');
  }

  // Validate and sanitize proposed_content
  if (!sanitized.proposed_content || !validateLength(sanitized.proposed_content, 1, 10000)) {
    errors.push('Proposed content must be between 1 and 10000 characters');
  } else {
    sanitized.proposed_content = sanitizeInput(sanitized.proposed_content);
    if (detectSQLInjection(sanitized.proposed_content)) {
      errors.push('SQL injection pattern detected in proposed_content');
    }
    if (detectXSS(sanitized.proposed_content)) {
      errors.push('XSS pattern detected in proposed_content');
    }
  }

  // Validate and sanitize category
  if (sanitized.category !== undefined) {
    sanitized.category = sanitizeInput(sanitized.category);
    if (detectSQLInjection(sanitized.category)) {
      errors.push('SQL injection pattern detected in category');
    }
  }

  // Validate confidence_score
  if (sanitized.confidence_score !== undefined) {
    if (!validateRange(sanitized.confidence_score, 0, 100)) {
      errors.push('Confidence score must be between 0 and 100');
    }
  }

  // Validate status
  if (sanitized.status && !VALID_STATUSES.has(sanitized.status)) {
    errors.push('Invalid status. Must be one of: pending, approved, rejected, applied');
  }

  // Validate metadata
  if (sanitized.metadata && !validateJSONBStructure(sanitized.metadata)) {
    errors.push('Invalid metadata structure');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate analytics input
 * @param input - Analytics input to validate
 * @returns Validation result with sanitized data
 */
export function validateAnalyticsInput(input: AnalyticsInput): ValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<AnalyticsInput> = { ...input };

  // Validate conversation_id
  if (!sanitized.conversation_id || !isValidUUID(sanitized.conversation_id)) {
    errors.push('Invalid conversation_id format');
  }

  // Validate and sanitize response_text
  if (!sanitized.response_text) {
    errors.push('Response text is required');
  } else {
    sanitized.response_text = sanitizeInput(sanitized.response_text);
    if (detectSQLInjection(sanitized.response_text)) {
      errors.push('SQL injection pattern detected in response_text');
    }
    if (detectXSS(sanitized.response_text)) {
      errors.push('XSS pattern detected in response_text');
    }
  }

  // Validate and sanitize response_type
  if (!sanitized.response_type) {
    errors.push('Response type is required');
  } else {
    sanitized.response_type = sanitizeInput(sanitized.response_type);
    if (detectSQLInjection(sanitized.response_type)) {
      errors.push('SQL injection pattern detected in response_type');
    }
  }

  // Validate user_engagement_score
  if (sanitized.user_engagement_score !== undefined) {
    if (!validateRange(sanitized.user_engagement_score, 0, 100)) {
      errors.push('Engagement score must be between 0 and 100');
    }
  }

  // Validate response_time_ms
  if (sanitized.response_time_ms !== undefined) {
    if (typeof sanitized.response_time_ms !== 'number' || sanitized.response_time_ms < 0) {
      errors.push('Response time must be a positive number');
    }
  }

  // Validate and sanitize ab_test_variant
  if (sanitized.ab_test_variant !== undefined) {
    sanitized.ab_test_variant = sanitizeInput(sanitized.ab_test_variant);
  }

  // Validate metrics
  if (sanitized.metrics && !validateJSONBStructure(sanitized.metrics)) {
    errors.push('Invalid metrics structure');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate transcript input
 * @param input - Transcript input to validate
 * @returns Validation result with sanitized data
 */
export function validateTranscriptInput(input: {
  conversation_id?: string;
  transcript: string;
  processed_summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  entities?: any;
  learning_insights?: any;
  metadata?: any;
}): ValidationResult {
  const errors: string[] = [];
  const sanitized = { ...input };

  // Validate conversation_id if provided
  if (sanitized.conversation_id && !isValidUUID(sanitized.conversation_id)) {
    errors.push('Invalid conversation_id format');
  }

  // Validate and sanitize transcript
  if (!sanitized.transcript || !validateLength(sanitized.transcript, 1, 50000)) {
    errors.push('Transcript must be between 1 and 50000 characters');
  } else {
    sanitized.transcript = sanitizeInput(sanitized.transcript);
    if (detectSQLInjection(sanitized.transcript)) {
      errors.push('SQL injection pattern detected in transcript');
    }
    if (detectXSS(sanitized.transcript)) {
      errors.push('XSS pattern detected in transcript');
    }
  }

  // Validate and sanitize processed_summary
  if (sanitized.processed_summary !== undefined) {
    sanitized.processed_summary = sanitizeInput(sanitized.processed_summary);
    if (detectSQLInjection(sanitized.processed_summary)) {
      errors.push('SQL injection pattern detected in processed_summary');
    }
  }

  // Validate sentiment
  if (sanitized.sentiment && !VALID_SENTIMENTS.has(sanitized.sentiment)) {
    errors.push('Invalid sentiment. Must be one of: positive, neutral, negative, mixed');
  }

  // Validate entities
  if (sanitized.entities && !validateJSONBStructure(sanitized.entities)) {
    errors.push('Invalid entities structure');
  }

  // Validate learning_insights
  if (sanitized.learning_insights && !validateJSONBStructure(sanitized.learning_insights)) {
    errors.push('Invalid learning_insights structure');
  }

  // Validate metadata
  if (sanitized.metadata && !validateJSONBStructure(sanitized.metadata)) {
    errors.push('Invalid metadata structure');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  sanitizeInput,
  detectSQLInjection,
  detectXSS,
  isValidEmail,
  isValidUUID,
  validateJSONBStructure,
  validateLength,
  validateRange,
  validateFeedbackInput,
  validateCorrectionInput,
  validateLearningQueueInput,
  validateAnalyticsInput,
  validateTranscriptInput,
};
