#!/bin/bash

echo "🌱 Athleon - Seed Missing Components"
echo "===================================="
echo ""

# Check AWS profile
if ! aws sts get-caller-identity --profile labvel-dev >/dev/null 2>&1; then
    echo "❌ AWS profile 'labvel-dev' not configured or expired"
    echo "Run: aws sso login --profile labvel-dev"
    exit 1
fi

echo "✅ AWS profile verified"
echo ""

# Get table names from CloudFormation
echo "📋 Getting table names from CloudFormation..."
source ./get-table-names.sh
echo ""

# Run missing seed scripts
echo "📊 1/2 Seeding demo event and categories..."
AWS_PROFILE=labvel-dev node seed-current-data-dynamic.js
echo ""

echo "🔐 2/2 Seeding authorization system..."
AWS_PROFILE=labvel-dev node seed-authorization-dynamic.js
echo ""

echo "✨ Missing components seeded successfully!"
echo ""
echo "🌐 Frontend: https://dev.athleon.fitness"
echo "🔑 Super Admin: admin@athleon.fitness / SuperAdmin123!"
echo "👥 Organizers: organizer1@test.com / SuperAdmin123!"
echo "🏃 Athletes: athlete1@test.com / SuperAdmin123!"
