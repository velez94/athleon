#!/bin/bash

set -e

PROFILE=${1:-labvel-dev}

echo "🚀 Initializing AppConfig with basic feature flags..."

# Create a simple feature flag configuration
cat > /tmp/initial-flags.json << 'EOF'
{
  "flags": {
    "newScoringSystem": {
      "enabled": true
    },
    "realTimeLeaderboard": {
      "enabled": true
    }
  },
  "values": {},
  "version": "1"
}
EOF

# Get AppConfig details from stack
APP_ID=$(aws cloudformation describe-stacks \
  --stack-name "Athleon-development" \
  --query 'Stacks[0].Outputs[?OutputKey==`AppConfigApplicationId`].OutputValue' \
  --output text \
  --profile "$PROFILE")

PROFILE_ID=$(aws cloudformation describe-stacks \
  --stack-name "Athleon-development" \
  --query 'Stacks[0].Outputs[?OutputKey==`AppConfigConfigProfileId`].OutputValue' \
  --output text \
  --profile "$PROFILE")

echo "📋 AppConfig Details:"
echo "   Application ID: $APP_ID"
echo "   Profile ID: $PROFILE_ID"

# Encode content to base64
CONTENT_BASE64=$(base64 -w 0 /tmp/initial-flags.json)

# Create configuration version
echo "📦 Creating initial configuration version..."

aws appconfig create-hosted-configuration-version \
  --application-id "$APP_ID" \
  --configuration-profile-id "$PROFILE_ID" \
  --content "$CONTENT_BASE64" \
  --content-type "application/json" \
  --description "Initial feature flags setup" \
  --profile "$PROFILE" \
  --output json \
  /tmp/appconfig-output.json

VERSION=$(jq -r '.VersionNumber' < /tmp/appconfig-output.json)
rm /tmp/appconfig-output.json
rm /tmp/initial-flags.json

echo "✅ Created configuration version: $VERSION"
echo "🎉 AppConfig initialized successfully!"
echo ""
echo "You can now use the deployment script to update feature flags:"
echo "   ./scripts/deploy-feature-flags.sh development $PROFILE"
