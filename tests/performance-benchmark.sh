#!/bin/bash

###############################################################################
# VPS Chatbot Integration - Performance Benchmark Script
###############################################################################
# Measures performance metrics for all deployed services
#
# Usage: ./tests/performance-benchmark.sh
###############################################################################

set -e

# Colors
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

# Results file
BENCHMARK_REPORT="tests/benchmark-results-$(date +%Y%m%d_%H%M%S).txt"

# Arrays to store results
declare -a main_site_times=()
declare -a chatbot_times=()
declare -a api_times=()
declare -a ollama_times=()

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

measure_load_time() {
    local url=$1
    local name=$2

    # Make 5 requests and calculate average
    local total_time=0
    local iterations=5

    for i in $(seq 1 $iterations); do
        local time=$(curl -s -o /dev/null -w "%{time_total}" "$url")
        total_time=$(echo "$total_time + $time" | bc)
    done

    local avg_time=$(echo "scale=3; $total_time / $iterations" | bc)
    local avg_time_ms=$(echo "scale=0; $avg_time * 1000" | bc)

    echo "$name: ${avg_time_ms}ms (average of $iterations requests)"

    return 0
}

measure_dns_lookup() {
    local url=$1
    local domain=$(echo "$url" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

    print_info "DNS lookup time for $domain"

    # Use curl to measure DNS time
    local dns_time=$(curl -s -o /dev/null -w "%{time_namelookup}" "$url")

    local dns_time_ms=$(echo "scale=0; $dns_time * 1000" | bc)
    echo "  DNS Lookup: ${dns_time_ms}ms"
}

measure_tcp_connection() {
    local url=$1

    local tcp_time=$(curl -s -o /dev/null -w "%{time_connect}" "$url")
    local dns_time=$(curl -s -o /dev/null -w "%{time_namelookup}" "$url")

    local tcp_time_ms=$(echo "scale=0; ($tcp_time - $dns_time) * 1000" | bc)
    echo "  TCP Connection: ${tcp_time_ms}ms"
}

measure_tls_handshake() {
    local url=$1

    local tls_time=$(curl -s -o /dev/null -w "%{time_appconnect}" "$url")
    local tcp_time=$(curl -s -o /dev/null -w "%{time_connect}" "$url")

    local tls_time_ms=$(echo "scale=0; ($tls_time - $tcp_time) * 1000" | bc)
    echo "  TLS Handshake: ${tls_time_ms}ms"
}

measure_server_processing() {
    local url=$1

    local server_time=$(curl -s -o /dev/null -w "%{time_starttransfer}" "$url")
    local tls_time=$(curl -s -o /dev/null -w "%{time_appconnect}" "$url")

    local server_time_ms=$(echo "scale=0; ($server_time - $tls_time) * 1000" | bc)
    echo "  Server Processing: ${server_time_ms}ms"
}

measure_content_download() {
    local url=$1

    local total_time=$(curl -s -o /dev/null -w "%{time_total}" "$url")
    local server_time=$(curl -s -o /dev/null -w "%{time_starttransfer}" "$url")

    local download_time_ms=$(echo "scale=0; ($total_time - $server_time) * 1000" | bc)
    echo "  Content Download: ${download_time_ms}ms"
}

measure_api_response() {
    local url=$1
    local name=$2

    print_info "Measuring $name"

    # Make 10 requests for statistical significance
    local iterations=10
    local total_time=0
    local min_time=999
    local max_time=0

    for i in $(seq 1 $iterations); do
        local start=$(date +%s%N)
        local response=$(curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -d '{"query":"haircut prices","shopId":1}')
        local end=$(date +%s%N)

        local duration=$(echo "scale=3; ($end - $start) / 1000000" | bc)
        total_time=$(echo "$total_time + $duration" | bc)

        # Track min/max
        if (( $(echo "$duration < $min_time" | bc -l) )); then
            min_time=$duration
        fi
        if (( $(echo "$duration > $max_time" | bc -l) )); then
            max_time=$duration
        fi
    done

    local avg_time=$(echo "scale=3; $total_time / $iterations" | bc)
    local avg_time_ms=$(echo "scale=0; $avg_time" | bc)
    local min_time_ms=$(echo "scale=0; $min_time" | bc)
    local max_time_ms=$(echo "scale=0; $max_time" | bc)

    echo "  Average: ${avg_time_ms}ms"
    echo "  Min: ${min_time_ms}ms"
    echo "  Max: ${max_time_ms}ms"
}

check_response_size() {
    local url=$1
    local name=$2

    local size=$(curl -s "$url" | wc -c)
    local size_kb=$(echo "scale=2; $size / 1024" | bc)

    echo "$name: ${size_kb}KB"
}

###############################################################################
# Benchmark Suites
###############################################################################

benchmark_main_site() {
    print_header "Main Website Performance"

    measure_dns_lookup "$MAIN_SITE"
    measure_tcp_connection "$MAIN_SITE"
    measure_tls_handshake "$MAIN_SITE"
    measure_server_processing "$MAIN_SITE"
    measure_content_download "$MAIN_SITE"
    echo ""

    measure_load_time "$MAIN_SITE" "Main Site Load Time"
    check_response_size "$MAIN_SITE" "Main Site Response Size"
}

benchmark_chatbot() {
    print_header "Chatbot UI Performance"

    measure_dns_lookup "$CHATBOT_SITE"
    measure_tcp_connection "$CHATBOT_SITE"
    measure_tls_handshake "$CHATBOT_SITE"
    measure_server_processing "$CHATBOT_SITE"
    measure_content_download "$CHATBOT_SITE"
    echo ""

    measure_load_time "$CHATBOT_SITE" "Chatbot Load Time"
    check_response_size "$CHATBOT_SITE" "Chatbot Response Size"
}

benchmark_api() {
    print_header "API Performance"

    # Health endpoint
    print_info "Health Check Endpoint"
    measure_load_time "$API_BASE/api/health" "Health Check Response"

    echo ""
    measure_api_response "$API_BASE/api/knowledge/search" "Knowledge Search API"
}

benchmark_database() {
    print_header "Database Performance"

    print_info "Database performance requires direct connection"
    echo "Run this command on VPS:"
    echo "  ssh contabo-vps 'docker exec -it cutting-edge-cutting-edge-db-1 psql -U jhazy -d nexxt_db -c \"EXPLAIN ANALYZE SELECT * FROM conversations LIMIT 10;\"'"
}

###############################################################################
# Performance Targets
###############################################################################

check_performance_targets() {
    print_header "Performance Targets Assessment"

    echo "Performance Targets vs Actual:"
    echo ""

    # Main site target: < 3 seconds
    local main_site_time=$(curl -s -o /dev/null -w "%{time_total}" "$MAIN_SITE")
    local main_site_ms=$(echo "$main_site_time * 1000" | bc)

    echo -n "Main Site Load Time (< 3000ms): "
    if (( $(echo "$main_site_time < 3.0" | bc -l) )); then
        echo -e "${GREEN}PASS${NC} (${main_site_ms}ms)"
    else
        echo -e "${YELLOW}WARN${NC} (${main_site_ms}ms)"
    fi

    # Chatbot target: < 2 seconds
    local chatbot_time=$(curl -s -o /dev/null -w "%{time_total}" "$CHATBOT_SITE")
    local chatbot_ms=$(echo "$chatbot_time * 1000" | bc)

    echo -n "Chatbot Load Time (< 2000ms): "
    if (( $(echo "$chatbot_time < 2.0" | bc -l) )); then
        echo -e "${GREEN}PASS${NC} (${chatbot_ms}ms)"
    else
        echo -e "${YELLOW}WARN${NC} (${chatbot_ms}ms)"
    fi

    # API target: < 500ms
    local api_start=$(date +%s%N)
    curl -s "$API_BASE/api/health" > /dev/null
    local api_end=$(date +%s%N)
    local api_time=$(echo "scale=3; ($api_end - $api_start) / 1000000" | bc)
    local api_ms=$(echo "$api_time * 1000" | bc)

    echo -n "API Response Time (< 500ms): "
    if (( $(echo "$api_time < 0.5" | bc -l) )); then
        echo -e "${GREEN}PASS${NC} (${api_ms}ms)"
    else
        echo -e "${YELLOW}WARN${NC} (${api_ms}ms)"
    fi

    # Knowledge search target: < 1000ms
    local search_start=$(date +%s%N)
    curl -s -X POST "$API_BASE/api/knowledge/search" \
        -H "Content-Type: application/json" \
        -d '{"query":"haircut prices","shopId":1}' > /dev/null
    local search_end=$(date +%s%N)
    local search_time=$(echo "scale=3; ($search_end - $search_start) / 1000000" | bc)
    local search_ms=$(echo "$search_time * 1000" | bc)

    echo -n "Knowledge Search (< 1000ms): "
    if (( $(echo "$search_time < 1.0" | bc -l) )); then
        echo -e "${GREEN}PASS${NC} (${search_ms}ms)"
    else
        echo -e "${YELLOW}WARN${NC} (${search_ms}ms)"
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header "VPS Chatbot Integration - Performance Benchmark"
    echo "Starting benchmark at $(date)"
    echo ""

    # Run benchmarks
    benchmark_main_site
    benchmark_chatbot
    benchmark_api
    benchmark_database
    check_performance_targets

    # Save report
    {
        echo "Performance Benchmark Report - $(date)"
        echo "=========================================="
        echo ""
        echo "Note: Full results displayed above"
    } > "$BENCHMARK_REPORT"

    echo ""
    print_info "Benchmark report saved to: $BENCHMARK_REPORT"
    echo ""
}

# Run main
main
