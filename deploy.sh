#!/bin/bash
# Cutting Edge Barbershop - Deployment Script
# Prevents WebSocket errors and ensures proper deployment

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/dist"
DEPLOY_DIR="/Users/jhazy/AI_Projects/Cutting Edge/cutting-edge-main-site"
VPS_HOST="root@109.199.118.38"
VPS_DEPLOY_DIR="/root/cutting-edge-main-site"

echo "🔧 Cutting Edge Barbershop - Deployment"
echo "======================================="

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Build the project
echo "🔨 Building project..."
npm run build

# Step 3: Create deployment directory structure
echo "📁 Preparing deployment files..."
rm -rf "$DEPLOY_DIR/assets"
mkdir -p "$DEPLOY_DIR/assets"

# Copy built files
cp -r "$BUILD_DIR/assets/"* "$DEPLOY_DIR/assets/"

# Create index.html with loading state
cat > "$DEPLOY_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cutting Edge Barbershop | Plymouth, MA | Precision Fades & Hair Design</title>
  <meta name="description" content="Cutting Edge Barber Shop in Plymouth, MA. Unmatched attention to detail. Precision fades, beard trims, and artistic hair designs. Walk-ins welcome." />
  <meta name="geo.region" content="US-MA" />
  <meta name="geo.placename" content="Plymouth" />
  <meta name="geo.position" content="41.9584;-70.6673" />
  <meta name="ICBM" content="41.9584, -70.6673" />
EOF

# Append the built index.html head (exclude body)
grep -A 100 '<head>' "$BUILD_DIR/index.html" | grep -B 100 '</head>' | sed 's/<\/head>.*//' >> "$DEPLOY_DIR/index.html"

# Get the JS file name
JS_FILE=$(ls "$BUILD_DIR/assets" | grep -E '^index-.*\.js$')

# Add script tag
echo "  <script type=\"module\" crossorigin src=\"/assets/$JS_FILE\"></script>" >> "$DEPLOY_DIR/index.html"
echo "</head>" >> "$DEPLOY_DIR/index.html"

# Add body with loading state
cat >> "$DEPLOY_DIR/index.html" << 'EOF'

<body>
  <div id="root">
    <!-- Loading State: Prevents black screen while JS loads -->
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%); color: #ffffff; font-family: 'Inter', sans-serif; padding: 20px; text-align: center;">
      <div style="max-width: 400px; width: 100%;">
        <h1 style="font-family: 'Oswald', sans-serif; font-size: 3rem; font-weight: 700; color: #CC0000; margin-bottom: 10px; letter-spacing: 2px;">
          CUTTING EDGE
        </h1>
        <p style="font-size: 1.1rem; color: #888; margin-bottom: 40px; letter-spacing: 4px; text-transform: uppercase;">
          Barbershop • Plymouth, MA
        </p>
        <div style="display: flex; justify-content: center; margin-bottom: 30px;">
          <div style="width: 50px; height: 50px; border: 3px solid #333; border-top-color: #CC0000; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 20px;">Loading your experience...</p>
        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #333;">
          <p style="font-size: 0.9rem; color: #888; margin-bottom: 10px;">📍 34 Manomet Point Rd, Plymouth, MA 02360</p>
          <p style="font-size: 0.9rem; color: #888; margin-bottom: 20px;">📞 (508) 224-4408</p>
          <a href="tel:5082244408" style="display: inline-block; background: #CC0000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; transition: background 0.3s;">Call Now</a>
        </div>
      </div>
    </div>
  </div>
  <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
</body>
</html>
EOF

# Step 4: Sync to VPS
echo "🚀 Syncing to VPS..."
rsync -avz --delete "$DEPLOY_DIR/" "$VPS_HOST:$VPS_DEPLOY_DIR/"

# Step 5: Rebuild and restart container on VPS
echo "🔄 Rebuilding container on VPS..."
ssh "$VPS_HOST" << 'ENDSSH'
cd /root/cutting-edge-main-site
docker build -t cutting-edge-barbershop .
cd /root/cutting-edge
docker-compose stop barber-shop
docker-compose rm -f barber-shop
docker-compose up -d barber-shop
echo "✅ Container restarted"
ENDSSH

echo "✅ Deployment complete!"
echo "🌐 Check: https://cuttingedge.cihconsultingllc.com/"
