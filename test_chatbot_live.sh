#!/bin/bash

echo "🔍 Chatbot Connectivity Diagnostic"
echo "=================================="
echo ""

# Test 1: Can we reach the VPS?
echo "1️⃣ Testing VPS Connectivity..."
ping -c 1 109.199.118.38 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ VPS is reachable"
else
    echo "❌ VPS is not responding"
    exit 1
fi
echo ""

# Test 2: Is the chatbot port accessible?
echo "2️⃣ Testing Chatbot Port (3001)..."
nc -z -w 5 109.199.118.38 3001 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Port 3001 is open"
else
    echo "⚠️  Port 3001 is not accessible (may be firewalled)"
fi
echo ""

# Test 3: Check DNS
echo "3️⃣ Testing DNS Resolution..."
host chat.cuttingedge.cihconsultingllc.com 2>&1 | grep "has address"
echo ""

# Test 4: Try HTTP (non-SSL)
echo "4️⃣ Testing HTTP (port 80)..."
curl -I -s -m 5 http://chat.cuttingedge.cihconsultingllc.com 2>&1 | head -3
echo ""

# Test 5: Try HTTPS
echo "5️⃣ Testing HTTPS (port 443)..."
curl -I -s -m 5 https://chat.cuttingedge.cihconsultingllc.com 2>&1 | head -3
echo ""

echo "=================================="
echo "Diagnostic Complete"
echo "=================================="
echo ""
echo "If chatbot is not responding, run these commands on VPS:"
echo "  ssh contabo-vps"
echo "  pm2 status"
echo "  pm2 logs chatbot --lines 20"
