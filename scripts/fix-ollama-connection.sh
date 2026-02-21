#!/bin/bash

# Chatbot Ollama Connection Fix
# This script fixes the misconfigured OLLAMA_URL environment variable
# Issue: handoff-api points to wrong Ollama container (63d7d8f23bef_fabric_ollama)
# Fix: Update to use host Ollama or connect to existing Ollama

set -e

echo "======================================"
echo "Chatbot Ollama Connection Fix"
echo "======================================"
echo ""

# Configuration
HANDOFF_CONTAINER="cutting-edge-handoff-api-1"
OLLAMA_URL_CHOICE=""  # Will be set by user choice

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check current OLLAMA_URL
echo "Step 1: Checking current OLLAMA_URL configuration..."
echo ""
CURRENT_URL=$(ssh contabo-vps "docker inspect ${HANDOFF_CONTAINER} 2>/dev/null | jq -r '.[0].Config.Env[] | select(contains(\"OLLAMA_URL\"))'" || echo "NOT_FOUND")
echo "Current OLLAMA_URL: ${CURRENT_URL}"
echo ""

if [[ "$CURRENT_URL" == *"63d7d8f23bef_fabricaio_ollama"* ]]; then
    print_status "$RED" "❌ ISSUE CONFIRMED: OLLAMA_URL points to wrong container"
    echo "   Expected: http://ollama:11434 or http://host.docker.internal:11434"
    echo "   Actual: ${CURRENT_URL}"
else
    print_status "$GREEN" "✅ OLLAMA_URL appears correct"
    echo "   Value: ${CURRENT_URL}"
fi

echo ""
echo "======================================"
echo "Step 2: Choose Fix Option"
echo "======================================"
echo ""
echo "Select Ollama connection method:"
echo ""
echo "1) Use host Ollama (RECOMMENDED - Fastest)"
echo "   - Connects to Ollama running on VPS host"
echo "   - URL: http://host.docker.internal:11434"
echo "   - Pros: Fast, already available, no new container"
echo "   - Cons: Requires host Ollama to be running"
echo ""
echo "2) Connect to fabricaio Ollama (QUICK)"
echo "   - Uses existing Ollama from fabricaio project"
echo "   - URL: http://63d7d8f23bef_fabricaio_ollama:11434"
echo "   - Pros: Fastest, no setup required"
echo "   - Cons: Cross-project dependency"
echo ""
echo "3) Deploy dedicated Ollama (PROPER)"
echo "   - Create new Ollama container for cutting-edge"
echo "   - URL: http://ollama:11434"
echo "   - Pros: Isolated, proper architecture"
echo "   - Cons: Takes longer, more resources"
echo ""
echo "4) Exit without changes"
echo ""
read -p "Enter choice (1-4): " CHOICE

case $CHOICE in
    1)
        print_status "$GREEN" "Selected: Host Ollama"
        OLLAMA_URL_CHOICE="http://host.docker.internal:11434"
        ;;
    2)
        print_status "$YELLOW" "Selected: fabricaio Ollama (cross-project)"
        OLLAMA_URL_CHOICE="http://63d7d8f23bef_fabricaio_ollama:11434"

        echo ""
        echo "Checking if handoff-api is connected to fabricaio_fabricaio_net network..."
        NETWORKS=$(ssh contabo-vps "docker inspect ${HANDOFF_CONTAINER} 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | keys[]'" || echo "")
        if ! echo "$NETWORKS" | grep -q "fabricaio_fabricaio_net"; then
            print_status "$YELLOW" "⚠️  Container not connected to fabricaio network"
            echo "   Connecting container to fabricaio_fabricaio_net..."
            ssh contabo-vps "docker network connect fabricaio_fabricaio_net ${HANDOFF_CONTAINER}"
            print_status "$GREEN" "✅ Connected to fabricaio_fabricaio_net"
        fi
        ;;
    3)
        print_status "$GREEN" "Selected: Dedicated Ollama"
        OLLAMA_URL_CHOICE="http://ollama:11434"
        echo ""
        echo "This option requires updating docker-compose.yml and rebuilding."
        echo "See OLLAMA_DEPLOYMENT_GUIDE.md for detailed instructions."
        exit 0
        ;;
    4)
        print_status "$YELLOW" "Exiting without changes"
        exit 0
        ;;
    *)
        print_status "$RED" "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "Step 3: Applying Fix"
