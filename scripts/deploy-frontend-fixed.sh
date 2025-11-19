#!/bin/bash

# Frontend deployment script with ESLint fix
set -e

echo "🚀 Deploying Athleon Frontend..."

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Build with ESLint disabled
echo "📦 Building frontend..."
DISABLE_ESLINT_PLUGIN=true npm run build

# Deploy to S3
echo "☁️ Uploading to S3..."
aws s3 sync build/ s3://athleon-frontend-development --delete --profile labvel-dev

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id E1W3VWMRM7GPNN --paths "/*" --profile labvel-dev

echo "✅ Frontend deployment completed!"
echo "🌐 URL: https://dev.athleon.fitness"
