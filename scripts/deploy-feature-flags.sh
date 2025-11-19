#!/bin/bash

set -e

ENVIRONMENT=$1
PROFILE=${2:-labvel-dev}

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment> [aws-profile]"
  echo "Example: $0 development labvel-dev"
  exit 1
fi

CONFIG_FILE="config/feature-flags/${ENVIRONMENT}.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Config file not found: $CONFIG_FILE"
  exit 1
fi

echo "🚀 Deploying feature flags for $ENVIRONMENT environment..."

# Get stack outputs
STACK_NAME="Athleon-${ENVIRONMENT}"

echo "📋 Getting AppConfig details from stack: $STACK_NAME"

APP_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`AppConfigApplicationId`].OutputValue' \
  --output text \
  --profile "$PROFILE" 2>/dev/null || echo "")

ENV_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`AppConfigEnvironmentId`].OutputValue' \
  --output text \
  --profile "$PROFILE" 2>/dev/null || echo "")

PROFILE_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`AppConfigConfigProfileId`].OutputValue' \
  --output text \
  --profile "$PROFILE" 2>/dev/null || echo "")

STRATEGY_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`AppConfigDeploymentStrategyId`].OutputValue' \
  --output text \
  --profile "$PROFILE" 2>/dev/null || echo "")

if [ -z "$APP_ID" ] || [ -z "$ENV_ID" ] || [ -z "$PROFILE_ID" ] || [ -z "$STRATEGY_ID" ]; then
  echo "❌ Could not retrieve AppConfig IDs from stack. Make sure the stack is deployed."
  echo "   APP_ID: $APP_ID"
  echo "   ENV_ID: $ENV_ID"
  echo "   PROFILE_ID: $PROFILE_ID"
  echo "   STRATEGY_ID: $STRATEGY_ID"
  exit 1
fi

echo "✅ AppConfig details retrieved:"
echo "   Application ID: $APP_ID"
echo "   Environment ID: $ENV_ID"
echo "   Profile ID: $PROFILE_ID"
echo "   Strategy ID: $STRATEGY_ID"

# Validate JSON
echo "🔍 Validating configuration file..."
if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
  echo "❌ Invalid JSON in $CONFIG_FILE"
  exit 1
fi

echo "✅ Configuration file is valid JSON"

# Create new configuration version
echo "📦 Creating new configuration version..."

# Encode content to base64
CONTENT_BASE64=$(base64 -w 0 "$CONFIG_FILE")

# Create configuration version
aws appconfig create-hosted-configuration-version \
  --application-id "$APP_ID" \
  --configuration-profile-id "$PROFILE_ID" \
  --content "$CONTENT_BASE64" \
  --content-type "application/json" \
  --description "Auto-deployed from $(git rev-parse --short HEAD 2>/dev/null || echo 'local')" \
  --profile "$PROFILE" \
  /tmp/appconfig-content.json > /tmp/appconfig-response.json

# Extract version from the JSON response
VERSION=$(jq -r '.VersionNumber' < /tmp/appconfig-response.json)
rm /tmp/appconfig-response.json /tmp/appconfig-content.json

echo "✅ Created configuration version: $VERSION"

# Start deployment
echo "🚀 Starting deployment..."
DEPLOYMENT_ID=$(aws appconfig start-deployment \
  --application-id "$APP_ID" \
  --environment-id "$ENV_ID" \
  --deployment-strategy-id "$STRATEGY_ID" \
  --configuration-profile-id "$PROFILE_ID" \
  --configuration-version "$VERSION" \
  --query 'DeploymentNumber' \
  --output text \
  --profile "$PROFILE")

echo "✅ Deployment started with ID: $DEPLOYMENT_ID"
echo "🎉 Feature flags deployment initiated for $ENVIRONMENT environment"
echo ""
echo "📊 Monitor deployment status:"
echo "   aws appconfig get-deployment --application-id $APP_ID --environment-id $ENV_ID --deployment-number $DEPLOYMENT_ID --profile $PROFILE"
