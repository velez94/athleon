# DDD Event-Driven Architecture

## Overview

This document explains how the Athleon platform implements Domain-Driven Design (DDD) principles using event-driven architecture to maintain bounded context boundaries.

## Problem: Bounded Context Violations

### Anti-Pattern (Before)
```
Competitions Lambda → Directly writes to Categories Table ❌
Competitions Lambda → Directly writes to WODs Table ❌
```

This violates DDD principles because:
- **Tight Coupling**: Competitions domain directly depends on other domains' data structures
- **Bounded Context Violation**: One domain modifies another domain's data
- **Difficult to Evolve**: Changes in Categories/WODs schemas break Competitions domain
- **No Domain Autonomy**: Domains cannot evolve independently

## Solution: Event-Driven Communication

### DDD-Compliant Pattern (After)
```
Competitions Lambda → Publishes "EventCategoriesUpdated" event → EventBridge
                                                                      ↓
Categories Lambda ← Listens to event ← Updates Categories Table ✓

Competitions Lambda → Publishes "EventWodsUpdated" event → EventBridge
                                                                 ↓
WODs Lambda ← Listens to event ← Updates WODs Table ✓
```

## Implementation

### 1. Competitions Domain (Publisher)

**File**: `lambda/competitions/handler-ddd.js`

When an event is updated, the Competitions domain:
1. Updates its own Event entity
2. Publishes domain events to EventBridge
3. Returns immediately (async communication)

```javascript
// Publish EventCategoriesUpdated event
domainEvents.push({
  Source: 'competitions.domain',
  DetailType: 'EventCategoriesUpdated',
  Detail: JSON.stringify({
    eventId,
    categories: categories || [],
    updatedBy: userId,
    timestamp: new Date().toISOString()
  }),
  EventBusName: CENTRAL_EVENT_BUS
});
```

### 2. Categories Domain (Subscriber)

**File**: `lambda/categories/event-handler.js`

The Categories domain listens for events and updates its own data:
1. Receives `EventCategoriesUpdated` event
2. Queries existing category-event associations
3. Adds/updates/removes associations as needed
4. Maintains full control over its own data

**Infrastructure**: `infrastructure/categories/categories-stack.ts`

```typescript
// EventBridge Rule: Listen to EventCategoriesUpdated
const categoriesUpdateRule = new events.Rule(this, 'EventCategoriesUpdatedRule', {
  eventBus: props.eventBus,
  eventPattern: {
    source: ['competitions.domain'],
    detailType: ['EventCategoriesUpdated'],
  },
});

categoriesUpdateRule.addTarget(new targets.LambdaFunction(categoriesEventHandler));
```

### 3. WODs Domain (Subscriber)

**File**: `lambda/wods/event-handler.js`

Similar to Categories, the WODs domain:
1. Listens for `EventWodsUpdated` events
2. Manages its own WOD-event associations
3. Maintains data consistency within its bounded context

## Benefits

### 1. **Loose Coupling**
- Domains communicate through well-defined events
- No direct dependencies on other domains' data structures
- Easy to add new subscribers without modifying publishers

### 2. **Bounded Context Integrity**
- Each domain owns and controls its own data
- No cross-domain data modifications
- Clear boundaries between domains

### 3. **Independent Evolution**
- Categories domain can change its schema without affecting Competitions
- WODs domain can add new fields independently
- Each domain can be deployed separately

### 4. **Scalability**
- Async communication allows for better performance
- Event handlers can be scaled independently
- No blocking calls between domains

### 5. **Audit Trail**
- All domain events are logged in EventBridge
- Easy to track what happened and when
- Can replay events for debugging or recovery

## Event Flow Example

### Scenario: User updates event categories

1. **Frontend** → PUT `/competitions/demo-event` with categories
2. **Competitions Lambda**:
   - Updates Event entity
   - Publishes `EventCategoriesUpdated` event
   - Returns 200 OK immediately
3. **EventBridge**:
   - Receives event
   - Routes to Categories domain
4. **Categories Event Handler**:
   - Receives event asynchronously
   - Queries existing categories for event
   - Updates category-event associations
   - Logs success

### Timeline
```
0ms:   Frontend sends request
10ms:  Competitions updates event
15ms:  Event published to EventBridge
20ms:  Response returned to frontend ✓
50ms:  Categories handler triggered
100ms: Categories updated ✓
```

## IAM Permissions

### Competitions Lambda
- **Read/Write**: Own Events table
- **Read Only**: Categories table, WODs table (for queries)
- **Publish**: EventBridge events

### Categories Event Handler
- **Read/Write**: Categories table only
- **No access**: Other domains' tables

### WODs Event Handler
- **Read/Write**: WODs table only
- **No access**: Other domains' tables

## Pragmatic DDD Approach

### Implementation Strategy

We use a **hybrid approach** that balances DDD principles with user experience:

1. **Synchronous Writes**: Competitions domain writes directly to Categories/WODs tables for immediate consistency
2. **Asynchronous Events**: Also publishes events for other consumers (audit, analytics, notifications)

This approach:
- ✅ Provides immediate consistency for user operations
- ✅ Maintains event-driven benefits for other consumers
- ✅ Avoids eventual consistency issues in critical user flows
- ⚠️ Creates a controlled bounded context coupling

### When to Use Pure Event-Driven vs Hybrid

**Pure Event-Driven** (Async only):
- Non-critical operations
- Background processing
- Analytics and reporting
- Notifications

**Hybrid** (Sync writes + Events):
- Critical user operations requiring immediate feedback
- Operations where eventual consistency causes UX issues
- High-frequency operations where latency matters

## Trade-offs

### Advantages
✅ Immediate consistency for user operations
✅ Event-driven benefits for other consumers
✅ Clear audit trail via events
✅ Better user experience
✅ Simpler error handling

### Considerations
⚠️ Controlled coupling between domains
⚠️ Competitions domain needs write access to Categories/WODs
⚠️ Schema changes in Categories/WODs may affect Competitions
⚠️ Not pure DDD but pragmatic for real-world needs

## Best Practices

1. **Event Naming**: Use past tense (EventCategoriesUpdated, not UpdateEventCategories)
2. **Event Payload**: Include all necessary data to avoid additional queries
3. **Idempotency**: Event handlers should be idempotent (safe to replay)
4. **Error Handling**: Log failures but don't fail the original request
5. **Versioning**: Include event version for future schema changes

## Future Enhancements

1. **Event Sourcing**: Store all events for complete audit trail
2. **CQRS**: Separate read and write models
3. **Saga Pattern**: Coordinate complex multi-domain transactions
4. **Dead Letter Queues**: Handle failed events gracefully
5. **Event Replay**: Ability to replay events for recovery

## Related Documentation

- [AWS EventBridge Best Practices](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-best-practices.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)
