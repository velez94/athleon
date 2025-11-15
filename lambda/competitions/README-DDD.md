# Event Management - DDD Implementation

## Overview

This module implements event management using Domain-Driven Design (DDD) principles and serverless best practices.

## Architecture

```
lambda/competitions/
├── domain/                          # Domain Layer (Business Logic)
│   ├── entities/
│   │   └── Event.js                # Event Aggregate Root
│   └── repositories/
│       └── EventRepository.js      # Repository Interface
├── application/                     # Application Layer (Use Cases)
│   └── EventApplicationService.js  # Orchestrates domain operations
├── infrastructure/                  # Infrastructure Layer (Technical Details)
│   ├── repositories/
│   │   └── DynamoEventRepository.js # DynamoDB implementation
│   └── EventPublisher.js           # EventBridge integration
├── handler-ddd.js                  # Lambda Handler (HTTP Adapter)
└── index.js                        # Legacy handler (to be migrated)
```

## Domain Model

### Event Aggregate

The `Event` entity is the aggregate root that encapsulates all business rules related to events.

**Key Business Rules:**
1. Only published events can have public leaderboards
2. Unpublishing an event automatically makes the leaderboard private
3. Event dates must be valid (start before end)
4. Required fields: name, startDate, endDate, location

**Domain Events:**
- `EventPublished` - When an event is published
- `EventUnpublished` - When an event is unpublished
- `LeaderboardVisibilityChanged` - When leaderboard visibility changes
- `EventDeleted` - When an event is deleted

## API Endpoints

### Public Endpoints (No Auth)

```
GET /public/events
- Returns all published events

GET /public/events/{eventId}
- Returns a single published event
```

### Authenticated Endpoints

```
GET /competitions?organizationId={orgId}
- Get events for an organization

POST /competitions
- Create a new event
Body: { name, startDate, endDate, location, ... }

GET /competitions/{eventId}
- Get event details

PUT /competitions/{eventId}
- Update event
Body: { name, description, ... }

POST /competitions/{eventId}/publish
- Publish event (make visible to public)

POST /competitions/{eventId}/unpublish
- Unpublish event

POST /competitions/{eventId}/leaderboard/public
- Make leaderboard public
- Requires event to be published

POST /competitions/{eventId}/leaderboard/private
- Make leaderboard private

DELETE /competitions/{eventId}
- Delete event
```

## Usage Examples

### Creating an Event

```javascript
const eventService = new EventApplicationService(repository, publisher);

const event = await eventService.createEvent({
  name: 'Summer Competition 2025',
  startDate: '2025-06-01',
  endDate: '2025-06-03',
  location: 'Demo Gym',
  description: 'Annual summer competition',
  organizationId: 'org-123',
  published: false,
  publicLeaderboard: false
}, userId);
```

### Publishing an Event

```javascript
// This will emit an EventPublished domain event
const event = await eventService.publishEvent(eventId, userId);
```

### Making Leaderboard Public

```javascript
// This will validate that event is published first
// Then emit a LeaderboardVisibilityChanged domain event
const event = await eventService.makeLeaderboardPublic(eventId, userId);
```

## Domain Events

Domain events are published to EventBridge for:
- Audit trail
- Triggering downstream processes
- Analytics
- Notifications

Example event:
```json
{
  "Source": "competitions.event",
  "DetailType": "LeaderboardVisibilityChanged",
  "Detail": {
    "eventType": "LeaderboardVisibilityChanged",
    "eventId": "evt-123",
    "publicLeaderboard": true,
    "changedBy": "user-456",
    "changedAt": "2025-01-15T10:30:00Z"
  }
}
```

## Testing

```bash
cd lambda/competitions
npm test
```

## Migration Path

### Phase 1: Parallel Run (Current)
- New DDD handler (`handler-ddd.js`) runs alongside legacy handler
- Gradually migrate endpoints to use DDD handler
- Monitor and compare behavior

### Phase 2: Full Migration
- Update serverless.yml to use `handler-ddd.js`
- Remove legacy `index.js`
- Update all clients to use new API structure

### Phase 3: Optimization
- Implement CQRS if read/write patterns diverge
- Add caching layer for read operations
- Optimize DynamoDB access patterns

## Benefits

1. **Testability**: Business logic is isolated and easy to test
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Stateless design works well with Lambda
4. **Auditability**: Domain events provide complete audit trail
5. **Flexibility**: Easy to add new features without breaking existing code

## Best Practices

1. **Always use the Application Service**: Don't bypass it to access repositories directly
2. **Validate in the Domain**: Business rules belong in the Event entity
3. **Publish Domain Events**: They provide valuable audit trail and enable event-driven architecture
4. **Keep Handler Thin**: HTTP concerns stay in the handler, business logic in domain
5. **Use Repository Pattern**: Abstracts persistence details from business logic
