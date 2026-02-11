#!/bin/bash

set -e

echo "========================================="
echo "VPS Chatbot Rollback Script"
echo "========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running on VPS
if [ ! -d "/root/cutting-edge" ]; then
    print_error "This script must be run on the VPS"
    exit 1
fi

cd /root/cutting-edge

# Step 1: Stop and remove chatbot container
print_status "Step 1: Stopping chatbot container..."
docker-compose -f docker-compose.chatbot.yml down || {
    print_warning "Failed to stop container gracefully, forcing..."
    docker stop cutting-edge-chatbot 2>/dev/null || true
    docker rm cutting-edge-chatbot 2>/dev/null || true
}

# Step 2: Remove Nginx configuration
print_status "Step 2: Removing Nginx configuration..."
sudo rm -f /etc/nginx/sites-enabled/chat-cutting-edge
sudo rm -f /etc/nginx/sites-available/chat-cutting-edge

# Step 3: Reload Nginx
print_status "Step 3: Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx || {
    print_error "Failed to reload Nginx"
    exit 1
}

# Step 4: Optional - Switch back to main branch
read -p "Switch back to main branch? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Switching to main branch..."
    git checkout main
fi

print_status "========================================="
print_status "Rollback completed successfully!"
print_status "========================================="
echo ""
echo "The chatbot has been removed and Nginx reconfigured."
echo ""
