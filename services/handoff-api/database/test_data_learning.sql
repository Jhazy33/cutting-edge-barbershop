-- ============================================================================
-- Test Data Script: Phase 2.5 Learning System
-- Description: Insert comprehensive test data for all learning tables
-- Author: Database Architect
-- Date: 2025-02-09
--
-- This script inserts sample test data to validate:
--   - All data types and constraints
--   - Foreign key relationships
--   - Edge cases and boundary values
--   - Voice transcripts with sentiment analysis
--   - Corrections with different priorities
--
-- Usage:
--   BEGIN;
--   \i test_data_learning.sql
--   -- Verify data
--   ROLLBACK;  -- Or COMMIT to keep test data
--
-- Expected Results:
--   - 5 feedback records (mixed types, ratings, sentiments)
--   - 4 owner corrections (all priority levels)
--   - 3 voice transcripts (all sentiment types)
--   - 6 analytics records (with conversions)
--   - Auto-generated learning queue entries from triggers
-- ============================================================================

\echo '=========================================='
\echo 'INSERTING TEST DATA FOR LEARNING SYSTEM'
\echo '=========================================='
\echo ''

-- ============================================================================
-- BEGIN TRANSACTION (for easy rollback)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create test conversations (parent records)
-- ============================================================================

\echo '1. Creating test conversations...'
\echo '----------------------------------------'

-- Insert test conversations if they don't exist
INSERT INTO conversations (id, user_id, summary, metadata, created_at)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    1,
    'Customer asking about pricing for hair color service',
    '{"shop_id": 1, "service_type": "hair_color", "user_type": "new_customer"}'::jsonb,
    '2025-02-09 10:00:00+00'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    2,
    'Repeat customer booking haircut appointment',
    '{"shop_id": 1, "service_type": "haircut", "user_type": "returning_customer"}'::jsonb,
    '2025-02-09 11:00:00+00'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    3,
    'Customer upset with pricing information received',
    '{"shop_id": 2, "service_type": "consultation", "user_type": "new_customer"}'::jsonb,
    '2025-02-09 12:00:00+00'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    1,
    'Voice call discussing complex hair treatment options',
    '{"shop_id": 1, "service_type": "treatment", "user_type": "vip_customer"}'::jsonb,
    '2025-02-09 13:00:00+00'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    4,
    'Customer asking about availability for tomorrow',
    '{"shop_id": 2, "service_type": "general_inquiry", "user_type": "new_customer"}'::jsonb,
    '2025-02-09 14:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

\echo '✓ Test conversations created'
\echo ''

-- ============================================================================
-- STEP 2: Insert conversation_feedback (5 records)
-- ============================================================================

\echo '2. Inserting conversation feedback...'
\echo '----------------------------------------'

-- Test 1: Thumbs up feedback
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'thumbs_up',
  NULL,
  'Helpful response about pricing',
  '{"shop_id": 1, "user_satisfied": true, "response_time": 1500}'::jsonb
);

-- Test 2: Thumbs down feedback (will trigger learning_queue)
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'thumbs_down',
  NULL,
  'Incorrect pricing information provided',
  '{"shop_id": 2, "user_satisfied": false, "issue": "wrong_price"}'::jsonb
);

-- Test 3: 5-star rating
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'star_rating',
  5,
  'Excellent service and quick response',
  '{"shop_id": 1, "user_satisfied": true, "will_return": true}'::jsonb
);

-- Test 4: 2-star rating (will trigger learning_queue)
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'star_rating',
  2,
  'Response was too slow and not helpful',
  '{"shop_id": 2, "user_satisfied": false, "response_time": 8000}'::jsonb
);

-- Test 5: Emoji feedback
INSERT INTO conversation_feedback (
  conversation_id,
  feedback_type,
  rating,
  reason,
  metadata
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'emoji',
  NULL,
  'Customer reacted with fire emoji',
  '{"shop_id": 1, "emoji": "🔥", "sentiment": "excited"}'::jsonb
);

\echo '✓ 5 feedback records inserted'
\echo '  - 2 thumbs_up/emoji (positive)'
\echo '  - 2 thumbs_down/low_rating (will trigger learning)'
\echo '  - 1 star_rating (5-star)'
\echo ''

-- ============================================================================
-- STEP 3: Insert owner_corrections (4 records - all priority levels)
-- ============================================================================

\echo '3. Inserting owner corrections...'
\echo '----------------------------------------'

-- Test 1: Low priority correction
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority,
  correction_context,
  metadata
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Our hair color service starts at $50',
  'Our hair color service starts at $75 for basic color, $150 for highlights',
  'low',
  'Minor clarification on pricing tiers',
  '{"shop_id": 1, "correction_type": "price_clarification"}'::jsonb
);

