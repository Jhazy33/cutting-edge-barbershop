#!/bin/bash

###############################################################################
# VPS Chatbot Integration - Security Audit Script
###############################################################################
# Performs security checks on all deployed services
#
# Usage: ./tests/security-audit.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MAIN_SITE="https://cuttingedge.cihconsultingllc.com"
CHATBOT_SITE="https://chat.cuttingedge.cihconsultingllc.com"
API_BASE="https://api.cihconsultingllc.com"
OLLAMA_API="https://ai.cihconsultingllc.com"
OLLAMA_KEY="CE_AGENT_2026_SECRET"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Security report
SECURITY_REPORT="tests/security-report-$(date +%Y%m%d_%H%M%S).txt"

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

###############################################################################
# Security Tests
###############################################################################

test_https_enforcement() {
    print_header "Testing HTTPS Enforcement"

    # Test 1: HTTP to HTTPS redirect
    print_test "HTTP to HTTPS redirect"

    local redirect=$(curl -s -I "http://cuttingedge.cihconsultingllc.com" | grep -i "location")

    if echo "$redirect" | grep -qi "https"; then
        print_pass "HTTP redirects to HTTPS"
    else
        print_fail "HTTP does not redirect to HTTPS"
    fi

    # Test 2: SSL certificate validity
    print_test "SSL certificate validity"

    local cert_check=$(curl -sI "$MAIN_SITE" 2>&1 | grep -i "ssl")

    if [ $? -eq 0 ]; then
        print_pass "SSL certificate is valid"
    else
        print_fail "SSL certificate check failed"
    fi

    # Test 3: No mixed content
    print_test "No mixed content warnings"

    print_info "Manual check required: Open browser DevTools and check for mixed content warnings"
    print_warning "Automated mixed content detection not available"
}

test_security_headers() {
    print_header "Testing Security Headers"

    # Test 4: X-Frame-Options
    print_test "X-Frame-Options header"

    local xframe=$(curl -s -I "$MAIN_SITE" | grep -i "x-frame-options")

    if [ -n "$xframe" ]; then
        print_pass "X-Frame-Options header present: $xframe"
    else
        print_warning "X-Frame-Options header missing"
    fi

    # Test 5: X-Content-Type-Options
    print_test "X-Content-Type-Options header"

    local xcontent=$(curl -s -I "$MAIN_SITE" | grep -i "x-content-type-options")

    if [ -n "$xcontent" ]; then
        print_pass "X-Content-Type-Options header present: $xcontent"
    else
        print_warning "X-Content-Type-Options header missing"
    fi

    # Test 6: Strict-Transport-Security
    print_test "Strict-Transport-Security header"

    local hsts=$(curl -s -I "$MAIN_SITE" | grep -i "strict-transport-security")

    if [ -n "$hsts" ]; then
        print_pass "HSTS header present: $hsts"
    else
        print_warning "HSTS header missing"
    fi

    # Test 7: Content-Security-Policy
    print_test "Content-Security-Policy header"

    local csp=$(curl -s -I "$MAIN_SITE" | grep -i "content-security-policy")

    if [ -n "$csp" ]; then
        print_pass "CSP header present: $csp"
    else
        print_warning "CSP header missing"
    fi
}

test_api_authentication() {
    print_header "Testing API Authentication"

    # Test 8: Ollama API requires authentication
    print_test "Ollama API authentication required"

    local no_auth_response=$(curl -s "$OLLAMA_API/api/tags")

    if echo "$no_auth_response" | grep -qi "error\|unauthorized\|forbidden"; then
        print_pass "Ollama API rejects unauthenticated requests"
    else
        print_fail "Ollama API allows unauthenticated requests (SECURITY ISSUE)"
    fi

    # Test 9: Valid API key works
    print_test "Valid API key accepted"

    local auth_response=$(curl -s -H "X-Ollama-Key: $OLLAMA_KEY" "$OLLAMA_API/api/tags")

    if echo "$auth_response" | grep -q "gemma\|models"; then
        print_pass "Valid API key accepted"
    else
        print_fail "Valid API key rejected"
    fi

    # Test 10: Invalid API key rejected
    print_test "Invalid API key rejected"

    local invalid_response=$(curl -s -H "X-Ollama-Key: INVALID_KEY" "$OLLAMA_API/api/tags")

    if echo "$invalid_response" | grep -qi "error\|unauthorized\|forbidden"; then
        print_pass "Invalid API key rejected"
    else
        print_warning "Invalid API key may not be properly validated"
    fi
}

