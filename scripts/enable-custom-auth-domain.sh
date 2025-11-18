#!/bin/bash

STAGE=${1:-development}
PROFILE=${2:-labvel-dev}

echo "🔐 Enabling custom auth domain for stage: $STAGE"

# Update the shared stack to enable custom domain
sed -i "s/useCustomDomain: false/useCustomDomain: true/g" infrastructure/shared/shared-stack.ts

echo "📦 Deploying with custom domain enabled..."
cdk deploy --all --profile $PROFILE --require-approval never

echo "✅ Custom auth domain enabled!"
echo ""
echo "📋 Next steps:"
echo "1. The certificate will be created automatically"
echo "2. Add the CNAME record shown in the deployment output to Route 53"
echo "3. Wait for DNS propagation (up to 24 hours)"
echo "4. Update frontend config with new auth domain"
