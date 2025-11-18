#!/bin/bash

echo "🚀 Athleon - Complete Seed Setup"
echo "================================="
echo ""

# Check AWS profile
if ! aws sts get-caller-identity --profile labvel-dev >/dev/null 2>&1; then
    echo "❌ AWS profile 'labvel-dev' not configured or expired"
    echo "Run: aws sso login --profile labvel-dev"
    exit 1
fi

echo "✅ AWS profile verified"
echo ""

# Step 1: Create Cognito users (from scripts directory)
echo "👑 Step 1/3: Creating Cognito users..."
echo ""

cd scripts

echo "  📧 Creating super admin user..."
AWS_PROFILE=labvel-dev node create-super-admin-user.js
echo ""

echo "  🏃 Creating test athletes..."
AWS_PROFILE=labvel-dev node create-test-athletes.js
echo ""

# Step 2: Seed database data (from seed directory)
echo "🌱 Step 2/3: Seeding database data..."
echo ""

cd ../seed

echo "  Running master seed script..."
./seed-all.sh
echo ""

# Step 3: Summary
echo "✨ Step 3/3: Setup complete!"
echo ""
echo "🎯 Login Credentials:"
echo "  🔑 Super Admin: admin@athleon.fitness / SuperAdmin123!"
echo "  👥 Organizers: organizer1@test.com / Organizer123!"
echo "  🏃 Athletes: athlete1@test.com / Athlete123!"
echo ""
echo "🌐 Frontend: https://dbtrhlzryzh8h.cloudfront.net"
echo "🔗 API: https://4vv0cl30sf.execute-api.us-east-2.amazonaws.com/prod"
echo ""
echo "🎉 Athleon platform ready for testing!"