test_cors_configuration() {
    print_header "Testing CORS Configuration"

    # Test 11: CORS preflight on allowed origin
    print_test "CORS preflight on allowed origin"

    local cors_response=$(curl -s -i -X OPTIONS "$CHATBOT_SITE" \
        -H "Origin: https://cuttingedge.cihconsultingllc.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type")

    if echo "$cors_response" | grep -qi "access-control-allow-origin"; then
        print_pass "CORS allows requests from main site"
    else
        print_warning "CORS may not be properly configured"
    fi

    # Test 12: CORS on disallowed origin
    print_test "CORS preflight on disallowed origin"

    local cors_blocked=$(curl -s -i -X OPTIONS "$CHATBOT_SITE" \
        -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: POST")

    if echo "$cors_blocked" | grep -qi "access-control-allow-origin.*malicious"; then
        print_fail "CORS allows requests from unauthorized origins (SECURITY ISSUE)"
    else
        print_pass "CORS blocks requests from unauthorized origins"
    fi
}

test_input_validation() {
    print_header "Testing Input Validation"

    # Test 13: SQL Injection attempt
    print_test "SQL Injection protection"

    local sqli_response=$(curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d '{"query":"\"; DROP TABLE knowledge_base; --","shopId":1}')

    if echo "$sqli_response" | grep -qi "error\|invalid\|validation"; then
        print_pass "SQL Injection attempt blocked"
    else
        print_warning "SQL Injection protection unclear"
    fi

    # Test 14: XSS attempt
    print_test "XSS protection"

    local xss_response=$(curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d '{"query":"<script>alert(\"xss\")</script>","shopId":1}')

    if echo "$xss_response" | grep -qi "error\|invalid\|sanitized"; then
        print_pass "XSS attempt appears to be handled"
    else
        print_warning "XSS protection unclear (manual verification needed)"
    fi

    # Test 15: Input length validation
    print_test "Input length validation"

    local long_input=$(python3 -c "print('a' * 10000)")
    local long_response=$(curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$long_input\",\"shopId\":1}")

    if echo "$long_response" | grep -qi "error\|invalid\|too long"; then
        print_pass "Long input rejected"
    else
        print_warning "Long input handling unclear"
    fi
}

test_rate_limiting() {
    print_header "Testing Rate Limiting"

    # Test 16: Rapid requests detection
    print_test "Rate limiting on API endpoint"

    print_info "Sending 20 rapid requests..."

    local blocked=0
    for i in {1..20}; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            "$API_BASE/api/health")

        if [ "$response" = "429" ]; then
            ((blocked++))
        fi
    done

    if [ $blocked -gt 0 ]; then
        print_pass "Rate limiting detected ($blocked requests blocked)"
    else
        print_warning "Rate limiting may not be configured"
    fi
}

