# Feedback API Reference

Complete API reference for the Cutting Edge Feedback System.

## Overview

The Feedback API provides endpoints for collecting user feedback, managing learning queues, tracking AI response analytics, and processing voice transcripts. All feedback is automatically analyzed to improve the AI system through continuous learning.

**Base URL**: `http://localhost:3000/api/feedback`

**Authentication**: Currently open access (TODO: Add authentication)

**Rate Limiting**: Currently unlimited (TODO: Add rate limiting)

---

## Endpoints

### 1. POST /api/feedback/rating

Submit user feedback on AI response.

#### Description
Allows users to rate AI responses with thumbs up/down, star ratings, or emoji reactions. Negative feedback automatically creates learning queue entries for review.

#### Authentication
⚠️ **TODO**: Authentication required - User or admin token

#### Request

**Method**: `POST`
**URL**: `/api/feedback/rating`
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "conversationId": "uuid",
  "feedbackType": "thumbs_up|thumbs_down|star_rating|emoji",
  "rating": 1-5,
  "reason": "Optional text explanation",
  "metadata": {}
}
```

**Fields**:
- `conversationId` (UUID, required): ID of the conversation
- `feedbackType` (enum, required): Type of feedback
  - `thumbs_up`: Positive feedback
  - `thumbs_down`: Negative feedback (triggers learning queue)
  - `star_rating`: 1-5 star rating
  - `emoji`: Emoji reaction
- `rating` (integer, optional): 1-5 star rating (required for star_rating type)
- `reason` (string, optional): Text explanation for the feedback
- `metadata` (object, optional): Additional context like shop_id, user_info, etc.

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "feedbackType": "thumbs_down",
    "rating": null,
    "reason": "Wrong information provided",
    "metadata": {"shopId": 1},
    "createdAt": "2025-02-09T10:30:00.000Z"
  },
  "timestamp": "2025-02-09T10:30:00.000Z"
}
```

**Error Response** (400):
```json
{
  "error": "Invalid feedback type",
  "message": "feedbackType must be one of: thumbs_up, thumbs_down, star_rating, emoji"
}
```

**Error Response** (404):
```json
{
  "error": "Conversation not found",
  "message": "No conversation exists with the provided ID"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/feedback/rating \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "feedbackType": "thumbs_down",
    "reason": "Wrong information provided",
    "metadata": {"shopId": 1}
  }'
```

#### Database Effects
- Inserts record into `conversation_feedback` table
- If `feedbackType = thumbs_down` or `rating ≤ 2`, automatically creates learning_queue entry via trigger
- Creates analytics entry in `response_analytics` table

#### Error Codes
- `400`: Invalid input (missing fields, wrong types, invalid enum values)
- `404`: Conversation not found
- `500`: Database error

---

### 2. POST /api/feedback/correction

Submit owner correction during handoff.

#### Description
Allows business owners to correct AI responses when incorrect information is provided. Corrections are automatically added to the learning queue with high priority.

#### Authentication
⚠️ **TODO**: Admin authentication required

#### Request

**Method**: `POST`
**URL**: `/api/feedback/correction`
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "conversationId": "uuid",
  "originalResponse": "The AI's incorrect response",
  "correctedAnswer": "The correct answer",
  "priority": "low|normal|high|urgent",
  "correctionContext": "Optional context about when this applies",
  "metadata": {}
}
```

**Fields**:
- `conversationId` (UUID, required): ID of the conversation
- `originalResponse` (string, required): The AI response that was incorrect
- `correctedAnswer` (string, required): The correct answer provided by the owner
- `priority` (enum, optional): Processing priority
  - `low`: Low priority (default)
  - `normal`: Normal priority
  - `high`: High priority
  - `urgent`: Urgent priority (auto-approved)
- `correctionContext` (string, optional): Additional context about when/how the correction applies
- `metadata` (object, optional): Additional information

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "originalResponse": "Haircuts are $25",
    "correctedAnswer": "Haircuts are $30",
    "priority": "high",
    "correctionContext": "Standard pricing for all haircuts",
    "createdAt": "2025-02-09T10:30:00.000Z",
    "appliedAt": null
  },
  "learningQueueId": "660e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-02-09T10:30:00.000Z"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/feedback/correction \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "originalResponse": "Haircuts are $25",
    "correctedAnswer": "Haircuts are $30",
    "priority": "high",
    "correctionContext": "Standard pricing for all haircuts",
    "metadata": {"shopId": 1}
  }'
```

