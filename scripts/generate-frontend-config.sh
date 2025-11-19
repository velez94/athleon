#!/bin/bash

# Generate frontend configuration from CloudFormation outputs
STACK_NAME="Athleon-development"
PROFILE="labvel-dev"
REGION="us-east-2"

echo "🔧 Generating frontend configuration from CloudFormation outputs..."

# Get stack outputs
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output json)

# Extract values
API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue')
USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')

# Create config file
cat > frontend/src/aws-config.json << EOF
{
  "region": "$REGION",
  "apiUrl": "$API_URL",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID"
}
EOF

echo "✅ Frontend configuration generated:"
echo "   API URL: $API_URL"
echo "   User Pool ID: $USER_POOL_ID"
echo "   User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "   Config saved to: frontend/src/aws-config.json"
