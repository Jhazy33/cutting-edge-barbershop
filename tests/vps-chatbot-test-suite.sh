#!/bin/bash

###############################################################################
# VPS Chatbot Integration - Automated Test Suite
###############################################################################
# Tests the complete deployment of:
# - Main Website: https://cuttingedge.cihconsultingllc.com
# - Chatbot UI: https://chat.cuttingedge.cihconsultingllc.com
# - RAG API: https://api.cihconsultingllc.com
# - Ollama API: https://ai.cihconsultingllc.com
#
# Usage: ./tests/vps-chatbot-test-suite.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Configuration
MAIN_SITE="https://cuttingedge.cihconsultingllc.com"
CHATBOT_SITE="https://chat.cuttingedge.cihconsultingllc.com"
API_BASE="https://api.cihconsultingllc.com"
OLLAMA_API="https://ai.cihconsultingllc.com"
OLLAMA_KEY="CE_AGENT_2026_SECRET"

# Test results file
TEST_REPORT="tests/test-results-$(date +%Y%m%d_%H%M%S).txt"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    ((TOTAL_TESTS++))
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

assert_http_status() {
    local url=$1
    local expected_status=$2
    local test_name=$3

    print_test "$test_name"

    local response=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")

    if [ "$response" = "$expected_status" ]; then
        print_pass "$test_name - HTTP $response"
        return 0
    else
        print_fail "$test_name - Expected HTTP $expected_status, got HTTP $response"
        return 1
    fi
}

assert_contains() {
    local url=$1
    local search_string=$2
    local test_name=$3

    print_test "$test_name"

    local response=$(curl -s -L "$url")

    if echo "$response" | grep -q "$search_string"; then
        print_pass "$test_name - Found '$search_string'"
        return 0
    else
        print_fail "$test_name - Could not find '$search_string'"
        return 1
    fi
}

###############################################################################
# Test Suites
###############################################################################

test_main_website() {
    print_header "Testing Main Website"

    # Test 1: Main site is accessible
    assert_http_status "$MAIN_SITE" "200" "Main website loads"

    # Test 2: Check for essential elements
    assert_contains "$MAIN_SITE" "Cutting Edge" "Main site title present"
    assert_contains "$MAIN_SITE" "Need Help" "Need Help button present"
    assert_contains "$MAIN_SITE" "Digital Client" "Digital Concierge modal present"
}

test_chatbot_ui() {
    print_header "Testing Chatbot UI"

    # Test 3: Chatbot UI is accessible
    assert_http_status "$CHATBOT_SITE" "200" "Chatbot UI loads"

    # Test 4: Check for chatbot elements
    assert_contains "$CHATBOT_SITE" "Digital Concierge" "Chatbot title present"
    assert_contains "$CHATBOT_SITE" "gemma" "Model information present"
    assert_contains "$CHATBOT_SITE" "Sovereign AI" "AI badge present"
}

