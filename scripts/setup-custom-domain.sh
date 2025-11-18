#!/bin/bash

STAGE=${1:-development}
PROFILE=${2:-labvel-dev}

echo "🔐 Setting up custom domain for Cognito User Pool - Stage: $STAGE"

# 1. Deploy infrastructure with custom domain
echo "📦 Deploying CDK stack..."
cdk deploy Athleon --profile $PROFILE --require-approval never

# 2. Get the User Pool Domain
DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name Athleon \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text \
  --profile $PROFILE)

echo "✅ Custom domain configured: $DOMAIN"

# 3. Instructions for DNS setup
if [ "$STAGE" = "production" ]; then
  echo ""
  echo "📋 Next steps for production:"
  echo "1. Create CNAME record in Route 53:"
  echo "   Name: auth.athleon.fitness"
  echo "   Value: $DOMAIN"
  echo "2. Wait for DNS propagation (up to 24 hours)"
  echo "3. Verify domain in Cognito console"
fi

echo "🎉 Custom domain setup complete!"