#### Database Effects
- Inserts record into `owner_corrections` table
- Automatically creates learning_queue entry via trigger with confidence score based on priority:
  - `urgent`: 95 confidence, auto-approved
  - `high`: 85 confidence
  - `normal`: 70 confidence
  - `low`: 50 confidence

#### Error Codes
- `400`: Invalid input (missing fields, wrong types)
- `404`: Conversation not found
- `500`: Database error

---

### 3. GET /api/feedback/pending

Get pending learning queue items.

#### Description
Retrieves pending items from the learning queue that await review and approval. Used by admin dashboard to show items needing attention.

#### Authentication
⚠️ **TODO**: Admin authentication required

#### Request

**Method**: `GET`
**URL**: `/api/feedback/pending`

**Query Parameters**:
- `shopId` (integer, optional): Filter by shop ID
- `limit` (integer, optional): Maximum number of items to return (default: 50)
- `offset` (integer, optional): Number of items to skip (default: 0)
- `sourceType` (enum, optional): Filter by source type
  - `feedback`: From user feedback
  - `correction`: From owner corrections
  - `transcript`: From voice transcripts
  - `manual`: Manually added

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "pending",
        "sourceType": "feedback",
        "sourceId": "123e4567-e89b-12d3-a456-426614174000",
        "shopId": 1,
        "proposedContent": "Review needed for conversation with negative feedback",
        "category": "feedback_review",
        "confidenceScore": 50,
        "metadata": {
          "feedbackType": "thumbs_down",
          "rating": 1,
          "reason": "Wrong information"
        },
        "createdAt": "2025-02-09T10:30:00.000Z"
      }
    ],
    "count": 1,
    "total": 15
  },
  "timestamp": "2025-02-09T10:30:00.000Z"
}
```

#### Example

```bash
# Get all pending items
curl http://localhost:3000/api/feedback/pending

# Get pending items for shop 1
curl http://localhost:3000/api/feedback/pending?shopId=1

# Get pending feedback items
curl http://localhost:3000/api/feedback/pending?sourceType=feedback&limit=20
```

#### Error Codes
- `400`: Invalid query parameters
- `500`: Database error

---

### 4. POST /api/feedback/approve

Approve a learning queue item.

#### Description
Approves a pending learning queue item and applies it to the knowledge base. Items with high confidence scores (≥80) are auto-approved.

#### Authentication
⚠️ **TODO**: Admin authentication required

#### Request

**Method**: `POST`
**URL**: `/api/feedback/approve`
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "itemId": "uuid",
  "reviewerId": "uuid",
  "applyImmediately": true
}
```

**Fields**:
- `itemId` (UUID, required): ID of the learning queue item to approve
- `reviewerId` (UUID, optional): UUID of the admin reviewing the item
- `applyImmediately` (boolean, optional): Whether to apply to knowledge base immediately (default: true)

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "applied",
    "appliedAt": "2025-02-09T10:30:00.000Z",
    "reviewedAt": "2025-02-09T10:30:00.000Z",
    "reviewedBy": "123e4567-e89b-12d3-a456-426614174000"
  },
  "knowledgeBaseId": "770e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-02-09T10:30:00.000Z"
}
```

**Error Response** (404):
```json
{
  "error": "Item not found",
  "message": "No learning queue item exists with the provided ID"
}
```

**Error Response** (409):
```json
{
  "error": "Item already processed",
  "message": "This item has already been approved or rejected"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/feedback/approve \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "550e8400-e29b-41d4-a716-446655440000",
    "reviewerId": "123e4567-e89b-12d3-a456-426614174000",
    "applyImmediately": true
  }'
