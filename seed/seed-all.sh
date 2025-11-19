#!/bin/bash

echo "🌱 Athleon - Master Seed Script"
echo "=================================="
echo ""

# Check AWS profile
if ! aws sts get-caller-identity --profile labvel-dev >/dev/null 2>&1; then
    echo "❌ AWS profile 'labvel-dev' not configured or expired"
    echo "Run: aws sso login --profile labvel-dev"
    exit 1
fi

echo "✅ AWS profile verified"
echo ""

# Create organizer users first
echo "👥 0/5 Creating organizer users..."
AWS_PROFILE=labvel-dev node create-organizer-users.js
echo ""

# Run seed scripts in order
echo "📊 1/5 Seeding global categories..."
AWS_PROFILE=labvel-dev node seed-categories.js
echo ""

echo "🏋️ 2/5 Seeding exercise library..."
AWS_PROFILE=labvel-dev node seed-exercises.js
echo ""

echo "📋 3/5 Seeding core data..."
AWS_PROFILE=labvel-dev node seed-current-data.js
echo ""

echo "💪 4/5 Seeding baseline WODs..."
AWS_PROFILE=labvel-dev node seed-baseline-wods.js
echo ""

echo "🔐 5/5 Seeding authorization system..."
AWS_PROFILE=labvel-dev node seed-authorization.js
echo ""

echo "✨ All seed data created successfully!"
echo ""
echo "🌐 Frontend: https://dbtrhlzryzh8h.cloudfront.net"
echo "🔑 Super Admin: admin@athleon.fitness / SuperAdmin123!"
echo "👥 Organizers: organizer1@test.com / Organizer123!"
echo "🏃 Athletes: athlete1@test.com / Athlete123!"
