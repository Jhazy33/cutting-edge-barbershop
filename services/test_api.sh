#!/bin/bash

# Test script for RAG integration
# This script tests the knowledge search and learn endpoints

API_URL="${API_URL:-http://localhost:3000}"

echo "======================================"
echo "RAG Integration Test Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET $API_URL/api/health"
response=$(curl -s "$API_URL/api/health")
echo "Response: $response"
echo ""

# Test 2: Add Knowledge
echo -e "${YELLOW}Test 2: Add Knowledge${NC}"
echo "POST $API_URL/api/knowledge/learn"
response=$(curl -s -X POST "$API_URL/api/knowledge/learn" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 1,
    "content": "Haircuts at Cutting Edge cost $30 for adults and $20 for children under 12. Premium services include hot towel shaves ($25) and beard trims ($15).",
    "category": "pricing",
    "source": "test"
  }')
echo "Response: $response"
echo ""

# Test 3: Search Knowledge
echo -e "${YELLOW}Test 3: Search Knowledge${NC}"
echo "POST $API_URL/api/knowledge/search"
response=$(curl -s -X POST "$API_URL/api/knowledge/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "how much does a haircut cost",
    "shopId": 1,
    "limit": 3,
    "threshold": 0.5
  }')
echo "Response: $response"
echo ""

# Test 4: Add Hours Knowledge
echo -e "${YELLOW}Test 4: Add Hours Knowledge${NC}"
echo "POST $API_URL/api/knowledge/learn"
response=$(curl -s -X POST "$API_URL/api/knowledge/learn" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 1,
    "content": "Cutting Edge is open Monday-Friday 9AM-7PM, Saturday 9AM-6PM, and closed on Sundays. Walk-ins welcome!",
    "category": "hours",
    "source": "test"
  }')
echo "Response: $response"
echo ""

# Test 5: Search Hours
echo -e "${YELLOW}Test 5: Search Hours${NC}"
echo "POST $API_URL/api/knowledge/search"
response=$(curl -s -X POST "$API_URL/api/knowledge/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "what are your hours",
    "shopId": 1,
    "limit": 3,
    "threshold": 0.5
  }')
echo "Response: $response"
echo ""

echo -e "${GREEN}======================================"
echo "Tests Complete!"
echo "======================================${NC}"
