/**
 * Test Data Fixtures for Feedback API Tests
 *
 * Provides realistic test data for all feedback endpoints
 */

// ============================================================================
// CONVERSATION DATA
// ============================================================================

export const validConversationIds = [
  'conv_1234567890',
  'conv_9876543210',
  'conv_abc123def456',
  'conv_test_20250209',
];

export const invalidConversationIds = [
  '',
  null,
  undefined,
  'too-short',
  12345,
  'conv_"_or_"_drop_table',
  "conv_'; DROP TABLE conversations;--",
];

// ============================================================================
// FEEDBACK RATING DATA
// ============================================================================

export const validThumbsUpFeedback = {
  conversationId: 'conv_1234567890',
  shopId: 1,
  feedbackType: 'thumbs_up',
  metadata: { source: 'web', userAgent: 'test-agent' },
};

export const validThumbsDownFeedback = {
  conversationId: 'conv_9876543210',
  shopId: 1,
  feedbackType: 'thumbs_down',
  metadata: { source: 'mobile', reason: 'incorrect_info' },
};

export const validStarRatingFeedback = {
  conversationId: 'conv_abc123def456',
  shopId: 2,
  feedbackType: 'star_rating',
  rating: 4,
  metadata: { category: 'pricing' },
};

export const invalidFeedbackData = {
  missingConversationId: {
    shopId: 1,
    feedbackType: 'thumbs_up',
  },
  missingShopId: {
    conversationId: 'conv_1234567890',
    feedbackType: 'thumbs_up',
  },
  invalidFeedbackType: {
    conversationId: 'conv_1234567890',
    shopId: 1,
    feedbackType: 'invalid_type',
  },
  starRatingWithoutRating: {
    conversationId: 'conv_1234567890',
    shopId: 1,
    feedbackType: 'star_rating',
  },
  ratingOutOfRange: [
    { ...validStarRatingFeedback, rating: 0 },
    { ...validStarRatingFeedback, rating: 6 },
    { ...validStarRatingFeedback, rating: -1 },
    { ...validStarRatingFeedback, rating: 100 },
  ],
  sqlInjection: [
    {
      conversationId: "conv_'; DROP TABLE feedback_ratings;--",
      shopId: 1,
      feedbackType: 'thumbs_up',
    },
    {
      conversationId: 'conv_1234567890',
      shopId: 1,
      feedbackType: "'; DELETE FROM feedback_ratings WHERE true;--",
    },
  ],
};

// ============================================================================
// FEEDBACK CORRECTION DATA
// ============================================================================

export const validNormalPriorityCorrection = {
  conversationId: 'conv_1234567890',
  shopId: 1,
  originalResponse: 'Our prices start at $50',
  correctedAnswer: 'Our haircuts start at $30, not $50',
  priority: 'normal',
  submittedBy: 'test_user_1',
};

export const validUrgentPriorityCorrection = {
  conversationId: 'conv_9876543210',
  shopId: 1,
  originalResponse: 'We are open 24/7',
  correctedAnswer: 'We are open Mon-Fri 9AM-7PM, Sat 10AM-5PM',
  priority: 'urgent',
  submittedBy: 'test_manager_1',
};

export const invalidCorrectionData = {
  missingOriginalResponse: {
    conversationId: 'conv_1234567890',
    shopId: 1,
    correctedAnswer: 'Corrected answer',
    priority: 'normal',
  },
  missingCorrectedAnswer: {
    conversationId: 'conv_1234567890',
    shopId: 1,
    originalResponse: 'Original response',
    priority: 'normal',
  },
  invalidPriority: {
    ...validNormalPriorityCorrection,
    priority: 'invalid_priority',
  },
  sqlInjectionInText: [
    {
      ...validNormalPriorityCorrection,
      originalResponse: "'; DROP TABLE feedback_corrections;--",
    },
    {
      ...validNormalPriorityCorrection,
      correctedAnswer: "'; DELETE FROM learning_queue;--",
    },
  ],
  emptyTextFields: [
    {
      ...validNormalPriorityCorrection,
      originalResponse: '',
    },
    {
      ...validNormalPriorityCorrection,
      correctedAnswer: '   ',
    },
  ],
};

// ============================================================================
// VOICE CORRECTION DATA
// ============================================================================

