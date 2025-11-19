#!/bin/bash

echo "🔧 Updating all Lambda stacks to use esbuild bundling..."

# Array of stacks to update
STACKS=("scoring" "categories" "wods" "scheduling")

for stack in "${STACKS[@]}"; do
  echo "Updating ${stack} stack..."
  
  # Add import
  sed -i "6i import { createBundledLambda } from '../shared/lambda-bundling';" \
    "infrastructure/${stack}/${stack}-stack.ts"
  
  # Replace Lambda function creation pattern
  sed -i "s/new lambda\.Function(this, '\([^']*\)', {/createBundledLambda(this, '\1', '${stack}', {/" \
    "infrastructure/${stack}/${stack}-stack.ts"
  
  # Remove redundant properties
  sed -i "/runtime: lambda\.Runtime\.NODEJS_18_X,/d" \
    "infrastructure/${stack}/${stack}-stack.ts"
  sed -i "/handler: 'index\.handler',/d" \
    "infrastructure/${stack}/${stack}-stack.ts"
  sed -i "/code: lambda\.Code\.fromAsset('lambda\/${stack}'),/d" \
    "infrastructure/${stack}/${stack}-stack.ts"
  sed -i "/timeout: cdk\.Duration\.seconds(30),/d" \
    "infrastructure/${stack}/${stack}-stack.ts"
  sed -i "/memorySize: 256,/d" \
    "infrastructure/${stack}/${stack}-stack.ts"
  
  echo "✅ Updated ${stack} stack"
done

echo "🎉 All stacks updated with esbuild bundling!"
