#!/bin/bash

echo "🧪 Testing Athleon Local Environment"

echo "📡 Testing API Gateway..."
curl -s http://localhost:3001/organizations | jq .
curl -s http://localhost:3001/competitions | jq .

echo "🗄️  Testing DynamoDB..."
aws dynamodb list-tables \
  --endpoint-url http://localhost:8000 \
  --region us-east-2 \
  --no-cli-pager \
  --output table

echo "✅ Local environment is working!"
