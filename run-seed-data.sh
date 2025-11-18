#!/bin/bash

echo "🌱 Athleon - Seed Data Only"
echo "============================"
echo ""

# Check AWS profile
if ! aws sts get-caller-identity --profile labvel-dev >/dev/null 2>&1; then
    echo "❌ AWS profile 'labvel-dev' not configured or expired"
    echo "Run: aws sso login --profile labvel-dev"
    exit 1
fi

echo "✅ AWS profile verified"
echo ""

# Run seed data scripts
cd seed
./seed-all.sh

echo ""
echo "✨ Seed data created successfully!"
echo "🌐 Frontend: https://dbtrhlzryzh8h.cloudfront.net"