```

#### Database Effects
- Updates learning_queue item status to `applied`
- Sets `reviewedAt` and `reviewedBy` fields
- If `applyImmediately = true`, inserts record into `knowledge_base_rag` table
- Sets `appliedAt` timestamp

#### Error Codes
- `400`: Invalid input
- `404`: Learning queue item not found
- `409`: Item already processed
- `500`: Database error

---

### 5. POST /api/feedback/reject

Reject a learning queue item.

#### Description
Rejects a pending learning queue item, preventing it from being applied to the knowledge base.

#### Authentication
⚠️ **TODO**: Admin authentication required

#### Request

**Method**: `POST`
**URL**: `/api/feedback/reject`
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "itemId": "uuid",
  "reviewerId": "uuid",
  "reason": "Why this item is being rejected"
}
```

**Fields**:
- `itemId` (UUID, required): ID of the learning queue item to reject
- `reviewerId` (UUID, optional): UUID of the admin reviewing the item
- `reason` (string, optional): Explanation for why the item is being rejected

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "rejected",
    "reviewedAt": "2025-02-09T10:30:00.000Z",
    "reviewedBy": "123e4567-e89b-12d3-a456-426614174000"
  },
  "timestamp": "2025-02-09T10:30:00.000Z"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/feedback/reject \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "550e8400-e29b-41d4-a716-446655440000",
    "reviewerId": "123e4567-e89b-12d3-a456-426614174000",
    "reason": "Duplicate information, already in knowledge base"
  }'
```

#### Database Effects
- Updates learning_queue item status to `rejected`
- Sets `reviewedAt` and `reviewedBy` fields
- Adds rejection reason to metadata

#### Error Codes
- `400`: Invalid input
- `404`: Learning queue item not found
- `409`: Item already processed
- `500`: Database error

---

### 6. POST /api/feedback/analytics

Track response analytics.

#### Description
Records analytics data for AI responses including engagement scores, conversion tracking, and A/B testing metrics.

#### Authentication
⚠️ **TODO**: Service authentication required

#### Request

**Method**: `POST`
**URL**: `/api/feedback/analytics`
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "conversationId": "uuid",
  "responseText": "Full AI response text",
  "responseType": "greeting|pricing|faq|handoff",
  "userEngagementScore": 75,
  "ledToConversion": false,
  "responseTimeMs": 150,
  "abTestVariant": "variant_a",
  "metrics": {}
}
```

**Fields**:
- `conversationId` (UUID, required): ID of the conversation
- `responseText` (string, required): Full text of the AI response
- `responseType` (string, required): Type/classification of response
- `userEngagementScore` (integer, optional): Engagement score 0-100
- `ledToConversion` (boolean, optional): Whether response led to conversion
- `responseTimeMs` (integer, optional): Time to generate response in milliseconds
- `abTestVariant` (string, optional): A/B test variant identifier
- `metrics` (object, optional): Additional metrics like click-through, follow-ups

#### Response

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "responseType": "pricing",
    "userEngagementScore": 75,
    "ledToConversion": false,
    "responseTimeMs": 150,
    "createdAt": "2025-02-09T10:30:00.000Z"
  },
  "timestamp": "2025-02-09T10:30:00.000Z"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/feedback/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "responseText": "Our haircuts start at $30...",
    "responseType": "pricing",
    "userEngagementScore": 85,
    "ledToConversion": true,
    "responseTimeMs": 120,
    "abTestVariant": "variant_b",
    "metrics": {
      "clickthrough": true,
      "followUpQuestions": 2
    }
  }'
