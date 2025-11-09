#!/bin/bash

# Get table names from CloudFormation stack
STACK_NAME="Athleon-development"
REGION="us-east-2"

echo "Getting table names from CloudFormation stack: $STACK_NAME"

# Get all DynamoDB tables from the stack
RESOURCES=$(AWS_PROFILE=labvel-dev aws cloudformation describe-stack-resources \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query "StackResources[?ResourceType=='AWS::DynamoDB::Table'].[LogicalResourceId,PhysicalResourceId]" \
  --output text)

# Parse and export table names
while IFS=$'\t' read -r logical physical; do
  case $logical in
    *OrganizationsOrganizationsTable*)
      export ORGANIZATIONS_TABLE="$physical"
      echo "ORGANIZATIONS_TABLE=$physical"
      ;;
    *OrganizationMembersTable*)
      export ORGANIZATION_MEMBERS_TABLE="$physical"
      echo "ORGANIZATION_MEMBERS_TABLE=$physical"
      ;;
    *OrganizationEventsTable*)
      export ORGANIZATION_EVENTS_TABLE="$physical"
      echo "ORGANIZATION_EVENTS_TABLE=$physical"
      ;;
    *CompetitionsEventsTable*)
      export EVENTS_TABLE="$physical"
      echo "EVENTS_TABLE=$physical"
      ;;
    *AthletesAthletesTable*)
      export ATHLETES_TABLE="$physical"
      echo "ATHLETES_TABLE=$physical"
      ;;
    *CategoriesTable*)
      export CATEGORIES_TABLE="$physical"
      echo "CATEGORIES_TABLE=$physical"
      ;;
    *WodsTable*)
      export WODS_TABLE="$physical"
      echo "WODS_TABLE=$physical"
      ;;
    *ExerciseLibraryTable*)
      export EXERCISES_TABLE="$physical"
      echo "EXERCISES_TABLE=$physical"
      ;;
    *AuthorizationRolesTable*)
      export ROLES_TABLE="$physical"
      echo "ROLES_TABLE=$physical"
      ;;
    *PermissionsTable*)
      export PERMISSIONS_TABLE="$physical"
      echo "PERMISSIONS_TABLE=$physical"
      ;;
    *UserRolesTable*)
      export USER_ROLES_TABLE="$physical"
      echo "USER_ROLES_TABLE=$physical"
      ;;
  esac
done <<< "$RESOURCES"

# Get tables that exist but might not be in CloudFormation resources (due to nested stacks)
echo "Checking for additional tables..."

# Check for Organizations tables
ORG_TABLES=$(AWS_PROFILE=labvel-dev aws dynamodb list-tables --region $REGION --query "TableNames[?contains(@, 'Organizations')]" --output text)
for table in $ORG_TABLES; do
  if [[ $table == *"OrganizationsTable"* ]] && [[ -z "$ORGANIZATIONS_TABLE" ]]; then
    export ORGANIZATIONS_TABLE="$table"
    echo "ORGANIZATIONS_TABLE=$table"
  elif [[ $table == *"OrganizationMembers"* ]] && [[ -z "$ORGANIZATION_MEMBERS_TABLE" ]]; then
    export ORGANIZATION_MEMBERS_TABLE="$table"
    echo "ORGANIZATION_MEMBERS_TABLE=$table"
  elif [[ $table == *"OrganizationEvents"* ]] && [[ -z "$ORGANIZATION_EVENTS_TABLE" ]]; then
    export ORGANIZATION_EVENTS_TABLE="$table"
    echo "ORGANIZATION_EVENTS_TABLE=$table"
  fi
done

# Check for WODs table
WODS_TABLES=$(AWS_PROFILE=labvel-dev aws dynamodb list-tables --region $REGION --query "TableNames[?contains(@, 'Wods')]" --output text)
for table in $WODS_TABLES; do
  if [[ $table == *"WodsTable"* ]] && [[ -z "$WODS_TABLE" ]]; then
    export WODS_TABLE="$table"
    echo "WODS_TABLE=$table"
  fi
done

# Get Cognito User Pool ID from stack outputs
USER_POOL_ID=$(AWS_PROFILE=labvel-dev aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

export USER_POOL_ID="$USER_POOL_ID"
echo "USER_POOL_ID=$USER_POOL_ID"