-- Test 2: Normal priority correction (will trigger learning_queue)
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority,
  correction_context,
  metadata
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'We are open Monday to Friday 9-5',
  'We are open Monday to Saturday 9-6, Sunday 10-4',
  'normal',
  'Incorrect business hours provided',
  '{"shop_id": 1, "correction_type": "hours_update"}'::jsonb
);

-- Test 3: High priority correction (will trigger learning_queue with high confidence)
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority,
  correction_context,
  metadata
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'We accept all major insurance plans',
  'We do not accept insurance. We offer financing options through CareCredit.',
  'high',
  'Critical error about payment methods',
  '{"shop_id": 2, "correction_type": "payment_policy"}'::jsonb
);

-- Test 4: Urgent priority correction (will auto-approve in learning_queue)
INSERT INTO owner_corrections (
  conversation_id,
  original_response,
  corrected_answer,
  priority,
  correction_context,
  metadata,
  applied_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Our address is 123 Main Street',
  'Our address is 456 Oak Avenue, Suite 200',
  'urgent',
  'Wrong address - customers are going to wrong location',
  '{"shop_id": 1, "correction_type": "address_correction"}'::jsonb,
  '2025-02-09 14:30:00+00'
);

\echo '✓ 4 owner corrections inserted'
\echo '  - 1 low priority'
\echo '  - 1 normal priority'
\echo '  - 1 high priority'
\echo '  - 1 urgent priority (auto-approved)'
\echo ''

-- ============================================================================
-- STEP 4: Insert voice_transcripts (3 records - all sentiment types)
-- ============================================================================

\echo '4. Inserting voice transcripts...'
\echo '----------------------------------------'

-- Test 1: Positive sentiment transcript
INSERT INTO voice_transcripts (
  conversation_id,
  transcript,
  processed_summary,
  embedding,
  sentiment,
  entities,
  learning_insights,
  metadata
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Hi, I''d like to schedule a haircut for this weekend. I''ve been coming to your salon for years and love the service! Can I get an appointment on Saturday afternoon?',
  'Repeat customer requesting weekend haircut appointment. Expresses satisfaction with past service.',
  '[0.1, 0.2, 0.3, 0.4, 0.5]'::VECTOR(768),
  'positive',
  '[{"type": "date", "value": "Saturday"}, {"type": "time", "value": "afternoon"}, {"type": "service", "value": "haircut"}]'::jsonb,
  '{"key_insight": "Loyal customer values consistent service quality", "action": "prioritize weekend appointments"}'::jsonb,
  '{"call_duration": 45, "recording_url": "https://example.com/call1.mp3"}'::jsonb
);

-- Test 2: Negative sentiment transcript
INSERT INTO voice_transcripts (
  conversation_id,
  transcript,
  processed_summary,
  embedding,
  sentiment,
  entities,
  learning_insights,
  metadata
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'I called yesterday and was told the hair treatment costs $200. Now I''m being quoted $350! This is false advertising and I''m very upset. I want to speak to a manager.',
  'Customer upset about price discrepancy between calls. Demands manager intervention due to perceived false advertising.',
  '[0.6, 0.7, 0.8, 0.9, 1.0]'::VECTOR(768),
  'negative',
  '[{"type": "price", "value": "$200"}, {"type": "price", "value": "$350"}, {"type": "issue", "value": "price_discrepancy"}]'::jsonb,
  '{"key_insight": "Pricing inconsistency causing customer frustration", "action": "standardize pricing across all channels"}'::jsonb,
  '{"call_duration": 120, "escalation": true, "recording_url": "https://example.com/call2.mp3"}'::jsonb
);

-- Test 3: Neutral sentiment transcript
INSERT INTO voice_transcripts (
  conversation_id,
  transcript,
  processed_summary,
  embedding,
  sentiment,
  entities,
  learning_insights,
  metadata
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Hello, I''m looking for information about your hair extensions service. What types of extensions do you offer and what are the prices?',
  'New customer inquiring about hair extension options and pricing. Neutral tone, seeking product information.',
  '[0.3, 0.4, 0.5, 0.6, 0.7]'::VECTOR(768),
  'neutral',
  '[{"type": "service", "value": "hair extensions"}, {"type": "intent", "value": "pricing_inquiry"}]'::jsonb,
  '{"key_insight": "Customer needs detailed product information", "action": "provide extension catalog"}'::jsonb,
  '{"call_duration": 60, "recording_url": "https://example.com/call3.mp3"}'::jsonb
);

