#!/bin/bash

echo "🔧 Updating CDK stacks to use Lambda layer..."
echo "=============================================="

# List of stack files to update
STACKS=(
  "infrastructure/competitions/competitions-stack.ts"
  "infrastructure/organizations/organizations-stack.ts"
  "infrastructure/athletes/athletes-stack.ts"
  "infrastructure/categories/categories-stack.ts"
  "infrastructure/wods/wods-stack.ts"
  "infrastructure/scheduling/scheduling-stack.ts"
)

for stack in "${STACKS[@]}"; do
  if [ -f "$stack" ]; then
    echo "📝 Updating: $stack"
    
    # Add import for AthleonSharedLayer
    if ! grep -q "AthleonSharedLayer" "$stack"; then
      sed -i '/import { Construct } from '\''constructs'\'';/a import { AthleonSharedLayer } from '\''../shared/lambda-layer'\'';' "$stack"
    fi
    
    # Add sharedLayer to props interface
    if ! grep -q "sharedLayer:" "$stack"; then
      sed -i '/stage: string;/a \  sharedLayer: AthleonSharedLayer;' "$stack"
    fi
    
    # Add layers to Lambda functions
    sed -i '/code: lambda\.Code\.fromAsset/a \      layers: [props.sharedLayer.layer],' "$stack"
    
  else
    echo "⚠️  Not found: $stack"
  fi
done

echo ""
echo "✨ Stack updates complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update main-stack.ts to pass sharedLayer to all domain stacks"
echo "2. Deploy: cdk deploy Athleon --profile labvel-dev"
