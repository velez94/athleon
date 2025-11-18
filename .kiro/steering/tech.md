# Technology Stack

## Infrastructure

- **IaC**: AWS CDK (TypeScript) with Domain-Driven Design architecture
- **Compute**: AWS Lambda (Node.js 18.x/20.x)
- **Database**: DynamoDB with GSI indexes for multi-access patterns
- **API**: API Gateway REST API with Cognito authorizer
- **Auth**: AWS Cognito User Pools with JWT tokens
- **Storage**: S3 for event images with presigned URLs
- **Events**: EventBridge for cross-domain communication
- **Deployment**: CDK deploy with AWS CLI

## Backend

- **Runtime**: Node.js 18.x
- **SDK**: AWS SDK v3 (@aws-sdk/client-*)
- **Architecture**: Domain-Driven Design with bounded contexts
- **Lambda Layer**: Shared utilities at `/opt/nodejs/utils/`
- **Testing**: Jest for unit tests

### Lambda Domains
- `competitions/`: Event management
- `organizations/`: RBAC and multi-tenancy
- `athletes/`: Athlete profiles and registrations
- `scoring/`: Score submission and leaderboards
- `scheduling/`: Tournament scheduling
- `categories/`: Competition categories
- `wods/`: Workout templates
- `authorization/`: Legacy auth service

## Frontend

- **Framework**: React 18.3 with React Router v6
- **Build Tool**: Vite 6.0
- **State Management**: Zustand + React Query (TanStack Query)
- **Auth**: AWS Amplify v6
- **Styling**: CSS modules with design system
- **Testing**: Jest + React Testing Library + Cypress
- **Linting**: ESLint 9 with React plugins
- **Accessibility**: WCAG 2.1 Level AA compliant

## Common Commands

### Infrastructure
```bash
# Deploy all stacks
npm run deploy
# or
cdk deploy --all --profile labvel-dev

# Deploy single stack
cdk deploy Athleon/Competitions --profile labvel-dev

# Fast deploy with hotswap
npm run deploy:fast

# View changes before deploy
npm run diff

# Build Lambda layer
npm run build:layer

# Run all Lambda tests
npm test
```

### Frontend
```bash
# Development
cd frontend
npm run dev              # Start dev server (Vite)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm test                 # Unit tests (watch mode)
npm run test:coverage    # With coverage
npm run cypress          # E2E tests (UI)
npm run cypress:run      # E2E tests (headless)

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Auto-fix issues

# Deployment
npm run deploy:s3        # Deploy to S3
npm run invalidate:cloudfront  # Invalidate cache
```

### Seeding Data
```bash
# Complete setup (users + data)
./run-seed-all.sh

# Data only (if users exist)
./run-seed-data.sh

# Manual steps
cd scripts && AWS_PROFILE=labvel-dev node create-super-admin-user.js
cd ../seed && ./seed-all.sh
```

### Lambda Development
```bash
# Test specific domain
cd lambda/scoring
npm test

# Test all domains
cd lambda
./test-all.sh

# Install dependencies for domain
cd lambda/competitions
npm install
```

## Environment Variables

### Lambda Functions
All Lambda functions receive table names and bucket names via environment variables:
- `EVENTS_TABLE`, `ORGANIZATIONS_TABLE`, `ATHLETES_TABLE`, etc.
- `EVENT_IMAGES_BUCKET` for S3 uploads

### Frontend
Create `.env` in frontend directory:
```env
VITE_REGION=us-east-1
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-client-id
VITE_API_URL=https://your-api-url
```

## AWS Profile

All commands use `--profile labvel-dev` for AWS CLI operations. Ensure this profile is configured in `~/.aws/credentials`.
