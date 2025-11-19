#!/bin/bash

# Get CDK outputs
echo "Getting CDK outputs..."
OUTPUTS=$(aws cloudformation describe-stacks --stack-name ScorinGames --query 'Stacks[0].Outputs' --profile labvel-dev --region us-east-2 --output json)

# Extract values
API_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue' | sed 's/\/$//')
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
DISTRIBUTION_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="FrontendDistributionId") | .OutputValue')
BUCKET_NAME=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="FrontendBucket") | .OutputValue')

echo "Building frontend with:"
echo "  API_URL: $API_URL"
echo "  USER_POOL_ID: $USER_POOL_ID"
echo "  USER_POOL_CLIENT_ID: $USER_POOL_CLIENT_ID"

# Build with environment variables
cd /home/labvel/projects/scoringames/frontend
REACT_APP_API_URL=$API_URL \
REACT_APP_USER_POOL_ID=$USER_POOL_ID \
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID \
REACT_APP_REGION=us-east-2 \
npm run build

# Deploy to S3
echo "Deploying to S3 bucket: $BUCKET_NAME"
aws s3 sync build/ s3://$BUCKET_NAME --delete --profile labvel-dev

# Invalidate CloudFront
echo "Invalidating CloudFront distribution: $DISTRIBUTION_ID"
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile labvel-dev
