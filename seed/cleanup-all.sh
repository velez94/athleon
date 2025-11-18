#!/bin/bash

echo "🧹 Athleon - Master Cleanup Script"
echo "==================================="
echo ""

# Check AWS profile
if ! aws sts get-caller-identity --profile labvel-dev >/dev/null 2>&1; then
    echo "❌ AWS profile 'labvel-dev' not configured or expired"
    echo "Run: aws sso login --profile labvel-dev"
    exit 1
fi

echo "✅ AWS profile verified"
echo ""

# Confirmation prompt
read -p "⚠️  This will DELETE ALL seed data. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""

# Run cleanup
echo "🗑️  Running cleanup script..."
AWS_PROFILE=labvel-dev node cleanup-seed-data.js

echo ""
echo "✨ Platform reset to clean state!"
echo "🌱 Run ./seed-all.sh to recreate seed data"