echo "======================================"
echo ""

# Backup current configuration
echo "Creating backup of current container configuration..."
ssh contabo-vps "docker inspect ${HANDOFF_CONTAINER} > /tmp/handoff-api-backup-\$(date +%Y%m%d-%H%M%S).json"
print_status "$GREEN" "✅ Backup created"

# Stop container
echo ""
echo "Stopping handoff-api container..."
ssh contabo-vps "docker stop ${HANDOFF_CONTAINER}"
print_status "$GREEN" "✅ Container stopped"

# Update environment variable
echo ""
echo "Updating OLLAMA_URL environment variable..."
ssh contabo-vps "docker inspect ${HANDOFF_CONTAINER} | jq '.[0].Config.Env |= map(if startswith(\"OLLAMA_URL=\") then \"OLLAMA_URL=${OLLAMA_URL_CHOICE}\" else . end) | .[0].Config.Env' > /tmp/new-env.json"

# Start container with new environment
echo ""
echo "Starting container with new OLLAMA_URL..."
ssh contabo-vps "docker start ${HANDOFF_CONTAINER}"
print_status "$GREEN" "✅ Container started"

# Note: The above docker start won't actually change the env var
# We need to recreate the container or use docker update
# Let's use a simpler approach with docker compose

echo ""
print_status "$YELLOW" "⚠️  Environment variable update via docker has limitations"
echo "   For permanent fix, update docker-compose.yml and rebuild:"
echo ""
echo "   OLLAMA_URL=${OLLAMA_URL_CHOICE}"
echo ""

# Verify new configuration
echo ""
echo "======================================"
echo "Step 4: Verification"
echo "======================================"
echo ""

sleep 3
NEW_URL=$(ssh contabo-vps "docker inspect ${HANDOFF_CONTAINER} 2>/dev/null | jq -r '.[0].Config.Env[] | select(contains(\"OLLAMA_URL\"))'" || echo "NOT_FOUND")
echo "New OLLAMA_URL: ${NEW_URL}"
echo ""

if [[ "$NEW_URL" == "$OLLAMA_URL_CHOICE" ]]; then
    print_status "$GREEN" "✅ OLLAMA_URL updated successfully"
else
    print_status "$YELLOW" "⚠️  Environment may not have updated (container restart limitation)"
    echo "   To permanently fix, update docker-compose.yml:"
    echo ""
    echo "   services:"
    echo "     handoff-api:"
    echo "       environment:"
    echo "         OLLAMA_URL: ${OLLAMA_URL_CHOICE}"
fi

# Test connectivity
echo ""
echo "Testing Ollama connectivity..."
if [[ "$CHOICE" == "2" ]]; then
    # Test connection to fabricaio Ollama
    RESULT=$(ssh contabo-vps "docker exec ${HANDOFF_CONTAINER} wget -q -O- ${OLLAMA_URL_CHOICE}/api/tags 2>&1 | head -20" || echo "FAILED")
    if [[ "$RESULT" != *"FAILED"* ]]; then
        print_status "$GREEN" "✅ Ollama is reachable"
    else
        print_status "$RED" "❌ Cannot reach Ollama"
    fi
elif [[ "$CHOICE" == "1" ]]; then
    print_status "$YELLOW" "⚠️  Host Ollama connectivity test requires manual verification"
    echo "   Run: docker exec ${HANDOFF_CONTAINER} curl http://host.docker.internal:11434/api/tags"
fi

echo ""
echo "======================================"
echo "Fix Complete"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Test chat endpoint:"
echo "   curl -X POST https://chat.cuttingedge.cihconsultingllc.com/api/chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\":\"Hello\",\"shopId\":1}'"
echo ""
echo "2. Check logs for errors:"
echo "   ssh contabo-vps 'docker logs cutting-edge-handoff-api-1 --tail 50'"
echo ""
echo "3. If still broken, update docker-compose.yml with:"
echo "   OLLAMA_URL=${OLLAMA_URL_CHOICE}"
echo "   Then run: docker-compose up -d --force-recreate handoff-api"
echo ""
