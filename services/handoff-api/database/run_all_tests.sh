#!/bin/bash

# ============================================================================
# Run All Learning System Tests
# Description: Executes verification, test data, and trigger tests
# Author: Database Architect
# Date: 2025-02-09
#
# Usage:
#   chmod +x run_all_tests.sh
#   ./run_all_tests.sh
#
# Environment Variables:
#   DB_NAME - Database name (default: postgres)
#   DB_USER - Database user (default: postgres)
#   DB_HOST - Database host (default: localhost)
#   DB_PORT - Database port (default: 5432)
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection parameters
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Connection string
PSQL="psql -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} -d ${DB_NAME}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Learning System Test Suite${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "User: ${DB_USER}"
echo ""

# ============================================================================
# SECTION 1: Verification
# ============================================================================

echo -e "${YELLOW}SECTION 1: Verifying Database Objects${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

if ${PSQL} -f "${SCRIPT_DIR}/verify_learning_tables.sql"; then
    echo -e "${GREEN}✓ Verification completed successfully${NC}"
else
    echo -e "${RED}✗ Verification failed!${NC}"
    echo "Please ensure migration 002_create_learning_tables.sql has been run."
    exit 1
fi

echo ""
echo ""

# ============================================================================
# SECTION 2: Insert Test Data
# ============================================================================

echo -e "${YELLOW}SECTION 2: Inserting Test Data${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Create temporary SQL script that commits test data
cat > /tmp/insert_test_data.sql << EOF
BEGIN;
\i ${SCRIPT_DIR}/test_data_learning.sql
COMMIT;

-- Display summary
SELECT '========================================' as "";
SELECT 'Test Data Inserted Successfully' as "";
SELECT '========================================' as "";

SELECT
  'conversations' as table_name,
  COUNT(*) as count
FROM conversations
WHERE id LIKE '%11%' OR id LIKE '%22%' OR id LIKE '%33%' OR id LIKE '%44%' OR id LIKE '%55%'

UNION ALL

SELECT
  'conversation_feedback' as table_name,
  COUNT(*) as count
FROM conversation_feedback

UNION ALL

SELECT
  'owner_corrections' as table_name,
  COUNT(*) as count
FROM owner_corrections

UNION ALL

SELECT
  'voice_transcripts' as table_name,
  COUNT(*) as count
FROM voice_transcripts

UNION ALL

SELECT
  'response_analytics' as table_name,
  COUNT(*) as count
FROM response_analytics

UNION ALL

SELECT
  'learning_queue' as table_name,
  COUNT(*) as count
FROM learning_queue;
EOF

if ${PSQL} -f /tmp/insert_test_data.sql; then
    echo -e "${GREEN}✓ Test data inserted successfully${NC}"
else
    echo -e "${RED}✗ Test data insertion failed!${NC}"
    exit 1
fi

rm -f /tmp/insert_test_data.sql

echo ""
echo ""

# ============================================================================
# SECTION 3: Test Triggers
# ============================================================================

echo -e "${YELLOW}SECTION 3: Testing Triggers${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Create temporary SQL script that runs trigger tests and rolls back
cat > /tmp/test_triggers.sql << EOF
BEGIN;
\i ${SCRIPT_DIR}/test_triggers.sql

-- Display summary before rollback
SELECT '========================================' as "";
SELECT 'Trigger Tests Completed' as "";
SELECT 'Test data will be rolled back...' as "";
SELECT '========================================' as "";

ROLLBACK;
EOF

if ${PSQL} -f /tmp/test_triggers.sql; then
    echo -e "${GREEN}✓ Trigger tests completed successfully${NC}"
else
    echo -e "${RED}✗ Trigger tests failed!${NC}"
    exit 1
fi

rm -f /tmp/test_triggers.sql

echo ""
echo ""

# ============================================================================
# SECTION 4: Materialized Views
# ============================================================================

echo -e "${YELLOW}SECTION 4: Refreshing Materialized Views${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

${PSQL} -c "REFRESH MATERIALIZED VIEW daily_learning_metrics;"

${PSQL} -c "REFRESH MATERIALIZED VIEW response_performance_metrics;"

echo -e "${GREEN}✓ Materialized views refreshed${NC}"

echo ""
echo ""

# ============================================================================
# SECTION 5: Final Summary
# ============================================================================

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}TEST SUITE COMPLETE${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Display learning queue summary
echo "Learning Queue Summary:"
echo "------------------------"

${PSQL} << EOF
SELECT
  status,
  source_type,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM learning_queue
GROUP BY status, source_type
ORDER BY status, source_type;
EOF

echo ""
echo "High Confidence Items (ready for application):"
echo "------------------------------------------------"

${PSQL} << EOF
SELECT
  id,
  source_type,
  status,
  confidence_score,
  LEFT(proposed_content, 50) as content_preview
FROM learning_queue
WHERE confidence_score >= 80
ORDER BY confidence_score DESC
LIMIT 10;
EOF

echo ""
echo "Voice Transcript Sentiment Distribution:"
echo "-----------------------------------------"

${PSQL} << EOF
SELECT
  sentiment,
  COUNT(*) as count
FROM voice_transcripts
GROUP BY sentiment
ORDER BY count DESC;
EOF

echo ""
echo "Response Performance (Conversions):"
echo "-------------------------------------"

${PSQL} << EOF
SELECT
  response_type,
  COUNT(*) as total_responses,
  SUM(CASE WHEN led_to_conversion THEN 1 ELSE 0 END) as conversions,
  ROUND(100.0 * SUM(CASE WHEN led_to_conversion THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate_pct
FROM response_analytics
GROUP BY response_type
ORDER BY conversions DESC;
EOF

echo ""
echo -e "${GREEN}✓ All tests completed successfully!${NC}"
echo ""
echo "Test data is now in the database. To remove it:"
echo "  ${PSQL} -c \"DELETE FROM learning_queue WHERE source_id IN (SELECT id FROM conversation_feedback WHERE metadata ? 'test_trigger');\""
echo "  ${PSQL} -c \"DELETE FROM conversation_feedback WHERE metadata ? 'test_trigger';\""
echo "  ${PSQL} -c \"DELETE FROM owner_corrections WHERE metadata ? 'test_trigger';\""
echo "  ${PSQL} -c \"DELETE FROM voice_transcripts WHERE metadata ? 'test_trigger';\""
echo "  ${PSQL} -c \"DELETE FROM response_analytics WHERE ab_test_variant IS NOT NULL;\""
echo ""
echo "Or use the cleanup script: ./cleanup_test_data.sh"
echo ""
echo -e "${BLUE}============================================${NC}"

exit 0
