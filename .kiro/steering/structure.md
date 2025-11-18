# Project Structure

## Root Organization

```
athleon/
├── infrastructure/        # CDK stacks (DDD bounded contexts)
├── lambda/               # Lambda function code by domain
├── frontend/             # React application
├── layers/               # Lambda layers (shared utilities)
├── seed/                 # Database seeding scripts
├── scripts/              # Deployment and utility scripts
├── docs/                 # Architecture and API documentation
├── e2e-tests/           # End-to-end Playwright tests
└── local-dev/           # Local development setup
```

## Infrastructure (CDK Stacks)

Domain-Driven Design with bounded contexts. Deployment order matters:

```
infrastructure/
├── shared/
│   ├── shared-stack.ts          # Cognito, EventBridge, S3 (deploy first)
│   ├── network-stack.ts         # API Gateway, Authorizer (deploy second)
│   ├── lambda-layer.ts          # Shared utilities layer
│   └── event-routing.ts         # Cross-domain event routing
├── organizations/
│   └── organizations-stack.ts   # RBAC foundation (deploy third)
├── competitions/
│   └── competitions-stack.ts    # Event management
├── athletes/
│   └── athletes-stack.ts        # Athlete profiles
├── scoring/
│   └── scoring-stack.ts         # Score submission and leaderboards
├── scheduling/
│   └── scheduling-stack.ts      # Tournament scheduling
├── categories/
│   └── categories-stack.ts      # Competition categories
├── wods/
│   └── wods-stack.ts           # Workout templates
├── authorization/
│   └── authorization-stack.ts   # Legacy auth service
├── frontend/
│   └── frontend-stack.ts        # S3 + CloudFront
└── main-stack.ts                # Orchestrator (entry point)
```

### Stack Dependencies
- Shared → Network → Organizations → Domain Stacks
- Each domain stack receives shared resources via props
- Cross-domain table access is read-only for authorization checks only

## Lambda Functions

Organized by domain with independent packages:

```
lambda/
├── competitions/
│   ├── index.js                 # Main handler
│   ├── events.js                # Event CRUD operations
│   ├── eventbridge-handler.js   # Event consumer
│   ├── package.json             # Domain dependencies
│   └── test/                    # Jest unit tests
├── organizations/
│   ├── index.js                 # RBAC handler
│   └── package.json
├── athletes/
│   ├── index.js                 # Athlete profiles
│   ├── get-data.js              # Data fetcher
│   └── package.json
├── scoring/
│   ├── index.js                 # Score submission
│   ├── calculator.js            # Score calculation engine
│   ├── leaderboard-api.js       # Leaderboard endpoints
│   └── package.json
├── scheduling/
│   ├── ddd-handler.js           # DDD scheduler
│   ├── generate.js              # Schedule generation
│   └── package.json
├── categories/
│   └── index.js
├── wods/
│   └── index.js
└── authorization/
    └── index.js                 # Legacy auth service
```

### Lambda Import Patterns
- **Shared utilities**: `require('/opt/nodejs/utils/auth')` (from Lambda layer)
- **Local modules**: `require('./events')` (within same domain)
- **Cross-domain**: Use EventBridge, never direct imports

## Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── athlete/             # Athlete-specific features
│   │   │   ├── profile/         # Profile management
│   │   │   ├── events/          # Event browsing
│   │   │   └── scores/          # Score submission
│   │   ├── backoffice/          # Organizer features
│   │   │   ├── events/          # Event management
│   │   │   ├── organizations/   # Organization management
│   │   │   └── leaderboard/     # Leaderboard views
│   │   ├── common/              # Reusable components
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── ErrorBoundary/
│   │   │   └── Loading/
│   │   └── layout/              # Layout components
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAthleteProfile.js
│   │   ├── useEvents.js
│   │   └── useScores.js
│   ├── contexts/                # React contexts
│   │   └── OrganizationContext.js
│   ├── lib/                     # Configuration
│   │   ├── queryClient.js       # React Query setup
│   │   └── aws-exports.js       # Amplify config
│   └── utils/                   # Utility functions
├── public/                      # Static assets
└── cypress/                     # E2E tests
```

## Data Model (DynamoDB Tables)

### Core Tables
- **EventsTable**: PK: eventId
- **OrganizationsTable**: PK: organizationId
- **OrganizationMembersTable**: PK: organizationId, SK: userId (GSI: userId)
- **OrganizationEventsTable**: PK: organizationId, SK: eventId (GSI: eventId)
- **AthletesTable**: PK: userId
- **AthleteEventsTable**: PK: userId, SK: eventId (GSI: eventId)
- **CategoriesTable**: PK: eventId, SK: categoryId
- **WodsTable**: PK: eventId, SK: wodId
- **ScoresTable**: PK: eventId, SK: scoreId (GSI: athleteId)
- **EventDaysTable**: PK: eventId, SK: dayId

### Legacy Tables (Preserved)
- **OrganizerEventsTable**: Pre-organization system (backward compatibility)

## API Structure

### Public Endpoints (No Auth)
- `GET /public/events` - Browse published events
- `GET /public/events/{eventId}` - Event details

### Authenticated Endpoints
- `/organizations/*` - Organization management
- `/competitions/*` - Event management (requires org membership)
- `/athletes/*` - Athlete profiles and registrations
- `/scores/*` - Score submission and leaderboards
- `/categories/*` - Category management
- `/wods/*` - WOD management

## Documentation

```
docs/
├── REFACTORING_SUMMARY.md       # CDK refactoring details
├── LAMBDA_LAYER_REFACTOR.md     # Shared utilities migration
├── ORGANIZATION_REFACTOR.md     # Multi-tenant RBAC
├── TESTING_IMPLEMENTATION.md    # Testing strategy
├── scoring-system-*.md          # Scoring system phases
├── COMPETITION_SCHEDULER.md     # Tournament scheduling
└── diagrams/                    # Architecture diagrams
```

## Key Conventions

### File Naming
- **CDK Stacks**: `kebab-case-stack.ts` (e.g., `organizations-stack.ts`)
- **Lambda Handlers**: `kebab-case.js` (e.g., `eventbridge-handler.js`)
- **React Components**: `PascalCase.js` (e.g., `AthleteProfile.js`)
- **Hooks**: `camelCase.js` with `use` prefix (e.g., `useAthleteProfile.js`)

### Code Organization
- Each domain owns its tables and Lambda functions
- No direct cross-domain table writes
- EventBridge for cross-domain communication
- Read-only cross-domain access for authorization only

### Testing
- Lambda: Jest unit tests in `test/` subdirectory
- Frontend: Jest + React Testing Library for unit tests
- E2E: Cypress tests in `frontend/cypress/` and Playwright in `e2e-tests/`

### Environment-Specific
- Stage suffix on all resources (e.g., `events-table-dev`)
- AWS profile: `labvel-dev` for all operations
- Region: `us-east-2` (default)
