#!/bin/bash

# Deploy Frontend to S3 and Invalidate CloudFront
# This script uploads the built frontend to S3 and invalidates the CloudFront cache

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
S3_BUCKET="athleon-frontend-prod"
CLOUDFRONT_DISTRIBUTION_ID="E1YJQZ8QXQXQXQ"  # Update with your actual distribution ID
REGION="us-east-2"

echo -e "${YELLOW}🚀 Deploying Frontend to Production${NC}"
echo "================================================"

# Check if build directory exists
if [ ! -d "frontend/build" ]; then
  echo -e "${RED}❌ Build directory not found!${NC}"
  echo "Run: cd frontend && npm run build"
  exit 1
fi

# Sync files to S3
echo -e "\n${YELLOW}📦 Uploading files to S3...${NC}"
aws s3 sync frontend/build/ s3://${S3_BUCKET}/ \
  --region ${REGION} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.map"

# Upload index.html with no-cache
echo -e "\n${YELLOW}📄 Uploading index.html (no-cache)...${NC}"
aws s3 cp frontend/build/index.html s3://${S3_BUCKET}/index.html \
  --region ${REGION} \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# Invalidate CloudFront cache
echo -e "\n${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo -e "${GREEN}✅ Invalidation created: ${INVALIDATION_ID}${NC}"

# Wait for invalidation to complete (optional)
echo -e "\n${YELLOW}⏳ Waiting for invalidation to complete...${NC}"
aws cloudfront wait invalidation-completed \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --id ${INVALIDATION_ID}

echo -e "\n${GREEN}✨ Deployment complete!${NC}"
echo "================================================"
echo -e "🌐 Frontend URL: https://dbtrhlzryzh8h.cloudfront.net"
echo -e "📧 Admin login: admin@athleon.fitness"
echo -e "🔑 Password: SuperAdmin123!"
echo ""
echo -e "${YELLOW}Note: It may take a few minutes for changes to propagate globally${NC}"
