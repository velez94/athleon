# Migration Guide: Legacy to DDD Architecture

## Overview

This guide explains how to migrate from the legacy `index.js` handler to the new DDD-aligned `handler-ddd.js`.

## Why Migrate?

### Current Issues (Legacy Handler)
- ❌ Business logic mixed with HTTP handling
- ❌ No validation of business rules
- ❌ Direct database manipulation
- ❌ No audit trail
- ❌ Difficult to test
- ❌ Hard to maintain and extend

### Benefits (DDD Handler)
- ✅ Clear separation of concerns
- ✅ Business rules enforced in domain
- ✅ Complete audit trail via domain events
- ✅ Easy to test
- ✅ Maintainable and extensible
- ✅ Follows serverless best practices

## Migration Strategy

### Phase 1: Parallel Deployment (Recommended)

Deploy both handlers side-by-side and gradually migrate endpoints.

#### Step 1: Update serverless.yml

```yaml
functions:
  # Legacy handler (existing)
  competitions:
    handler: lambda/competitions/index.handler
    events:
      - http:
          path: competitions/{proxy+}
          method: ANY
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  # New DDD handler
  competitions-ddd:
    handler: lambda/competitions/handler-ddd.handler
    events:
      - http:
          path: competitions-v2/{proxy+}
          method: ANY
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer
    environment:
      EVENTS_TABLE: !Ref EventsTable
      ORGANIZATION_EVENTS_TABLE: !Ref OrganizationEventsTable
      EVENT_BUS_NAME: !Ref EventBus
```

#### Step 2: Update Frontend Gradually

```javascript
// Old API calls
const event = await API.put('CalisthenicsAPI', `/competitions/${eventId}`, {
  body: { ...eventData, publicLeaderboard: true }
});

// New API calls (use v2 endpoint)
const event = await API.post('CalisthenicsAPI', 
  `/competitions-v2/${eventId}/leaderboard/public`
);
```

#### Step 3: Monitor and Compare

- Monitor CloudWatch logs for both handlers
- Compare response times
- Check for errors
- Validate domain events are being published

#### Step 4: Full Cutover

Once confident, update the path from `competitions-v2` to `competitions`:

```yaml
functions:
  competitions:
    handler: lambda/competitions/handler-ddd.handler  # Changed
    events:
      - http:
          path: competitions/{proxy+}
          method: ANY
```

### Phase 2: Direct Migration (Faster but Riskier)

Replace the handler directly without parallel deployment.

#### Step 1: Backup Current Code

```bash
cp lambda/competitions/index.js lambda/competitions/index.js.backup
```

#### Step 2: Update serverless.yml

```yaml
functions:
  competitions:
    handler: lambda/competitions/handler-ddd.handler  # Changed from index.handler
```

#### Step 3: Deploy

```bash
serverless deploy
```

#### Step 4: Test Thoroughly

Run comprehensive tests to ensure all functionality works.

## API Changes

### Creating/Updating Events

**Before:**
```javascript
// PUT /competitions/{eventId}
{
  "name": "Event Name",
  "publicLeaderboard": true,
  "published": true
}
```

**After (Same):**
```javascript
// PUT /competitions/{eventId}
{
  "name": "Event Name",
  "publicLeaderboard": true,
  "published": true
}
```

### New Dedicated Endpoints

**Making Leaderboard Public:**
```javascript
// POST /competitions/{eventId}/leaderboard/public
// No body required
```

**Making Leaderboard Private:**
```javascript
// POST /competitions/{eventId}/leaderboard/private
// No body required
```

**Publishing Event:**
```javascript
// POST /competitions/{eventId}/publish
// No body required
```

**Unpublishing Event:**
```javascript
// POST /competitions/{eventId}/unpublish
// No body required
```

## Validation Changes

The DDD handler enforces business rules that the legacy handler didn't:

### Rule 1: Public Leaderboard Requires Published Event

**Legacy:** Allowed (no validation)
```javascript
{
  "published": false,
  "publicLeaderboard": true  // ❌ This was allowed
}
```

**DDD:** Rejected
```javascript
// Will throw: "Cannot make leaderboard public for unpublished event"
```

### Rule 2: Unpublishing Makes Leaderboard Private

**Legacy:** Leaderboard stayed public
```javascript
event.published = false;
// publicLeaderboard remains true ❌
```

**DDD:** Automatically makes leaderboard private
```javascript
event.unpublish(userId);
// publicLeaderboard automatically set to false ✅
```

## Domain Events

The DDD handler publishes events to EventBridge for audit trail:

```javascript
// Example: LeaderboardVisibilityChanged event
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

### Setting Up Event Listeners

```yaml
# serverless.yml
functions:
  auditLogger:
    handler: lambda/audit/handler.logEvent
    events:
      - eventBridge:
          eventBus: !Ref EventBus
          pattern:
            source:
              - competitions.event
            detail-type:
              - LeaderboardVisibilityChanged
              - EventPublished
              - EventUnpublished
```

## Testing

### Unit Tests

```bash
cd lambda/competitions
npm test
```

### Integration Tests

```bash
# Test creating event
curl -X POST https://api.example.com/competitions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Event","startDate":"2025-06-01","endDate":"2025-06-03","location":"Test"}'

# Test making leaderboard public
curl -X POST https://api.example.com/competitions/evt-123/leaderboard/public \
  -H "Authorization: Bearer $TOKEN"
```

## Rollback Plan

If issues arise, rollback is simple:

```yaml
# serverless.yml
functions:
  competitions:
    handler: lambda/competitions/index.handler  # Revert to legacy
```

Then deploy:
```bash
serverless deploy
```

## Monitoring

### CloudWatch Metrics to Watch

- Lambda invocation count
- Error rate
- Duration
- Throttles

### CloudWatch Logs

```bash
# View DDD handler logs
aws logs tail /aws/lambda/competitions-ddd --follow

# Search for errors
aws logs filter-pattern /aws/lambda/competitions-ddd --filter-pattern "ERROR"
```

### EventBridge Events

Monitor domain events being published:

```bash
# View events in EventBridge
aws events list-rules --event-bus-name your-event-bus
```

## Troubleshooting

### Issue: "Cannot make leaderboard public for unpublished event"

**Cause:** Trying to set `publicLeaderboard: true` on unpublished event

**Solution:** Publish event first, then make leaderboard public

```javascript
// 1. Publish event
await API.post('CalisthenicsAPI', `/competitions/${eventId}/publish`);

// 2. Make leaderboard public
await API.post('CalisthenicsAPI', `/competitions/${eventId}/leaderboard/public`);
```

### Issue: Domain events not appearing in EventBridge

**Cause:** EVENT_BUS_NAME not configured

**Solution:** Add to serverless.yml:

```yaml
environment:
  EVENT_BUS_NAME: !Ref EventBus
```

## Support

For questions or issues:
1. Check CloudWatch logs
2. Review domain event history in EventBridge
3. Run unit tests to verify business logic
4. Contact the development team

## Next Steps

After successful migration:
1. Remove legacy `index.js` handler
2. Update documentation
3. Train team on DDD patterns
4. Consider implementing CQRS for read-heavy operations
