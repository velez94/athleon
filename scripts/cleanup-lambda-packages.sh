#!/bin/bash

echo "🧹 Cleaning up individual Lambda package.json files..."

# Remove package.json and node_modules from each Lambda domain
for dir in lambda/*/; do
  if [ -f "${dir}package.json" ]; then
    echo "Removing ${dir}package.json"
    rm "${dir}package.json"
  fi
  
  if [ -d "${dir}node_modules" ]; then
    echo "Removing ${dir}node_modules"
    rm -rf "${dir}node_modules"
  fi
done

echo "✅ Cleanup complete"