export const validVoiceCorrectionWithSentiment = {
  conversationId: 'conv_1234567890',
  shopId: 1,
  transcript: 'The bot said the wrong price, it should be $30 not $50',
  detectedSentiment: 'negative',
  detectedEntities: ['price', '$30', '$50'],
  confidence: 0.85,
  audioDuration: 5.2,
};

export const validVoiceCorrectionWithEntities = {
  conversationId: 'conv_9876543210',
  shopId: 2,
  transcript: 'Hours are 9AM to 7PM Monday through Friday',
  detectedSentiment: 'neutral',
  detectedEntities: ['hours', '9AM', '7PM', 'Monday', 'Friday'],
  confidence: 0.92,
  audioDuration: 8.5,
};

export const invalidVoiceCorrectionData = {
  missingTranscript: {
    conversationId: 'conv_1234567890',
    shopId: 1,
    detectedSentiment: 'negative',
  },
  invalidSentiment: [
    {
      ...validVoiceCorrectionWithSentiment,
      detectedSentiment: 'invalid_emotion',
    },
    {
      ...validVoiceCorrectionWithSentiment,
      detectedSentiment: 123,
    },
  ],
  invalidConfidence: [
    {
      ...validVoiceCorrectionWithSentiment,
      confidence: -0.5,
    },
    {
      ...validVoiceCorrectionWithSentiment,
      confidence: 1.5,
    },
    {
      ...validVoiceCorrectionWithSentiment,
      confidence: 100,
    },
  ],
  largeTranscript: {
    conversationId: 'conv_1234567890',
    shopId: 1,
    transcript: 'A'.repeat(15000), // 15KB transcript
    detectedSentiment: 'neutral',
    confidence: 0.8,
  },
  sqlInjectionInTranscript: [
    {
      ...validVoiceCorrectionWithSentiment,
      transcript: "'; DROP TABLE voice_corrections;--",
    },
  ],
};

// ============================================================================
// LEARNING QUEUE DATA
// ============================================================================

export const samplePendingQueueItems = [
  {
    queueId: 1,
    shopId: 1,
    sourceType: 'correction',
    sourceId: 1,
    suggestedChange: 'Price correction: $50 -> $30',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
  },
  {
    queueId: 2,
    shopId: 1,
    sourceType: 'correction',
    sourceId: 2,
    suggestedChange: 'Hours correction: 24/7 -> Mon-Fri 9AM-7PM',
    status: 'pending',
    priority: 'urgent',
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
  },
  {
    queueId: 3,
    shopId: 2,
    sourceType: 'voice_correction',
    sourceId: 1,
    suggestedChange: 'Service availability update',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
  },
];

export const sampleApprovedQueueItems = [
  {
    queueId: 4,
    shopId: 1,
    sourceType: 'correction',
    sourceId: 3,
    suggestedChange: 'New service added',
    status: 'approved',
    priority: 'normal',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    approvedAt: new Date(Date.now() - 3600000),
  },
  {
    queueId: 5,
    shopId: 2,
    sourceType: 'voice_correction',
    sourceId: 2,
    suggestedChange: 'Contact info update',
    status: 'approved',
    priority: 'urgent',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    approvedAt: new Date(Date.now() - 7200000),
  },
];

export const sampleRejectedQueueItems = [
  {
    queueId: 6,
    shopId: 1,
    sourceType: 'correction',
    sourceId: 4,
    suggestedChange: 'Invalid change',
    status: 'rejected',
    priority: 'low',
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
    rejectionReason: 'Duplicate entry',
  },
];

// ============================================================================
// PAGINATION AND FILTERING DATA
// ============================================================================

export const paginationTestCases = [
  { limit: 5, expected: 5 },
  { limit: 10, expected: 10 },
  { limit: 50, expected: 50 },
  { limit: 0, expected: 'default' }, // Should use default
  { limit: -5, expected: 'error' }, // Should error
  { limit: 1000, expected: 'max' }, // Should cap at max
];

export const invalidFilterValues = [
  { shopId: 'invalid', status: 'pending' },
  { shopId: 1, status: 'invalid_status' },
  { shopId: -1, status: 'pending' },
  { shopId: 0, status: 'pending' },
];

// ============================================================================
// BATCH PROCESS DATA
// ============================================================================