\echo '✓ 3 voice transcripts inserted'
\echo '  - 1 positive sentiment'
\echo '  - 1 negative sentiment'
\echo '  - 1 neutral sentiment'
\echo ''

-- ============================================================================
-- STEP 5: Insert response_analytics (6 records with conversions)
-- ============================================================================

\echo '5. Inserting response analytics...'
\echo '----------------------------------------'

-- Test 1: High engagement, led to conversion
INSERT INTO response_analytics (
  conversation_id,
  response_text,
  response_type,
  user_engagement_score,
  led_to_conversion,
  response_time_ms,
  ab_test_variant,
  metrics
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Our hair color service starts at $75 for single process color. We also offer balayage starting at $150. Would you like to book a consultation?',
  'pricing_inquiry',
  85,
  true,
  1200,
  'variant_a',
  '{"clicks": 3, "follow_up_questions": 2, "time_spent": 45}'::jsonb
);

-- Test 2: Low engagement, no conversion
INSERT INTO response_analytics (
  conversation_id,
  response_text,
  response_type,
  user_engagement_score,
  led_to_conversion,
  response_time_ms,
  ab_test_variant,
  metrics
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'We offer various hair treatments. Please visit our website for more information.',
  'general_info',
  30,
  false,
  800,
  'variant_b',
  '{"clicks": 0, "follow_up_questions": 0, "time_spent": 5}'::jsonb
);

-- Test 3: Medium engagement, no conversion yet
INSERT INTO response_analytics (
  conversation_id,
  response_text,
  response_type,
  user_engagement_score,
  led_to_conversion,
  response_time_ms,
  ab_test_variant,
  metrics
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'We have appointments available on Saturday at 2pm and 4pm. Which time works better for you?',
  'booking',
  65,
  false,
  1500,
  'variant_a',
  '{"clicks": 2, "follow_up_questions": 1, "time_spent": 30}'::jsonb
);

-- Test 4: A/B test variant - led to conversion
INSERT INTO response_analytics (
  conversation_id,
  response_text,
  response_type,
  user_engagement_score,
  led_to_conversion,
  response_time_ms,
  ab_test_variant,
  metrics
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Great choice! Our premium hair treatment package is $299 and includes a follow-up session. Would you like me to check availability for this week?',
  'upsell',
  92,
  true,
  2000,
  'variant_c',
  '{"clicks": 5, "follow_up_questions": 3, "time_spent": 120}'::jsonb
);

-- Test 5: Greeting response
INSERT INTO response_analytics (
  conversation_id,
  response_text,
  response_type,
  user_engagement_score,
  led_to_conversion,
  response_time_ms,
  ab_test_variant,
  metrics
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Welcome to our salon! How can I help you today? We offer haircuts, coloring, treatments, and more.',
  'greeting',
  70,
  false,
  500,
  NULL,
  '{"clicks": 1, "follow_up_questions": 1, "time_spent": 15}'::jsonb
);

-- Test 6: FAQ response - high conversion
INSERT INTO response_analytics (
  conversation_id,
  response_text,
  response_type,
  user_engagement_score,
  led_to_conversion,
  response_time_ms,
  ab_test_variant,
  metrics
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Yes, we offer free consultations for all new clients. You can book online or call us directly. Our expert stylists will help you find the perfect look!',
  'faq',
  88,
  true,
  900,
  'variant_a',
  '{"clicks": 4, "follow_up_questions": 2, "time_spent": 60}'::jsonb
);

\echo '✓ 6 analytics records inserted'
\echo '  - 3 led to conversion'
\echo '  - 3 different A/B test variants'
\echo '  - Various engagement scores (30-92)'
\echo ''

-- ============================================================================
-- STEP 6: Insert manual learning_queue entries
-- ============================================================================

\echo '6. Inserting manual learning queue entries...'
\echo '----------------------------------------'

-- Test 1: Pending manual entry
INSERT INTO learning_queue (
  status,
  source_type,
  source_id,
  shop_id,
  proposed_content,
  category,
  embedding,
  confidence_score,
  metadata
) VALUES (
  'pending',
  'manual',
  NULL,
  1,
  'New holiday hours: Christmas Eve 9-3, Christmas Day closed, New Year''s Eve 9-5',
  'hours_update',
  '[0.1, 0.2, 0.3, 0.4, 0.5]'::VECTOR(768),
  75,
  '{"requested_by": "owner", "reason": "upcoming_holidays"}'::jsonb
);

