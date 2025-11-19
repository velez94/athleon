#!/bin/bash

echo "🚀 Starting Athleon Local Development Environment"

# Start Docker services
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Setup DynamoDB tables
echo "📊 Creating DynamoDB tables..."
node setup-tables.js

# Setup environment variables for Lambda functions
export DYNAMODB_ENDPOINT=http://localhost:8000
export EVENTBRIDGE_ENDPOINT=http://localhost:4566
export AWS_ACCESS_KEY_ID=fake
export AWS_SECRET_ACCESS_KEY=fake
export AWS_REGION=us-east-2

# Table names
export EVENTS_TABLE=EventsTable
export ORGANIZATIONS_TABLE=OrganizationsTable
export ORGANIZATION_MEMBERS_TABLE=OrganizationMembersTable
export SCORES_TABLE=ScoresTable

echo "✅ Local environment ready!"
echo "📡 API Gateway: http://localhost:3001"
echo "🗄️  DynamoDB: http://localhost:8000"
echo "🌉 EventBridge: http://localhost:4566"

# Start frontend in development mode
cd ../frontend
npm start
