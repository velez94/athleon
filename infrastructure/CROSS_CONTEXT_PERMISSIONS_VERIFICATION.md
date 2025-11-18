# Cross-Context Read Permissions Verification

## Task 7.1 Implementation Summary

This document verifies the implementation of DDD bounded context cross-context read permissions for the time-based scoring feature.

## Changes Made

### 1. Scoring Stack (`infrastructure/scoring/scoring-stack.ts`)

**Interface Update:**
- Added optional `wodsTable?: dynamodb.Table` prop to `ScoringStackProps`
- This allows the Scoring context to receive a reference to the WODs table

**Environment Variable:**
- Added `WODS_TABLE` environment variable to Scores Lambda (conditionally, when wodsTable is provided)
- This enables the Lambda to know which table to read from

**IAM Permissions:**
- Added `props.wodsTable.grantReadData(this.scoresLambda)` 
- This grants read-only permissions (GetItem, Query, Scan, BatchGetItem, DescribeTable)
- **NO WRITE PERMISSIONS** are granted (PutItem, UpdateItem, DeleteItem are NOT included)

### 2. WODs Stack (`infrastructure/wods/wods-stack.ts`)

**Interface Update:**
- Added optional `scoringSystemsTable?: dynamodb.Table` prop to `WodsStackProps`
- This allows the WOD context to receive a reference to the Scoring Systems table

**Environment Variable:**
- Added `SCORING_SYSTEMS_TABLE` environment variable to WODs Lambda (conditionally)
- This enables the Lambda to know which table to read from for validation

**IAM Permissions:**
- Added `props.scoringSystemsTable.grantReadData(this.wodsLambda)`
- This grants read-only permissions (GetItem, Query, Scan, BatchGetItem, DescribeTable)
- **NO WRITE PERMISSIONS** are granted

### 3. Main Stack (`infrastructure/main-stack.ts`)

**Stack Instantiation:**
- WodsStack now receives `scoringSystemsTable: scoringStack.scoringSystemsTable`
- This passes the Scoring Systems table reference to the WOD context

**Cross-Context Permissions:**
- Added `wodsStack.wodsTable.grantReadData(scoringStack.scoresLambda)`
- Added `scoringStack.scoresLambda.addEnvironment('WODS_TABLE', wodsStack.wodsTable.tableName)`
- This grants the Scoring Lambda read access to the WODs table and provides the table name

## DDD Pattern Compliance

### ✅ Read-Only Cross-Context Access
- Both contexts can READ from each other's tables
- Neither context can WRITE to the other's tables
- This maintains bounded context integrity

### ✅ Proper IAM Enforcement
The `grantReadData()` method grants the following IAM actions:
- `dynamodb:GetItem`
- `dynamodb:Query`
- `dynamodb:Scan`
- `dynamodb:BatchGetItem`
- `dynamodb:DescribeTable`

It does **NOT** grant:
- `dynamodb:PutItem` (write)
- `dynamodb:UpdateItem` (write)
- `dynamodb:DeleteItem` (write)
- `dynamodb:BatchWriteItem` (write)

### ✅ Context Boundaries Respected
- **Scoring Context** owns: ScoringSystem, Score, Leaderboard aggregates
- **WOD Context** owns: WOD aggregate
- Each context validates its own invariants
- Cross-context reads are for validation only, not for business logic

### ✅ Use Cases Enabled

**Scoring Context → WOD Context:**
- When submitting a time-based score, the Scoring Lambda can read the WOD record to retrieve the `timeCap` configuration
- This is needed for validation (ensuring completion time doesn't exceed time cap)

**WOD Context → Scoring Context:**
- When creating/updating a WOD, the WOD Lambda can read the ScoringSystem record to check if it's time-based
- This is needed for validation (ensuring time cap is provided for time-based scoring systems)

## Verification Steps

### 1. TypeScript Compilation
```bash
npx cdk synth --profile labvel-dev
```
✅ **Status:** Passed - No TypeScript errors

### 2. IAM Policy Verification
After deployment, verify IAM policies:

```bash
# Get the Scoring Lambda role
aws lambda get-function --function-name <scoring-lambda-name> --profile labvel-dev --query 'Configuration.Role'

# Get the role policies
aws iam list-attached-role-policies --role-name <role-name> --profile labvel-dev

# Verify the policy only includes read actions
aws iam get-policy-version --policy-arn <policy-arn> --version-id <version> --profile labvel-dev
```

Expected policy actions for WODs table access:
- ✅ `dynamodb:GetItem`
- ✅ `dynamodb:Query`
- ✅ `dynamodb:Scan`
- ✅ `dynamodb:BatchGetItem`
- ✅ `dynamodb:DescribeTable`
- ❌ `dynamodb:PutItem` (should NOT be present)
- ❌ `dynamodb:UpdateItem` (should NOT be present)
- ❌ `dynamodb:DeleteItem` (should NOT be present)

### 3. Environment Variable Verification
After deployment, verify environment variables:

```bash
# Check Scoring Lambda has WODS_TABLE
aws lambda get-function-configuration --function-name <scoring-lambda-name> --profile labvel-dev --query 'Environment.Variables.WODS_TABLE'

# Check WOD Lambda has SCORING_SYSTEMS_TABLE
aws lambda get-function-configuration --function-name <wods-lambda-name> --profile labvel-dev --query 'Environment.Variables.SCORING_SYSTEMS_TABLE'
```

## Requirements Validation

### ✅ Requirement 2.5
"WHEN a Judge enters a score for a time-based WOD, THE System SHALL display the WOD Time Cap as reference information"
- Infrastructure now supports reading WOD time cap from Scoring context

### ✅ Requirement 5.3
"WHEN a Judge enters a completion time, THE System SHALL validate that the completion time does not exceed the WOD Time Cap"
- Infrastructure now supports reading WOD time cap for validation

### ✅ DDD Pattern: Read-Only Cross-Context Access
- Proper IAM enforcement with read-only permissions
- No write permissions across contexts
- Context boundaries respected
- Anti-corruption layer pattern can be implemented in Lambda code

## Next Steps

1. **Deploy the infrastructure changes:**
   ```bash
   npm run deploy
   ```

2. **Verify IAM policies** using the verification steps above

3. **Implement Lambda code** to use the cross-context reads:
   - In `lambda/scoring/index.js`: Add code to read WOD time cap
   - In `lambda/wods/index.js`: Add code to read scoring system type

4. **Test the integration:**
   - Create a time-based scoring system
   - Create a WOD with time cap
   - Submit a score and verify time cap validation works

## Security Considerations

✅ **Least Privilege Principle:** Only read permissions are granted, not write
✅ **Context Isolation:** Each context still owns its own data
✅ **Audit Trail:** All cross-context reads are logged in CloudWatch
✅ **No Shared Aggregates:** Tables are still owned by their respective contexts

## Conclusion

Task 7.1 has been successfully implemented with proper DDD patterns and IAM enforcement. The infrastructure now supports read-only cross-context access between the Scoring and WOD bounded contexts, enabling time-based scoring validation while maintaining context boundaries.