-- Test 2: Already approved entry
INSERT INTO learning_queue (
  status,
  source_type,
  source_id,
  shop_id,
  proposed_content,
  category,
  embedding,
  confidence_score,
  metadata,
  reviewed_at,
  reviewed_by
) VALUES (
  'approved',
  'manual',
  NULL,
  2,
  'We now offer keratin treatments starting at $199',
  'new_service',
  '[0.2, 0.3, 0.4, 0.5, 0.6]'::VECTOR(768),
  90,
  '{"requested_by": "manager", "auto_approved": true}'::jsonb,
  '2025-02-09 15:00:00+00',
  '12345678-1234-1234-1234-123456789012'
);

-- Test 3: Rejected entry
INSERT INTO learning_queue (
  status,
  source_type,
  source_id,
  shop_id,
  proposed_content,
  category,
  embedding,
  confidence_score,
  metadata,
  reviewed_at,
  reviewed_by
) VALUES (
  'rejected',
  'feedback',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1,
  'Customer said we should close on Sundays',
  'hours_change',
  '[0.3, 0.4, 0.5, 0.6, 0.7]'::VECTOR(768),
  20,
  '{"rejection_reason": "not_business_relevant", "reviewer_notes": "Single customer preference"}'::jsonb,
  '2025-02-09 16:00:00+00',
  '12345678-1234-1234-1234-123456789012'
);

\echo '✓ 3 manual learning queue entries inserted'
\echo '  - 1 pending'
\echo '  - 1 approved'
\echo '  - 1 rejected'
\echo ''

-- ============================================================================
-- STEP 7: Display test data summary
-- ============================================================================

\echo '=========================================='
\echo 'TEST DATA SUMMARY'
\echo '=========================================='
\echo ''

DO $$
DECLARE
  v_conversations INTEGER;
  v_feedback INTEGER;
  v_corrections INTEGER;
  v_transcripts INTEGER;
  v_analytics INTEGER;
  v_learning_queue INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conversations FROM conversations WHERE id LIKE '%11%' OR id LIKE '%22%' OR id LIKE '%33%';
  SELECT COUNT(*) INTO v_feedback FROM conversation_feedback;
  SELECT COUNT(*) INTO v_corrections FROM owner_corrections;
  SELECT COUNT(*) INTO v_transcripts FROM voice_transcripts;
  SELECT COUNT(*) INTO v_analytics FROM response_analytics;
  SELECT COUNT(*) INTO v_learning_queue FROM learning_queue;

  RAISE NOTICE 'Test data inserted:';
  RAISE NOTICE '  - Conversations: %', v_conversations;
  RAISE NOTICE '  - Conversation feedback: %', v_feedback;
  RAISE NOTICE '  - Owner corrections: %', v_corrections;
  RAISE NOTICE '  - Voice transcripts: %', v_transcripts;
  RAISE NOTICE '  - Response analytics: %', v_analytics;
  RAISE NOTICE '  - Learning queue entries: %', v_learning_queue;
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Triggers may have auto-generated additional learning_queue entries';
END $$;

\echo ''

-- ============================================================================
-- STEP 8: Sample queries to verify data
-- ============================================================================

\echo 'Sample queries to verify test data:'
\echo '----------------------------------------'
\echo ''
\echo '-- View all feedback:'
\echo 'SELECT * FROM conversation_feedback ORDER BY created_at;'
\echo ''
\echo '-- View corrections by priority:'
\echo 'SELECT * FROM owner_corrections ORDER BY priority DESC, created_at;'
\echo ''
\echo '-- View transcripts by sentiment:'
\echo 'SELECT id, sentiment, LEFT(transcript, 50) as preview FROM voice_transcripts;'
\echo ''
\echo '-- View high-performing responses:'
\echo 'SELECT * FROM response_analytics WHERE led_to_conversion = true;'
\echo ''
\echo '-- View learning queue by status:'
\echo 'SELECT * FROM learning_queue ORDER BY status, created_at;'
\echo ''

-- ============================================================================
-- TRANSACTION SUMMARY
-- ============================================================================

\echo '=========================================='
\echo 'TRANSACTION READY TO COMMIT'
\echo '=========================================='
\echo ''
\echo 'All test data has been inserted within a transaction.'
\echo ''
\echo 'To keep test data: COMMIT;'
\echo 'To discard test data: ROLLBACK;'
\echo ''
\echo 'Next steps:'
\echo '  1. Run: SELECT * FROM learning_queue; (check for trigger-generated entries)'
\echo '  2. Run test_triggers.sql to verify trigger functionality'
\echo '  3. Refresh materialized views to see aggregated metrics'
\echo '=========================================='
