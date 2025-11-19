#!/bin/bash

echo "🧹 Cleaning up duplicated shared folders..."
echo "=========================================="

# List of domain directories
DOMAINS=("scoring" "competitions" "organizations" "athletes" "categories" "wods" "scheduling")

for domain in "${DOMAINS[@]}"; do
  SHARED_DIR="/home/labvel/projects/scoringames/lambda/$domain/shared"
  
  if [ -d "$SHARED_DIR" ]; then
    echo "🗑️  Removing: $SHARED_DIR"
    rm -rf "$SHARED_DIR"
  else
    echo "⚠️  Not found: $SHARED_DIR"
  fi
done

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update all Lambda functions to use layer imports:"
echo "   const { verifyToken } = require('/opt/nodejs/utils/auth');"
echo "   const logger = require('/opt/nodejs/utils/logger');"
echo ""
echo "2. Deploy CDK stack to create Lambda layer:"
echo "   cdk deploy Athleon --profile labvel-dev"