test_api_health() {
    print_header "Testing API Health Endpoints"

    # Test 5: RAG API health check
    print_test "RAG API health check"

    local health_response=$(curl -s "$API_BASE/api/health")
    local status=$(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [ "$status" = "ok" ]; then
        print_pass "RAG API health check - Status: $status"
    else
        print_fail "RAG API health check - Status: $status"
    fi

    # Test 6: Ollama API model list
    print_test "Ollama API models endpoint"

    local ollama_response=$(curl -s -H "X-Ollama-Key: $OLLAMA_KEY" "$OLLAMA_API/api/tags")

    if echo "$ollama_response" | grep -q "gemma"; then
        print_pass "Ollama API - gemma model available"
    else
        print_fail "Ollama API - gemma model not found"
    fi
}

test_rag_api() {
    print_header "Testing RAG API Endpoints"

    # Test 7: Knowledge base search
    print_test "Knowledge base search endpoint"

    local search_response=$(curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d '{"query":"haircut prices","shopId":1,"limit":3}')

    local count=$(echo "$search_response" | grep -o '"count":[0-9]*' | cut -d':' -f2)

    if [ -n "$count" ] && [ "$count" -ge 0 ]; then
        print_pass "Knowledge search returned $count results"
    else
        print_fail "Knowledge search failed"
    fi

    # Test 8: Input validation
    print_test "Knowledge base input validation"

    local validation_response=$(curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d '{"query":"ab","shopId":1}')

    if echo "$validation_response" | grep -q "error"; then
        print_pass "Input validation working - rejects short queries"
    else
        print_fail "Input validation not working"
    fi
}

test_cors_configuration() {
    print_header "Testing CORS Configuration"

    # Test 9: CORS preflight request
    print_test "CORS preflight OPTIONS request"

    local cors_headers=$(curl -s -I -X OPTIONS "$CHATBOT_SITE" \
        -H "Origin: https://cuttingedge.cihconsultingllc.com" \
        -H "Access-Control-Request-Method: POST")

    if echo "$cors_headers" | grep -qi "access-control"; then
        print_pass "CORS headers present"
    else
        print_warning "CORS headers may not be properly configured"
    fi
}

test_security_headers() {
    print_header "Testing Security Headers"

    # Test 10: HTTPS enforcement
    print_test "HTTPS enforcement"

    local redirect=$(curl -s -I "http://cuttingedge.cihconsultingllc.com" | grep -i "location")

    if echo "$redirect" | grep -qi "https"; then
        print_pass "HTTP to HTTPS redirect working"
    else
        print_warning "HTTP to HTTPS redirect may not be working"
    fi

    # Test 11: X-Ollama-Key enforcement
    print_test "Ollama API key enforcement"

    local unauthorized_response=$(curl -s "$OLLAMA_API/api/tags")

    if echo "$unauthorized_response" | grep -qi "error\|unauthorized\|forbidden"; then
        print_pass "Ollama API requires authentication"
    else
        print_warning "Ollama API may not require authentication"
    fi
}

test_database_connectivity() {
    print_header "Testing Database Connectivity"

    # Test 12: Check if database is accessible from VPS
    print_test "Database connection check"

    print_info "This test requires SSH access to VPS. Run manually:"
    echo "  ssh contabo-vps 'docker exec -it cutting-edge-cutting-edge-db-1 psql -U jhazy -d nexxt_db -c \"SELECT COUNT(*) FROM conversations;\"'"

    print_warning "Database connectivity test requires manual verification"
}

test_performance() {
    print_header "Testing Performance"

    # Test 13: Main site load time
    print_test "Main site load time"

    local load_time=$(curl -s -o /dev/null -w "%{time_total}" "$MAIN_SITE")
    local load_time_ms=$(echo "$load_time * 1000" | bc)

    if (( $(echo "$load_time < 3.0" | bc -l) )); then
        print_pass "Main site loads in ${load_time_ms}ms"
    else
        print_warning "Main site slow: ${load_time_ms}ms"
    fi

    # Test 14: Chatbot UI load time
    print_test "Chatbot UI load time"

    local chatbot_load_time=$(curl -s -o /dev/null -w "%{time_total}" "$CHATBOT_SITE")
    local chatbot_load_time_ms=$(echo "$chatbot_load_time * 1000" | bc)

    if (( $(echo "$chatbot_load_time < 2.0" | bc -l) )); then
        print_pass "Chatbot UI loads in ${chatbot_load_time_ms}ms"
    else
        print_warning "Chatbot UI slow: ${chatbot_load_time_ms}ms"
    fi
}

test_end_to_end_chat() {
    print_header "Testing End-to-End Chat Flow"

    print_info "End-to-end chat test requires manual verification:"
    echo "  1. Visit $CHATBOT_SITE"
    echo "  2. Send message: 'What are your hours?'"
    echo "  3. Verify response is generated"
    echo "  4. Check browser DevTools Network tab for:"
    echo "     - API call to $API_BASE/api/knowledge/search"
    echo "     - API call to $OLLAMA_API/api/chat"
    echo "  5. Verify conversation saved to database"

    print_warning "End-to-end chat test requires manual verification"
}

###############################################################################
# Main Test Execution
###############################################################################

main() {
    print_header "VPS Chatbot Integration - Test Suite"
    echo "Starting tests at $(date)"
    echo ""

    # Run all test suites
    test_main_website
    test_chatbot_ui
    test_api_health
    test_rag_api
    test_cors_configuration
    test_security_headers
    test_database_connectivity
    test_performance
    test_end_to_end_chat

    # Print summary
    print_header "Test Summary"
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""

    # Calculate pass rate
    if [ $TOTAL_TESTS -gt 0 ]; then
        local pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo "Pass Rate: $pass_rate%"
        echo ""

        if [ $pass_rate -ge 80 ]; then
            echo -e "${GREEN}✓ Deployment is HEALTHY${NC}"
        elif [ $pass_rate -ge 50 ]; then
            echo -e "${YELLOW}⚠ Deployment has ISSUES${NC}"
        else
            echo -e "${RED}✗ Deployment is CRITICAL${NC}"
        fi
    fi

    # Save report
    {
        echo "Test Report - $(date)"
        echo "=========================================="
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Warnings: $WARNINGS"
        echo "Pass Rate: $pass_rate%"
    } > "$TEST_REPORT"

    echo ""
    echo "Test report saved to: $TEST_REPORT"
    echo ""

    # Exit with error code if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main