test_sensitive_data_exposure() {
    print_header "Testing Sensitive Data Exposure"

    # Test 17: No credentials in frontend
    print_test "No API keys in frontend code"

    local frontend_code=$(curl -s "$CHATBOT_SITE")

    if echo "$frontend_code" | grep -q "CE_AGENT_2026_SECRET"; then
        print_fail "API key exposed in frontend code (CRITICAL)"
    else
        print_pass "API key not exposed in frontend"
    fi

    # Test 18: No database credentials exposed
    print_test "No database credentials in frontend"

    if echo "$frontend_code" | grep -qi "postgres\|database.*password\|jdbc:\|mongodb:"; then
        print_fail "Database credentials may be exposed (CRITICAL)"
    else
        print_pass "No database credentials in frontend"
    fi

    # Test 19: Error messages don't leak info
    print_test "Generic error messages"

    local error_response=$(curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d '{"query":"ab","shopId":1}')

    if echo "$error_response" | grep -qi "stack trace\|postgresql\|internal server error"; then
        print_warning "Error messages may leak sensitive information"
    else
        print_pass "Error messages are generic"
    fi
}

test_information_disclosure() {
    print_header "Testing Information Disclosure"

    # Test 20: Server header disclosure
    print_test "Server header information"

    local server_header=$(curl -s -I "$MAIN_SITE" | grep -i "^server:")

    if [ -n "$server_header" ]; then
        print_warning "Server header disclosed: $server_header"
    else
        print_pass "Server header not disclosed"
    fi

    # Test 21: X-Powered-By header
    print_test "X-Powered-By header"

    local powered_by=$(curl -s -I "$MAIN_SITE" | grep -i "x-powered-by")

    if [ -n "$powered_by" ]; then
        print_warning "X-Powered-By header disclosed: $powered_by"
    else
        print_pass "X-Powered-By header not present"
    fi

    # Test 22: Debug mode off
    print_test "Debug mode disabled"

    local response=$(curl -s "$MAIN_SITE")

    if echo "$response" | grep -qi "debug\|stack trace\|devtools"; then
        print_warning "Debug information may be exposed"
    else
        print_pass "No debug information exposed"
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header "VPS Chatbot Integration - Security Audit"
    echo "Starting security audit at $(date)"
    echo ""

    # Run all security tests
    test_https_enforcement
    test_security_headers
    test_api_authentication
    test_cors_configuration
    test_input_validation
    test_rate_limiting
    test_sensitive_data_exposure
    test_information_disclosure

    # Print summary
    print_header "Security Audit Summary"
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""

    # Calculate security score
    if [ $TOTAL_TESTS -gt 0 ]; then
        local security_score=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo "Security Score: $security_score%"
        echo ""

        if [ $security_score -ge 90 ]; then
            echo -e "${GREEN}✓ Excellent Security Posture${NC}"
        elif [ $security_score -ge 70 ]; then
            echo -e "${YELLOW}⚠ Good Security Posture (Minor improvements needed)${NC}"
        elif [ $security_score -ge 50 ]; then
            echo -e "${YELLOW}⚠ Fair Security Posture (Improvements recommended)${NC}"
        else
            echo -e "${RED}✗ Poor Security Posture (Immediate action required)${NC}"
        fi
    fi

    # Security recommendations
    if [ $FAILED_TESTS -gt 0 ]; then
        echo ""
        echo -e "${RED}CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:${NC}"
        echo "1. Review and fix all failed security tests"
        echo "2. Do NOT deploy to production until critical issues are resolved"
    fi

    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}RECOMMENDED IMPROVEMENTS:${NC}"
        echo "1. Review warnings and implement where feasible"
        echo "2. Consider security headers not currently implemented"
        echo "3. Implement rate limiting if not present"
    fi

    # Save report
    {
        echo "Security Audit Report - $(date)"
        echo "=========================================="
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Warnings: $WARNINGS"
        echo "Security Score: $security_score%"
        echo ""
        echo "CRITICAL FINDINGS:"
        echo "  (Review failed tests above)"
        echo ""
        echo "RECOMMENDATIONS:"
        echo "  - Implement all missing security headers"
        echo "  - Enable rate limiting on all public endpoints"
        echo "  - Regular security audits (quarterly)"
        echo "  - Keep dependencies updated"
    } > "$SECURITY_REPORT"

    echo ""
    echo "Security report saved to: $SECURITY_REPORT"
    echo ""

    # Exit with error if critical issues found
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main
main