export const batchProcessScenarios = {
  emptyQueue: {
    approvedCount: 0,
    expectedProcessed: 0,
  },
  singleItem: {
    approvedCount: 1,
    expectedProcessed: 1,
  },
  multipleItems: {
    approvedCount: 5,
    expectedProcessed: 5,
  },
  largeBatch: {
    approvedCount: 100,
    expectedProcessed: 100,
  },
};

// ============================================================================
// APPROVAL/REJECTION DATA
// ============================================================================

export const validApprovalActions = [
  {
    learningQueueId: 1,
    action: 'approve',
    reviewer: 'admin_1',
    notes: 'Correct information',
  },
  {
    learningQueueId: 2,
    action: 'approve',
    reviewer: 'manager_1',
    notes: 'Verified with business owner',
  },
];

export const validRejectionActions = [
  {
    learningQueueId: 3,
    action: 'reject',
    reviewer: 'admin_1',
    rejectionReason: 'Duplicate entry',
  },
  {
    learningQueueId: 4,
    action: 'reject',
    reviewer: 'manager_1',
    rejectionReason: 'Inaccurate information',
  },
];

export const invalidApprovalData = [
  {
    learningQueueId: 999999, // Non-existent ID
    action: 'approve',
    reviewer: 'admin_1',
  },
  {
    learningQueueId: 1,
    action: 'invalid_action', // Not approve/reject
    reviewer: 'admin_1',
  },
  {
    learningQueueId: 'invalid_id', // Wrong type
    action: 'approve',
    reviewer: 'admin_1',
  },
  {
    learningQueueId: 1,
    action: 'approve',
    reviewer: '', // Missing reviewer
  },
];

// ============================================================================
// EDGE CASES AND BOUNDARY CONDITIONS
// ============================================================================

export const boundaryTestCases = {
  minimumLength: {
    conversationId: 'conv_1',
    shopId: 1,
    feedbackType: 'thumbs_up',
  },
  maximumLength: {
    conversationId: 'conv_' + 'x'.repeat(200),
    shopId: 1,
    feedbackType: 'thumbs_up',
  },
  specialCharacters: {
    conversationId: "conv_'<script>alert('xss')</script>",
    shopId: 1,
    feedbackType: 'thumbs_up',
  },
  unicodeCharacters: {
    conversationId: 'conv_你好世界_🌍',
    shopId: 1,
    feedbackType: 'thumbs_up',
  },
};

// ============================================================================
// DATABASE ERROR SCENARIOS
// ============================================================================

export const databaseErrorScenarios = {
  constraintViolation: {
    scenario: 'Duplicate key violation',
    expectedError: 'duplicate key',
  },
  foreignKeyViolation: {
    scenario: 'Referencing non-existent conversation',
    expectedError: 'foreign key',
  },
  connectionTimeout: {
    scenario: 'Database connection timeout',
    expectedError: 'timeout',
  },
  tableNotFound: {
    scenario: 'Table does not exist',
    expectedError: 'does not exist',
  },
};

// ============================================================================
// TRIGGER VERIFICATION DATA
// ============================================================================

export const triggerVerificationData = {
  thumbsDownTrigger: {
    description: 'thumbs_down feedback should create learning queue entry',
    feedbackData: validThumbsDownFeedback,
    expectedQueueStatus: 'pending',
    expectedPriority: 'normal',
  },
  urgentCorrectionTrigger: {
    description: 'urgent correction should auto-approve',
    correctionData: validUrgentPriorityCorrection,
    expectedStatus: 'approved',
    expectedAppliedAt: 'should_exist',
  },
  voiceCorrectionTrigger: {
    description: 'voice correction should create learning queue entry',
    voiceData: validVoiceCorrectionWithSentiment,
    expectedQueueStatus: 'pending',
  },
};

// ============================================================================
// PERFORMANCE TEST DATA
// ============================================================================

export const performanceTestData = {
  smallDataset: {
    feedbackCount: 10,
    correctionCount: 5,
    voiceCount: 3,
    maxResponseTime: 100, // ms
  },
  mediumDataset: {
    feedbackCount: 100,
    correctionCount: 50,
    voiceCount: 30,
    maxResponseTime: 500, // ms
  },
  largeDataset: {
    feedbackCount: 1000,
    correctionCount: 500,
    voiceCount: 300,
    maxResponseTime: 2000, // ms
  },
};
