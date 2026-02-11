#!/bin/bash

# ============================================================================
# Cleanup Test Data Script
# Description: Removes all test data from learning system tables
# Author: Database Architect
# Date: 2025-02-09
#
# Usage:
#   chmod +x cleanup_test_data.sh
#   ./cleanup_test_data.sh
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

# Connection string
PSQL="psql -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} -d ${DB_NAME}"

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}Cleaning Up Test Data${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "User: ${DB_USER}"
echo ""
echo "⚠️  This will remove ALL test data from the learning system tables."
echo ""

# Confirm before proceeding
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Removing test data..."
echo ""

# Create cleanup SQL script
cat > /tmp/cleanup_learning_test_data.sql << EOF
-- Begin transaction for safety
BEGIN;

-- Show counts before cleanup
SELECT '========================================' as "";
SELECT 'BEFORE Cleanup' as "";
SELECT '========================================' as "";

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

-- Delete test conversations (will cascade to dependent tables)
DELETE FROM conversations
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '99999999-9999-9999-9999-999999999999',
  '88888888-8888-8888-8888-888888888888'
);

-- Delete any remaining test data (in case cascade didn't catch it)
DELETE FROM learning_queue
WHERE metadata ? 'test_trigger'
   OR metadata ? 'test_timestamp'
   OR metadata ? 'test_confidence'
   OR source_id IN (
     SELECT id FROM conversation_feedback WHERE metadata ? 'test_trigger'
   )
   OR source_id IN (
     SELECT id FROM owner_corrections WHERE metadata ? 'test_trigger'
   );

DELETE FROM conversation_feedback WHERE metadata ? 'test_trigger';
DELETE FROM owner_corrections WHERE metadata ? 'test_trigger';
DELETE FROM voice_transcripts WHERE metadata ? 'test_trigger';
DELETE FROM response_analytics WHERE ab_test_variant IS NOT NULL;

-- Show counts after cleanup
SELECT '========================================' as "";
SELECT 'AFTER Cleanup' as "";
SELECT '========================================' as "";

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

COMMIT;

SELECT '========================================' as "";
SELECT '✓ Cleanup completed successfully!' as "";
SELECT '========================================' as "";
EOF

# Run cleanup
if ${PSQL} -f /tmp/cleanup_learning_test_data.sql; then
    echo -e "${GREEN}✓ Test data removed successfully${NC}"
else
    echo -e "${RED}✗ Cleanup failed!${NC}"
    rm -f /tmp/cleanup_learning_test_data.sql
    exit 1
fi

rm -f /tmp/cleanup_learning_test_data.sql

echo ""
echo "Refresh materialized views to update metrics..."
${PSQL} -c "REFRESH MATERIALIZED VIEW daily_learning_metrics;"
${PSQL} -c "REFRESH MATERIALIZED VIEW response_performance_metrics;"

echo -e "${GREEN}✓ Materialized views refreshed${NC}"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Cleanup Complete${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "All test data has been removed from the learning system tables."
echo "Materialized views have been refreshed to reflect the changes."
echo ""

exit 0
