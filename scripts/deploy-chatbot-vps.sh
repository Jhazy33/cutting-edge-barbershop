#!/bin/bash

set -e

echo "========================================="
echo "VPS Chatbot Deployment Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
    print_error "This script must be run on the VPS in /root/cutting-edge directory"
    exit 1
fi

cd /root/cutting-edge

# Step 1: Check current branch
print_status "Step 1: Checking git branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "dev" ]; then
    print_warning "Not on dev branch. Switching to dev..."
    git checkout dev || {
        print_error "Failed to switch to dev branch"
        exit 1
    }
fi

# Step 2: Pull latest changes
print_status "Step 2: Pulling latest changes from dev branch..."
git pull origin dev || {
    print_error "Failed to pull from dev branch"
    exit 1
}

# Step 3: Create Docker network if it doesn't exist
print_status "Step 3: Checking Docker network..."
docker network ls | grep cutting-edge-network || {
    print_status "Creating cutting-edge-network..."
    docker network create cutting-edge-network
}

# Step 4: Build and start chatbot container
print_status "Step 4: Building chatbot Docker image..."
docker-compose -f docker-compose.chatbot.yml build || {
    print_error "Failed to build chatbot image"
    exit 1
}

print_status "Step 5: Starting chatbot container..."
docker-compose -f docker-compose.chatbot.yml up -d || {
    print_error "Failed to start chatbot container"
    exit 1
}

# Step 6: Verify container is running
print_status "Step 6: Verifying container status..."
sleep 3
docker ps | grep cutting-edge-chatbot || {
    print_error "Chatbot container is not running!"
    docker logs cutting-edge-chatbot
    exit 1
}

# Step 7: Create Nginx configuration
print_status "Step 7: Creating Nginx configuration..."
cat > /tmp/chatbot-nginx.conf <<'EOF'
server {
    server_name chat.cuttingedge.cihconsultingllc.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS for API calls
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, X-Ollama-Key' always;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/cuttingedge.cihconsultingllc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cuttingedge.cihconsultingllc.com/privkey.pem;
}

server {
    if ($host = chat.cuttingedge.cihconsultingllc.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name chat.cuttingedge.cihconsultingllc.com;
    return 404;
}
EOF

sudo mv /tmp/chatbot-nginx.conf /etc/nginx/sites-available/chat-cutting-edge

# Step 8: Enable Nginx site
print_status "Step 8: Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/chat-cutting-edge /etc/nginx/sites-enabled/chat-cutting-edge

# Step 9: Test Nginx configuration
print_status "Step 9: Testing Nginx configuration..."
sudo nginx -t || {
    print_error "Nginx configuration test failed!"
    exit 1
}

# Step 10: Reload Nginx
print_status "Step 10: Reloading Nginx..."
sudo systemctl reload nginx || {
    print_error "Failed to reload Nginx"
    exit 1
}

# Step 11: Request SSL certificate
print_status "Step 11: Requesting SSL certificate..."
sudo certbot --nginx -d chat.cuttingedge.cihconsultingllc.com --non-interactive --agree-tos --email admin@cihconsultingllc.com || {
    print_warning "SSL certificate request had issues, but continuing..."
}

# Step 12: Final verification
print_status "Step 12: Running final verification..."
echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo ""
echo "Container Status:"
docker ps | grep cutting-edge-chatbot
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager | grep Active
echo ""
echo "SSL Certificate:"
sudo certbot certificates | grep chat.cuttingedge.cihconsultingllc.com || echo "Certificate not found yet"
echo ""

print_status "========================================="
print_status "Deployment completed successfully!"
print_status "========================================="
echo ""
echo "Your chatbot should now be available at:"
echo "https://chat.cuttingedge.cihconsultingllc.com"
echo ""
echo "To check logs:"
echo "  docker logs cutting-edge-chatbot"
echo ""
echo "To restart:"
echo "  docker-compose -f /root/cutting-edge/docker-compose.chatbot.yml restart"
echo ""