```

#### Database Effects
- Inserts record into `response_analytics` table
- Updates materialized view `response_performance_metrics` (on refresh)

#### Error Codes
- `400`: Invalid input (missing fields, wrong types)
- `404`: Conversation not found
- `500`: Database error

---

## Common Error Responses

All endpoints may return these common errors:

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

### 404 Not Found (for invalid endpoints)
```json
{
  "error": "Not found",
  "message": "Route GET /api/feedback/invalid not found"
}
```

---

## Database Schema

### conversation_feedback
Stores user feedback on AI responses.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| feedback_type | VARCHAR(20) | thumbs_up, thumbs_down, star_rating, emoji |
| rating | INTEGER | 1-5 star rating |
| reason | TEXT | Optional explanation |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Timestamp |

### owner_corrections
Stores business owner corrections.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| original_response | TEXT | Incorrect AI response |
| corrected_answer | TEXT | Correct answer |
| priority | VARCHAR(20) | low, normal, high, urgent |
| correction_context | TEXT | When/how correction applies |
| metadata | JSONB | Additional information |
| created_at | TIMESTAMPTZ | Timestamp |
| applied_at | TIMESTAMPTZ | When applied to KB |

### learning_queue
Staging area for knowledge updates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| status | VARCHAR(20) | pending, approved, rejected, applied |
| source_type | VARCHAR(20) | feedback, correction, transcript, manual |
| source_id | UUID | ID of source record |
| shop_id | INTEGER | Shop ID |
| proposed_content | TEXT | Proposed new knowledge |
| category | TEXT | Knowledge category |
| embedding | VECTOR(768) | Vector embedding |
| confidence_score | INTEGER | 0-100 confidence |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Timestamp |
| reviewed_at | TIMESTAMPTZ | Review timestamp |
| applied_at | TIMESTAMPTZ | Application timestamp |
| reviewed_by | UUID | Admin who reviewed |

### response_analytics
AI response performance metrics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| response_text | TEXT | Full response text |
| response_type | VARCHAR(50) | Response type/classification |
| user_engagement_score | INTEGER | 0-100 engagement score |
| led_to_conversion | BOOLEAN | Conversion tracking |
| response_time_ms | INTEGER | Generation time |
| ab_test_variant | VARCHAR(50) | A/B test variant |
| metrics | JSONB | Additional metrics |
| created_at | TIMESTAMPTZ | Timestamp |

---

## Automatic Triggers

The system automatically creates learning queue entries based on certain conditions:

1. **Negative Feedback Trigger**
   - When: `feedbackType = thumbs_down` OR `rating ≤ 2`
   - Action: Creates learning_queue entry with `source_type = 'feedback'`
   - Confidence: 50

2. **Owner Correction Trigger**
   - When: New owner_correction is created
   - Action: Creates learning_queue entry with `source_type = 'correction'`
   - Confidence: Based on priority (urgent: 95, high: 85, normal: 70, low: 50)
   - Auto-approval: Urgent priority items are auto-approved

---

## Best Practices

### Submitting Feedback
- Always include conversationId for traceability
- Provide reason text for negative feedback to help with learning
- Use metadata to store shop-specific context

### Owner Corrections
- Set priority appropriately: urgent for critical errors, high for important corrections
- Include correctionContext to explain when the correction applies
- Review corrections in the learning queue before application

### Analytics Tracking
- Track responseTimeMs to monitor performance
- Use abTestVariant for A/B testing different response strategies
- Set ledToConversion to track which responses drive business results

### Learning Queue Management
- Review pending items regularly
- Approve high-confidence items quickly
- Reject duplicates or incorrect information
- Use batch processing for applying approved items

---

## Future Enhancements

- [ ] Authentication and authorization
- [ ] Rate limiting per user/shop
- [ ] Bulk operations for feedback submission
- [ ] Advanced analytics queries
- [ ] Webhook notifications for new pending items
- [ ] Automatic duplicate detection
- [ ] Confidence score calculation based on multiple factors
