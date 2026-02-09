-- ============================================================================
-- Trigger Test Fixtures
-- ============================================================================
-- This file contains SQL test data fixtures for trigger testing
-- Usage: psql -U postgres -d postgres -f tests/fixtures/trigger-test-data.sql
-- ============================================================================

-- ============================================================================
-- TEST CONVERSATIONS
-- ============================================================================

-- Insert test conversations
INSERT INTO conversations (id, user_id, summary, transcript, metadata)
VALUES
  ('test_conv_001', 'test_user_1', 'Customer asked about haircut prices', 'User: How much for a haircut? Bot: $30 for adults.', '{"shop_id": 1, "source": "telegram"}'),
  ('test_conv_002', 'test_user_2', 'Customer asked about store hours', 'User: What are your hours? Bot: 9AM-7PM daily.', '{"shop_id": 1, "source": "web"}'),
  ('test_conv_003', 'test_user_3', 'Customer complained about wait time', 'User: Waited too long. Bot: Sorry about that.', '{"shop_id": 2, "source": "telegram"}'),
  ('test_conv_004', 'test_user_4', 'Customer asked about services', 'User: What services do you offer? Bot: Haircuts, styling, coloring.', '{"shop_id": 1, "source": "telegram"}'),
  ('test_conv_005', 'test_user_5', 'Customer wanted appointment', 'User: Can I book an appointment? Bot: Yes, what time works?', '{"shop_id": 2, "source": "web"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST FEEDBACK (will trigger learning queue creation)
-- ============================================================================

-- Negative feedback (should create learning entries)
INSERT INTO conversation_feedback (conversation_id, feedback_type, rating, reason, metadata)
VALUES
  ('test_conv_001', 'thumbs_down', NULL, 'Wrong price information provided', '{"source": "user_report"}'),
  ('test_conv_002', 'star_rating', 2, 'Hours were incorrect', '{"source": "survey"}'),
  ('test_conv_003', 'thumbs_down', NULL, 'Poor response to complaint', '{"source": "user_report"}')
ON CONFLICT DO NOTHING;

-- Positive feedback (should NOT create learning entries)
INSERT INTO conversation_feedback (conversation_id, feedback_type, rating, reason, metadata)
VALUES
  ('test_conv_004', 'thumbs_up', NULL, 'Great information', '{"source": "user_feedback"}'),
  ('test_conv_005', 'star_rating', 5, 'Helpful service', '{"source": "survey"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST OWNER CORRECTIONS (will trigger learning queue creation)
-- ============================================================================

-- Urgent priority (auto-approved)
INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority, correction_context, metadata)
VALUES
  ('test_conv_001', 'Haircuts cost $20', 'Haircuts cost $30 for adults, $20 for children', 'urgent', 'All pricing inquiries', '{"verified": true}')
ON CONFLICT DO NOTHING;

-- High priority
INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority, correction_context, metadata)
VALUES
  ('test_conv_002', 'Open 9AM-5PM', 'Open 9AM-9PM Monday-Friday, 10AM-6PM weekends', 'high', 'All hours inquiries', '{"verified": true}')
ON CONFLICT DO NOTHING;

-- Normal priority
INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority, correction_context, metadata)
VALUES
  ('test_conv_003', 'We only do haircuts', 'We offer haircuts, styling, coloring, and treatments', 'normal', 'Service inquiries', '{"verified": false}')
ON CONFLICT DO NOTHING;

-- Low priority
INSERT INTO owner_corrections (conversation_id, original_response, corrected_answer, priority, correction_context, metadata)
VALUES
  ('test_conv_004', 'Friendly staff', 'Professional and friendly team', 'low', 'Cosmetic wording', '{"verified": false}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST VOICE TRANSCRIPTS
-- ============================================================================

INSERT INTO voice_transcripts (conversation_id, transcript, sentiment, entities, learning_insights, metadata)
VALUES
  ('test_conv_001', 'Customer sounded frustrated about pricing confusion', 'negative', '[{"emotion": "frustrated"}, {"topic": "pricing"}]', '{"issue": "pricing_confusion", "action": "clarify_pricing"}', '{"source": "phone_call"}'),
  ('test_conv_002', 'Customer seemed satisfied with hours information', 'positive', '[{"emotion": "satisfied"}, {"topic": "hours"}]', '{"positive": "clear_info"}', '{"source": "phone_call"}'),
  (NULL, 'General call asking about services', 'neutral', '[{"topic": "services"}]', '{"inquiry": "general"}', '{"source": "general_inquiry"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST KNOWLEDGE BASE (for conflict detection tests)
-- ============================================================================

-- Base knowledge entries
INSERT INTO knowledge_base_rag (shop_id, content, category, source, metadata)
VALUES
  (1, 'Haircuts cost $30 for adults, $20 for children', 'pricing', 'manual', '{"verified": true, "last_updated": "2024-01-01"}'),
  (1, 'Store hours: 9AM-9PM Monday-Friday, 10AM-6PM weekends', 'hours', 'manual', '{"verified": true}'),
  (1, 'Services include haircuts, styling, coloring, and treatments', 'services', 'manual', '{"verified": true}'),
  (2, 'Haircuts cost $25 for adults, $15 for children', 'pricing', 'manual', '{"verified": true}'),
  (2, 'Store hours: 10AM-8PM daily', 'hours', 'manual', '{"verified": true}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify test data was inserted
SELECT 'Test Conversations:' as info, COUNT(*) as count FROM conversations WHERE id LIKE 'test_%'
UNION ALL
SELECT 'Test Feedback:', COUNT(*) FROM conversation_feedback WHERE conversation_id LIKE 'test_%'
UNION ALL
SELECT 'Test Corrections:', COUNT(*) FROM owner_corrections WHERE conversation_id LIKE 'test_%'
UNION ALL
SELECT 'Test Voice Transcripts:', COUNT(*) FROM voice_transcripts WHERE conversation_id LIKE 'test_%' OR conversation_id IS NULL
UNION ALL
SELECT 'Test Knowledge Base:', COUNT(*) FROM knowledge_base_rag WHERE source = 'manual';

-- Check learning queue entries created by triggers
SELECT 'Learning Queue Entries Created by Triggers:' as info, COUNT(*) as count
FROM learning_queue
WHERE source_type IN ('feedback', 'correction')
  AND created_at > NOW() - INTERVAL '1 minute';

-- ============================================================================
-- CLEANUP COMMANDS (for manual testing)
-- ============================================================================

-- To clean up test data:
-- DELETE FROM learning_audit_log WHERE performed_by = 'system' AND performed_at > NOW() - INTERVAL '1 hour';
-- DELETE FROM learning_queue WHERE source_id IN (SELECT id FROM owner_corrections WHERE conversation_id LIKE 'test_%');
-- DELETE FROM learning_queue WHERE source_id IN (SELECT id FROM conversation_feedback WHERE conversation_id LIKE 'test_%');
-- DELETE FROM voice_transcripts WHERE conversation_id LIKE 'test_%' OR conversation_id IS NULL;
-- DELETE FROM owner_corrections WHERE conversation_id LIKE 'test_%';
-- DELETE FROM conversation_feedback WHERE conversation_id LIKE 'test_%';
-- DELETE FROM conversations WHERE id LIKE 'test_%';
-- DELETE FROM knowledge_base_rag WHERE source = 'learning_queue' AND metadata->>'test' = 'true';

-- ============================================================================
-- END OF FIXTURES
-- ============================================================================
