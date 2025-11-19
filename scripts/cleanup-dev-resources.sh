#!/bin/bash

# Cleanup script for Athleon development resources
# Run this before deploying to avoid conflicts

set -e

PROFILE=${1:-labvel-dev}
REGION=${2:-us-east-2}

echo "🧹 Cleaning up Athleon development resources..."
echo "Profile: $PROFILE"
echo "Region: $REGION"

# Function to safely delete resources
safe_delete() {
    local resource_type=$1
    local resource_name=$2
    local delete_command=$3
    
    echo "Checking $resource_type: $resource_name"
    if eval "$delete_command" 2>/dev/null; then
        echo "✅ Deleted $resource_type: $resource_name"
    else
        echo "ℹ️  $resource_type $resource_name not found or already deleted"
    fi
}

# Delete failed CloudFormation stacks
echo "🔍 Checking for failed CloudFormation stacks..."
FAILED_STACKS=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_FAILED UPDATE_FAILED ROLLBACK_COMPLETE \
    --query 'StackSummaries[?contains(StackName, `Athleon`)].StackName' \
    --output text \
    --profile $PROFILE \
    --region $REGION)

if [ ! -z "$FAILED_STACKS" ]; then
    for stack in $FAILED_STACKS; do
        safe_delete "CloudFormation Stack" "$stack" \
            "aws cloudformation delete-stack --stack-name $stack --profile $PROFILE --region $REGION"
    done
else
    echo "ℹ️  No failed Athleon stacks found"
fi

# Delete conflicting DynamoDB tables
echo "🔍 Checking for conflicting DynamoDB tables..."
CONFLICTING_TABLES=$(aws dynamodb list-tables \
    --query 'TableNames[?contains(@, `development`) || contains(@, `athleon`)]' \
    --output text \
    --profile $PROFILE \
    --region $REGION)

if [ ! -z "$CONFLICTING_TABLES" ]; then
    for table in $CONFLICTING_TABLES; do
        # Skip the projects-inventory table as it's from another project
        if [ "$table" != "projects-inventory" ]; then
            safe_delete "DynamoDB Table" "$table" \
                "aws dynamodb delete-table --table-name $table --profile $PROFILE --region $REGION"
        fi
    done
else
    echo "ℹ️  No conflicting DynamoDB tables found"
fi

# Delete duplicate Cognito User Pools
echo "🔍 Checking for duplicate Cognito User Pools..."
DUPLICATE_POOLS=$(aws cognito-idp list-user-pools --max-results 20 \
    --query 'UserPools[?contains(Name, `athleon`) || contains(Name, `calisthenics`)].Id' \
    --output text \
    --profile $PROFILE \
    --region $REGION)

if [ ! -z "$DUPLICATE_POOLS" ]; then
    # Keep only the most recent one
    POOL_COUNT=$(echo $DUPLICATE_POOLS | wc -w)
    if [ $POOL_COUNT -gt 1 ]; then
        echo "Found $POOL_COUNT user pools, keeping the most recent one..."
        # Delete all but the last one (most recent)
        POOLS_TO_DELETE=$(echo $DUPLICATE_POOLS | cut -d' ' -f1-$((POOL_COUNT-1)))
        for pool in $POOLS_TO_DELETE; do
            safe_delete "Cognito User Pool" "$pool" \
                "aws cognito-idp delete-user-pool --user-pool-id $pool --profile $PROFILE --region $REGION"
        done
    fi
else
    echo "ℹ️  No duplicate Cognito User Pools found"
fi

echo "✅ Cleanup completed! You can now deploy safely."
echo ""
echo "To deploy Athleon, run:"
echo "  cdk deploy Athleon-development --profile $PROFILE --require-approval never"
