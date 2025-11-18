# Design Document

## Overview

This design document outlines the implementation of a time-based scoring system for the Athleon platform. The system enables tracking of exercise completion status and maximum repetitions achieved for incomplete exercises within time-capped WODs. This scoring mode integrates seamlessly with the existing Classic and Advanced scoring infrastructure while introducing new data structures and UI components specific to time-based performance metrics.

**Key Design Principle**: Unlike Classic and Advanced scoring systems which have global configurations, the time-based scoring system operates without a global time cap. Instead, each WOD that uses time-based scoring has its own time cap configured at the WOD level. This allows different WODs within the same event to have different time limits while sharing the same scoring system.

The design follows the platform's Domain-Driven Design architecture, with changes primarily contained within the Scoring and WOD bounded contexts, and minimal UI additions to the frontend scoring components.

## Architecture

### Bounded Context Overview

This feature spans **two bounded contexts** in the Athleon platform's Domain-Driven Design architecture:

#### 1. **Scoring Bounded Context** (Primary)
**Responsibility**: Score calculation, validation, leaderboard generation, and ranking logic

**Aggregate Roots**:
- `ScoringSystem` - Defines scoring rules and types
- `Score` - Athlete performance record with calculated results
- `Leaderboard` - Ranked list of scores for a category/WOD

**Domain Services**:
- `ScoreCalculator` - Calculates scores based on scoring system type
- `LeaderboardCalculator` - Ranks scores and generates leaderboards
- `ScoreValidator` - Validates score submissions

**Repositories**:
- `ScoringSystemRepository` - CRUD operations for scoring systems
- `ScoreRepository` - CRUD operations for scores
- `LeaderboardCacheRepository` - Caching for leaderboard results

**Domain Events**:
- `ScoreCalculated` - Emitted when a score is calculated
- `LeaderboardUpdated` - Emitted when leaderboard is recalculated

**Tables Owned**:
- `ScoringSystemsTable` (PK: eventId, SK: scoringSystemId)
- `ScoresTable` (PK: eventId, SK: scoreId, GSI: athleteId)
- `LeaderboardCacheTable` (PK: leaderboardId, GSI: eventId)

#### 2. **WOD Bounded Context** (Supporting)
**Responsibility**: WOD (Workout of the Day) management and configuration

**Aggregate Roots**:
- `WOD` - Workout definition with exercises and configuration

**Repositories**:
- `WODRepository` - CRUD operations for WODs

**Tables Owned**:
- `WodsTable` (PK: eventId, SK: wodId)

**New Attribute**: `timeCap` (minutes, seconds) - Only present when WOD uses time-based scoring

### Cross-Context Integration

**Integration Pattern**: **Read-Only Reference**

The Scoring context needs to read WOD data to:
1. Retrieve time cap configuration during score validation
2. Pass time cap to score calculator

**DDD Best Practices Applied**:

1. **No Direct Table Writes Across Contexts**
   - Scoring context NEVER writes to WodsTable
   - WOD context NEVER writes to ScoringSystemsTable or ScoresTable

2. **Read-Only Cross-Context Access**
   - Scoring Lambda reads from WodsTable (read-only)
   - WOD Lambda reads from ScoringSystemsTable (read-only, for validation only)

3. **Context Boundaries Respected**
   - Time cap is a WOD attribute (owned by WOD context)
   - Scoring system type is a Scoring attribute (owned by Scoring context)
   - Each context validates its own invariants

4. **No Shared Aggregates**
   - WOD and ScoringSystem are separate aggregates
   - They reference each other by ID only
   - No aggregate spans both contexts

5. **Eventual Consistency**
   - If WOD time cap changes, existing scores remain valid (historical record)
   - Leaderboards are eventually consistent via EventBridge

### Domain-Driven Design Patterns Applied

#### 1. Bounded Context Isolation

**Pattern**: Each bounded context owns its aggregates, domain services, and tables. No shared ownership.

**Implementation**:
- **Scoring Context** owns: ScoringSystem, Score, Leaderboard aggregates
- **WOD Context** owns: WOD aggregate
- Each context has its own Lambda function(s)
- Each context has exclusive write access to its tables

#### 2. Aggregate Boundaries

**Pattern**: Aggregates are consistency boundaries. All changes to an aggregate go through its root.

**Implementation**:
- `ScoringSystem` aggregate: scoringSystemId is the root, config is part of the aggregate
- `Score` aggregate: scoreId is the root, rawData and breakdown are part of the aggregate
- `WOD` aggregate: wodId is the root, timeCap is part of the aggregate
- No aggregate spans multiple bounded contexts

#### 3. Repository Pattern

**Pattern**: Repositories provide collection-like interface for aggregate persistence.

**Implementation**:
```javascript
// Scoring Context
class ScoringSystemRepository {
  async save(scoringSystem) { /* DynamoDB put */ }
  async findById(eventId, scoringSystemId) { /* DynamoDB get */ }
  async findByEvent(eventId) { /* DynamoDB query */ }
}

class ScoreRepository {
  async save(score) { /* DynamoDB put */ }
  async findById(eventId, scoreId) { /* DynamoDB get */ }
  async findByAthlete(athleteId) { /* DynamoDB query GSI */ }
  async findByEvent(eventId) { /* DynamoDB query */ }
}

// WOD Context
class WODRepository {
  async save(wod) { /* DynamoDB put */ }
  async findById(eventId, wodId) { /* DynamoDB get */ }
  async findByEvent(eventId) { /* DynamoDB query */ }
}
```

#### 4. Domain Services

**Pattern**: Domain logic that doesn't naturally fit within an aggregate goes into domain services.

**Implementation**:
```javascript
// Scoring Context Domain Services
class ScoreCalculator {
  calculateScore(rawData, scoringSystem, wodTimeCap) { /* calculation logic */ }
  calculateTimeBasedScore(rawData, wodTimeCap) { /* time-based logic */ }
}

class LeaderboardCalculator {
  calculateLeaderboard(scores, scoringType) { /* ranking logic */ }
  rankTimeBasedScores(scores) { /* time-based ranking */ }
}

class ScoreValidator {
  validateScore(score, scoringSystem, wod) { /* validation logic */ }
  validateTimeBasedScore(score, wod) { /* time-based validation */ }
}
```

#### 5. Domain Events

**Pattern**: Aggregates emit domain events when important state changes occur. Other contexts can subscribe.

**Implementation**:
```javascript
// Emitted by Scoring Context
{
  eventType: "ScoreCalculated",
  detail: {
    eventId: "evt-123",
    scoreId: "score-456",
    athleteId: "ath-789",
    wodId: "wod-012",
    scoringType: "time-based",
    calculatedScore: "08:45",
    breakdown: { /* ... */ }
  }
}

// Consumed by Scheduling Context (for tournament progression)
// Consumed by Scoring Context itself (for leaderboard recalculation)
```

#### 6. Anti-Corruption Layer (ACL)

**Pattern**: Protect domain model from external systems by translating between models.

**Implementation**:
```javascript
// In Scoring Context - WOD ACL
class WODAdapter {
  async getTimeCap(eventId, wodId) {
    // Read from WodsTable (external to Scoring context)
    const wod = await dynamodb.get({
      TableName: process.env.WODS_TABLE,
      Key: { eventId, wodId }
    });
    
    // Translate to Scoring context's internal model
    return wod.timeCap ? {
      minutes: wod.timeCap.minutes,
      seconds: wod.timeCap.seconds
    } : null;
  }
}

// In WOD Context - Scoring ACL
class ScoringSystemAdapter {
  async getScoringSystemType(eventId, scoringSystemId) {
    // Read from ScoringSystemsTable (external to WOD context)
    const system = await dynamodb.get({
      TableName: process.env.SCORING_SYSTEMS_TABLE,
      Key: { eventId, scoringSystemId }
    });
    
    // Translate to WOD context's internal model
    return system ? system.type : null;
  }
}
```

#### 7. Read-Only Cross-Context Access

**Pattern**: Contexts can read from other contexts' tables but NEVER write.

**Rules**:
- ✅ Scoring Lambda reads WodsTable to get timeCap
- ✅ WOD Lambda reads ScoringSystemsTable to validate type
- ❌ Scoring Lambda NEVER writes to WodsTable
- ❌ WOD Lambda NEVER writes to ScoringSystemsTable
- ❌ No Lambda writes to tables outside its bounded context

**Enforcement**:
- IAM policies restrict write permissions
- Code reviews enforce this rule
- Each context's Lambda has read-only permissions to other contexts' tables

#### 8. Eventual Consistency via Events

**Pattern**: Cross-context data synchronization happens asynchronously via domain events.

**Implementation**:
- Score submission triggers `ScoreCalculated` event
- Leaderboard calculator subscribes to `ScoreCalculated` event
- Leaderboard is updated asynchronously (eventual consistency)
- No synchronous cross-context calls for data updates

#### 9. Ubiquitous Language

**Pattern**: Use consistent terminology within each bounded context.

**Scoring Context Terms**:
- `ScoringSystem` - not "scoring configuration" or "scoring rules"
- `Score` - not "result" or "performance"
- `Leaderboard` - not "rankings" or "standings"
- `calculatedScore` - not "finalScore" or "totalScore"
- `breakdown` - not "details" or "analysis"

**WOD Context Terms**:
- `WOD` - not "workout" or "exercise"
- `timeCap` - not "timeLimit" or "maxTime"
- `movements` - not "exercises" (within WOD context)

#### 10. Context Mapping

**Relationship**: Scoring ← Customer/Supplier → WOD

- **Scoring** is the **Customer** (needs WOD data)
- **WOD** is the **Supplier** (provides WOD data)
- **Integration**: Read-only reference via Anti-Corruption Layer
- **Conformist Pattern**: Scoring conforms to WOD's data structure for timeCap

### Context Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WOD Bounded Context                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WOD Aggregate                                         │ │
│  │  - wodId, name, movements                              │ │
│  │  - scoringSystemId (reference)                         │ │
│  │  - timeCap { minutes, seconds }                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Validation: When scoringSystemId references time-based     │
│  system, timeCap must be present and valid                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Read-Only Reference
                              │ (Scoring reads WOD.timeCap)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Scoring Bounded Context                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ScoringSystem Aggregate                               │ │
│  │  - scoringSystemId, type, config                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Score Aggregate                                       │ │
│  │  - scoreId, athleteId, wodId (reference)               │ │
│  │  - rawData (exercises, completionTime)                 │ │
│  │  - breakdown (calculated results)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Domain Services:                                            │
│  - ScoreCalculator.calculateTimeBasedScore(rawData, timeCap)│
│  - ScoreValidator.validateTimeBasedScore(score, wod)        │
│  - LeaderboardCalculator.rankTimeBasedScores(scores)        │
└─────────────────────────────────────────────────────────────┘
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ScoreEntry.jsx (Enhanced)                             │ │
│  │  - Time-based scoring mode selection                   │ │
│  │  - Exercise completion checkboxes                      │ │
│  │  - Max reps input for incomplete exercises             │ │
│  │  - Completion time input with validation               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│  POST /scores                                                │
│  GET  /scores?eventId={id}                                   │
│  GET  /events/{eventId}/scoring-systems                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Lambda Functions (Scoring Domain)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  scoring/index.js (Enhanced)                           │ │
│  │  - Score submission with time-based validation         │ │
│  │  - Exercise completion status storage                  │ │
│  │  └────────────────────────────────────────────────────┘ │
│  │  scoring/calculator.js (Enhanced)                      │ │
│  │  - calculateTimeBasedScore() function                  │ │
│  │  - Ranking logic for time-based scores                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  │  scoring/leaderboard-calculator.js (Enhanced)          │ │
│  │  - Time-based ranking algorithm                        │ │
│  │  - Completion status prioritization                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DynamoDB Tables                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ScoringSystemsTable (Enhanced)                        │ │
│  │  - type: "time-based"                                  │ │
│  │  - config: { timeCap: { minutes, seconds } }           │ │
│  └────────────────────────────────────────────────────────┘ │
│  │  ScoresTable (Enhanced)                                │ │
│  │  - rawData.exercises[].completed: boolean              │ │
│  │  - rawData.exercises[].maxReps: number                 │ │
│  │  - rawData.completionTime: string                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EventBridge                             │
│  Event: ScoreCalculated                                      │
│  - Triggers leaderboard recalculation                        │
│  - Contains time-based score details                         │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points (Bounded Context Perspective)

#### Within Scoring Bounded Context:
1. **ScoringSystemsTable** (Owned): Extended to support "time-based" type without global time cap configuration
2. **ScoresTable** (Owned): Enhanced rawData and breakdown structures for exercise completion tracking
3. **LeaderboardCacheTable** (Owned): Stores time-based leaderboard results
4. **ScoreCalculator Domain Service** (Owned): New `calculateTimeBasedScore()` function
5. **LeaderboardCalculator Domain Service** (Owned): New `rankTimeBasedScores()` function
6. **ScoreValidator Domain Service** (Owned): Time-based validation logic

#### Within WOD Bounded Context:
1. **WodsTable** (Owned): Enhanced with optional `timeCap` field for time-based scoring
2. **WOD Aggregate** (Owned): Validation logic to require timeCap when using time-based scoring system

#### Cross-Context Integration (Read-Only):
1. **Scoring → WOD**: Scoring Lambda reads WodsTable to retrieve timeCap during score submission
2. **WOD → Scoring**: WOD Lambda reads ScoringSystemsTable to validate scoring system type during WOD creation/update

#### Frontend (Presentation Layer):
1. **Score Entry UI**: New form fields for exercise completion tracking and time entry
2. **WOD Management UI**: Enhanced to configure time cap when assigning time-based scoring system
3. **Scoring System Manager UI**: Simplified for time-based type (no global config)

#### Infrastructure (Shared):
1. **EventBridge**: Existing `ScoreCalculated` event extended with time-based metadata
2. **API Gateway**: Routes requests to appropriate bounded context Lambda functions


## Domain Invariants (Business Rules)

### Scoring Context Invariants

**Invariant 1: Score Completeness**
- A time-based score MUST have completion status (true/false) for every exercise in the WOD
- Violation: Reject score submission with 400 error

**Invariant 2: MaxReps Requirement**
- An incomplete exercise (completed=false) MUST have a maxReps value
- A complete exercise (completed=true) MUST NOT have a maxReps value (or it should be null)
- Violation: Reject score submission with 400 error

**Invariant 3: Completion Time Validity**
- If all exercises are completed, completion time MUST be provided
- Completion time MUST NOT exceed the WOD's time cap
- Completion time MUST be in valid mm:ss format
- Violation: Reject score submission with 400 error

**Invariant 4: Scoring System Type Consistency**
- A ScoringSystem with type="time-based" MUST have empty config object
- A ScoringSystem with type="classic" or "advanced" MUST have config with appropriate fields
- Violation: Reject scoring system creation with 400 error

**Invariant 5: Score Immutability**
- Once a Score is calculated and stored, its calculatedScore and breakdown are immutable
- Updates create new score records (with updatedAt timestamp)
- Historical scores remain unchanged for audit trail

### WOD Context Invariants

**Invariant 6: Time Cap Requirement**
- A WOD with scoringSystemId referencing a time-based scoring system MUST have a timeCap
- A WOD with scoringSystemId referencing classic/advanced scoring MAY NOT have a timeCap
- Violation: Reject WOD creation/update with 400 error

**Invariant 7: Time Cap Validity**
- timeCap.minutes MUST be >= 0
- timeCap.seconds MUST be >= 0 and <= 59
- Total time (minutes * 60 + seconds) MUST be > 0
- Violation: Reject WOD creation/update with 400 error

**Invariant 8: Scoring System Reference Validity**
- A WOD's scoringSystemId MUST reference an existing ScoringSystem in the same event
- Violation: Reject WOD creation/update with 400 error

### Cross-Context Invariants

**Invariant 9: Referential Integrity**
- A Score's wodId MUST reference an existing WOD
- A Score's scoringSystemId MUST reference an existing ScoringSystem
- These are validated at submission time (eventual consistency acceptable)
- Violation: Reject score submission with 400 error

**Invariant 10: Scoring Type Consistency**
- A Score submitted for a WOD MUST use the scoring system type configured for that WOD
- Time-based scores can only be submitted for WODs with time-based scoring systems
- Violation: Reject score submission with 400 error


## Components and Interfaces

### 1. Backend Components (Bounded Context Ownership)

#### 1.1 Scoring System Configuration

**Bounded Context**: **Scoring** (Owner)

**Location**: `lambda/scoring/systems.js` (existing file, enhanced)

**Aggregate**: `ScoringSystem`

**New Scoring System Type**:
```javascript
{
  eventId: "evt-123",
  scoringSystemId: "sys-456",
  name: "Time-Based WOD Scoring",
  type: "time-based",
  config: {},  // No global time cap - configured per WOD
  createdBy: "user-789",
  createdAt: "2025-11-17T10:00:00Z"
}
```

**Storage**: `ScoringSystemsTable` (existing table, no schema changes needed)

**Note**: Unlike Classic and Advanced scoring systems, time-based scoring systems do not have a global configuration. The time cap is configured at the WOD level when the scoring system is assigned to a WOD.

#### 1.1.1 WOD Management Enhancement

**Bounded Context**: **WOD** (Owner)

**Location**: `lambda/wods/index.js` (existing file, enhanced)

**Aggregate**: `WOD`

**Domain Invariant**: When a WOD references a time-based scoring system, it MUST have a valid time cap configured.

**Cross-Context Validation**: WOD context reads from ScoringSystemsTable (read-only) to validate scoring system type.

**New Validation Logic**:
```javascript
// When creating or updating a WOD
if (body.scoringSystemId) {
  // Fetch scoring system to check type
  const scoringSystem = await getScoringSystem(body.eventId, body.scoringSystemId);
  
  // Validate time cap is provided for time-based scoring
  if (scoringSystem.type === 'time-based') {
    if (!body.timeCap || !body.timeCap.minutes === undefined || !body.timeCap.seconds === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Time cap is required for WODs using time-based scoring system'
        })
      };
    }
    
    // Validate time cap values
    if (body.timeCap.minutes < 0 || body.timeCap.seconds < 0 || body.timeCap.seconds > 59) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid time cap values. Minutes must be >= 0, seconds must be 0-59'
        })
      };
    }
    
    const totalSeconds = body.timeCap.minutes * 60 + body.timeCap.seconds;
    if (totalSeconds <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Time cap must be greater than zero'
        })
      };
    }
  }
}
```

**Enhanced WOD Schema**:
```javascript
{
  eventId: "evt-123",
  wodId: "wod-789",
  name: "Murph",
  movements: [...],
  scoringSystemId: "sys-time-based",
  timeCap: {  // NEW FIELD - only present for time-based scoring
    minutes: 10,
    seconds: 0
  },
  createdAt: "2025-11-17T10:00:00Z"
}
```

**Storage**: `WodsTable` (existing table, enhanced with optional timeCap field)

#### 1.2 Score Calculator Enhancement

**Bounded Context**: **Scoring** (Owner)

**Location**: `lambda/scoring/calculator.js` (existing file, enhanced)

**Domain Service**: `ScoreCalculator`

**Responsibility**: Calculate scores based on scoring system type and raw performance data

**New Function**:
```javascript
function calculateTimeBasedScore(rawData, wodTimeCap) {
  const { exercises, completionTime } = rawData;
  const allCompleted = exercises.every(ex => ex.completed === true);
  
  // Calculate total reps for incomplete WODs
  const totalReps = exercises.reduce((sum, ex) => {
    return sum + (ex.completed ? ex.reps : (ex.maxReps || 0));
  }, 0);
  
  // Calculate completed exercise count
  const completedCount = exercises.filter(ex => ex.completed).length;
  
  // Use WOD time cap from WOD configuration
  const timeCap = wodTimeCap || completionTime;
  
  return {
    calculatedScore: allCompleted ? completionTime : totalReps,
    breakdown: {
      allCompleted,
      completionTime: allCompleted ? completionTime : timeCap,
      totalReps,
      completedExercises: completedCount,
      totalExercises: exercises.length,
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        completed: ex.completed,
        maxReps: ex.maxReps,
        reps: ex.reps
      }))
    }
  };
}
```

**Note**: The `wodTimeCap` parameter is retrieved from the WOD record, not from the scoring system configuration.

**Integration Point**: Add to existing `calculateScore()` function:
```javascript
exports.calculateScore = (rawData, scoringSystem, wodTimeCap) => {
  if (scoringSystem.type === 'classic') {
    return calculateClassicScore(rawData, scoringSystem.config);
  } else if (scoringSystem.type === 'advanced') {
    return calculateAdvancedScore(rawData, scoringSystem.config);
  } else if (scoringSystem.type === 'time-based') {
    return calculateTimeBasedScore(rawData, wodTimeCap);
  }
  
  throw new Error(`Unknown scoring system type: ${scoringSystem.type}`);
};
```

**Note**: For time-based scoring, the WOD time cap must be fetched from the WOD record and passed to the calculator.


#### 1.3 Score Submission Enhancement

**Bounded Context**: **Scoring** (Owner)

**Location**: `lambda/scoring/index.js` (existing file, enhanced)

**Aggregate**: `Score`

**Domain Service**: `ScoreValidator`

**Cross-Context Read**: Scoring context reads from WodsTable (read-only) to retrieve time cap for validation

**Anti-Corruption Layer**: The Scoring context treats WOD as an external system and only reads the specific attributes it needs (timeCap). It does not depend on WOD's internal structure or business logic.

**Enhanced Score Payload**:
```javascript
{
  eventId: "evt-123",
  athleteId: "ath-456",
  wodId: "wod-789",
  categoryId: "cat-012",
  scoringSystemId: "sys-time-based",
  rawData: {
    exercises: [
      {
        exerciseId: "ex-pull-ups",
        exerciseName: "Pull Ups",
        completed: true,
        reps: 50,
        maxReps: null  // null when completed
      },
      {
        exerciseId: "ex-push-ups",
        exerciseName: "Push Ups",
        completed: false,
        reps: 100,  // target reps
        maxReps: 75  // actual reps achieved
      }
    ],
    completionTime: "08:45"  // mm:ss format
  }
}
```

**Validation Logic** (added to existing handler):
```javascript
// Validate time-based score submission
if (scoringSystem.type === 'time-based') {
  const { exercises, completionTime } = body.rawData;
  
  // Fetch WOD to get time cap
  const wod = await getWod(body.eventId, body.wodId);
  if (!wod.timeCap) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        message: 'WOD must have time cap configured for time-based scoring' 
      })
    };
  }
  
  // Validate all exercises have completion status
  if (!exercises || !exercises.every(ex => typeof ex.completed === 'boolean')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        message: 'All exercises must have completion status' 
      })
    };
  }
  
  // Validate incomplete exercises have maxReps
  const incompleteExercises = exercises.filter(ex => !ex.completed);
  if (incompleteExercises.some(ex => !ex.maxReps && ex.maxReps !== 0)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        message: 'Incomplete exercises must have maxReps value' 
      })
    };
  }
  
  // Validate completion time doesn't exceed WOD time cap
  if (completionTime && wod.timeCap) {
    const completionSeconds = parseTimeToSeconds(completionTime);
    const capSeconds = parseTimeToSeconds(
      `${wod.timeCap.minutes}:${String(wod.timeCap.seconds).padStart(2, '0')}`
    );
    if (completionSeconds > capSeconds) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: `Completion time cannot exceed time cap (${wod.timeCap.minutes}:${String(wod.timeCap.seconds).padStart(2, '0')})` 
        })
      };
    }
  }
  
  // Pass WOD time cap to calculator
  const calculatedScore = calculateScore(body.rawData, scoringSystem, wod.timeCap);
}
```

**Note**: The handler must fetch the WOD record to retrieve the time cap before validation and calculation.


#### 1.4 Leaderboard Calculator Enhancement

**Bounded Context**: **Scoring** (Owner)

**Location**: `lambda/scoring/leaderboard-calculator.js` (existing file, enhanced)

**Domain Service**: `LeaderboardCalculator`

**Responsibility**: Rank scores and generate leaderboards based on scoring system type

**Time-Based Ranking Algorithm**:
```javascript
function rankTimeBasedScores(scores) {
  // Separate completed vs incomplete
  const completed = scores.filter(s => s.breakdown?.allCompleted === true);
  const incomplete = scores.filter(s => s.breakdown?.allCompleted !== true);
  
  // Sort completed by time (ascending - faster is better)
  completed.sort((a, b) => {
    const timeA = parseTimeToSeconds(a.breakdown.completionTime);
    const timeB = parseTimeToSeconds(b.breakdown.completionTime);
    return timeA - timeB;
  });
  
  // Sort incomplete by:
  // 1. Number of completed exercises (descending)
  // 2. Total reps (descending)
  incomplete.sort((a, b) => {
    const completedDiff = b.breakdown.completedExercises - a.breakdown.completedExercises;
    if (completedDiff !== 0) return completedDiff;
    return b.breakdown.totalReps - a.breakdown.totalReps;
  });
  
  // Assign ranks
  let rank = 1;
  const rankedCompleted = completed.map(score => ({ ...score, rank: rank++ }));
  const rankedIncomplete = incomplete.map(score => ({ ...score, rank: rank++ }));
  
  return [...rankedCompleted, ...rankedIncomplete];
}
```

**Integration**: Add to existing `calculateEventLeaderboard()` function to detect time-based scoring systems and apply appropriate ranking logic.

### 1.5 Lambda Function Organization (Bounded Context Implementation)

#### Scoring Bounded Context Lambda

**Location**: `lambda/scoring/`

**Handler**: `lambda/scoring/index.js`

**Structure**:
```
lambda/scoring/
├── index.js                      # Main handler (API Gateway integration)
├── calculator.js                 # ScoreCalculator domain service
├── leaderboard-calculator.js     # LeaderboardCalculator domain service
├── leaderboard-api.js            # Leaderboard query endpoints
├── systems.js                    # ScoringSystem aggregate operations
├── utils.js                      # Shared utilities (time parsing, etc.)
├── event-handler.js              # EventBridge consumer
└── test/
    ├── calculator.test.js
    ├── leaderboard-calculator.test.js
    └── integration.test.js
```

**Responsibilities**:
- Score submission and validation
- Score calculation (all types: classic, advanced, time-based)
- Leaderboard generation and ranking
- Scoring system CRUD operations

**Table Access**:
- **Write**: ScoringSystemsTable, ScoresTable, LeaderboardCacheTable
- **Read**: ScoringSystemsTable, ScoresTable, LeaderboardCacheTable, WodsTable (cross-context, read-only)

**Environment Variables**:
```javascript
process.env.SCORING_SYSTEMS_TABLE  // Owned
process.env.SCORES_TABLE            // Owned
process.env.LEADERBOARD_CACHE_TABLE // Owned
process.env.WODS_TABLE              // Cross-context read-only
process.env.EVENT_BUS_NAME          // For domain events
```

#### WOD Bounded Context Lambda

**Location**: `lambda/wods/`

**Handler**: `lambda/wods/index.js`

**Structure**:
```
lambda/wods/
├── index.js                      # Main handler (API Gateway integration)
├── get-data.js                   # WOD query operations
├── eventbridge-handler.js        # EventBridge consumer
├── public.js                     # Public WOD endpoints
└── test/
    └── index.test.js
```

**Responsibilities**:
- WOD CRUD operations
- WOD validation (including time cap validation)
- Public WOD queries

**Table Access**:
- **Write**: WodsTable
- **Read**: WodsTable, ScoringSystemsTable (cross-context, read-only for validation)

**Environment Variables**:
```javascript
process.env.WODS_TABLE              // Owned
process.env.SCORING_SYSTEMS_TABLE   // Cross-context read-only
process.env.EVENT_BUS_NAME          // For domain events
```

#### Cross-Context Access Pattern

**Implementation in Scoring Lambda** (`lambda/scoring/index.js`):
```javascript
// Anti-Corruption Layer for WOD access
async function getWODTimeCap(eventId, wodId) {
  const params = {
    TableName: process.env.WODS_TABLE,
    Key: { eventId, wodId }
  };
  
  const result = await dynamodb.get(params).promise();
  
  if (!result.Item) {
    throw new Error(`WOD not found: ${wodId}`);
  }
  
  // Extract only what we need - don't depend on WOD's internal structure
  return result.Item.timeCap || null;
}

// Usage in score submission handler
const wodTimeCap = await getWODTimeCap(body.eventId, body.wodId);
if (scoringSystem.type === 'time-based' && !wodTimeCap) {
  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'WOD must have time cap configured for time-based scoring'
    })
  };
}
```

**Implementation in WOD Lambda** (`lambda/wods/index.js`):
```javascript
// Anti-Corruption Layer for ScoringSystem access
async function getScoringSystemType(eventId, scoringSystemId) {
  const params = {
    TableName: process.env.SCORING_SYSTEMS_TABLE,
    Key: { eventId, scoringSystemId }
  };
  
  const result = await dynamodb.get(params).promise();
  
  if (!result.Item) {
    throw new Error(`Scoring system not found: ${scoringSystemId}`);
  }
  
  // Extract only what we need - don't depend on Scoring's internal structure
  return result.Item.type || null;
}

// Usage in WOD creation/update handler
if (body.scoringSystemId) {
  const scoringType = await getScoringSystemType(body.eventId, body.scoringSystemId);
  
  if (scoringType === 'time-based' && !body.timeCap) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Time cap is required for WODs using time-based scoring system'
      })
    };
  }
}
```

#### IAM Permissions (Bounded Context Enforcement)

**Scoring Lambda IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/scoring-systems-table-*",
        "arn:aws:dynamodb:*:*:table/scores-table-*",
        "arn:aws:dynamodb:*:*:table/leaderboard-cache-table-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/wods-table-*"
      ]
    }
  ]
}
```

**WOD Lambda IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/wods-table-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/scoring-systems-table-*"
      ]
    }
  ]
}
```

**Note**: IAM policies enforce bounded context boundaries by restricting write access to owned tables only.


### 2. Frontend Components

#### 2.1 Scoring System Creation UI

**Location**: `frontend/src/components/backoffice/ScoringSystemManager.jsx` (new file)

**Component Structure**:
```jsx
function ScoringSystemManager({ eventId }) {
  const [systemType, setSystemType] = useState('classic');
  
  return (
    <div className="scoring-system-form">
      <h3>Create Scoring System</h3>
      
      <div className="form-group">
        <label>Scoring Type</label>
        <select value={systemType} onChange={(e) => setSystemType(e.target.value)}>
          <option value="classic">Classic</option>
          <option value="advanced">Advanced</option>
          <option value="time-based">Time-Based</option>
        </select>
      </div>
      
      {systemType === 'time-based' && (
        <div className="info-message">
          <p>ℹ️ Time caps are configured per WOD when assigning this scoring system.</p>
        </div>
      )}
      
      <button onClick={handleSubmit}>Create Scoring System</button>
    </div>
  );
}
```

**Note**: Time-based scoring systems do not have global configuration. The time cap is set at the WOD level.

#### 2.1.1 WOD Time Cap Configuration UI

**Location**: `frontend/src/components/backoffice/WodManager.jsx` (existing file, enhanced)

**Enhanced Component Structure**:
```jsx
function WodManager({ eventId, wod }) {
  const [scoringSystemId, setScoringSystemId] = useState(wod?.scoringSystemId || '');
  const [timeCap, setTimeCap] = useState(wod?.timeCap || { minutes: 10, seconds: 0 });
  const [scoringSystems, setScoringSystem] = useState([]);
  
  // Fetch scoring systems for event
  useEffect(() => {
    fetchScoringSystems(eventId).then(setScoringSystem);
  }, [eventId]);
  
  // Find selected scoring system
  const selectedSystem = scoringSystems.find(s => s.scoringSystemId === scoringSystemId);
  const isTimeBased = selectedSystem?.type === 'time-based';
  
  return (
    <div className="wod-form">
      <h3>{wod ? 'Edit WOD' : 'Create WOD'}</h3>
      
      {/* ... other WOD fields ... */}
      
      <div className="form-group">
        <label>Scoring System</label>
        <select 
          value={scoringSystemId} 
          onChange={(e) => setScoringSystemId(e.target.value)}
        >
          <option value="">Select Scoring System</option>
          {scoringSystems.map(system => (
            <option key={system.scoringSystemId} value={system.scoringSystemId}>
              {system.name} ({system.type})
            </option>
          ))}
        </select>
      </div>
      
      {isTimeBased && (
        <div className="time-cap-config">
          <label>Time Cap (Required for Time-Based Scoring)</label>
          <div className="time-inputs">
            <input 
              type="number" 
              min="0"
              value={timeCap.minutes}
              onChange={(e) => setTimeCap({...timeCap, minutes: parseInt(e.target.value)})}
              placeholder="Minutes"
              required
            />
            <span>:</span>
            <input 
              type="number" 
              min="0"
              max="59"
              value={timeCap.seconds}
              onChange={(e) => setTimeCap({...timeCap, seconds: parseInt(e.target.value)})}
              placeholder="Seconds"
              required
            />
          </div>
          <small>Athletes must complete all exercises within this time limit</small>
        </div>
      )}
      
      <button onClick={handleSubmit}>Save WOD</button>
    </div>
  );
}
```


#### 2.2 Time-Based Score Entry UI

**Location**: `frontend/src/components/backoffice/ScoreEntry.jsx` (existing file, enhanced)

**Enhanced Component Structure**:
```jsx
// Add to existing ScoreEntry component
const [exerciseCompletionStatus, setExerciseCompletionStatus] = useState([]);
const [completionTime, setCompletionTime] = useState('');

// Initialize when WOD is selected
useEffect(() => {
  if (selectedWod?.movements && scoringSystem?.type === 'time-based') {
    setExerciseCompletionStatus(
      selectedWod.movements.map(m => ({
        exerciseId: m.exerciseId,
        exerciseName: m.exercise,
        targetReps: m.reps,
        completed: false,
        maxReps: ''
      }))
    );
  }
}, [selectedWod, scoringSystem]);

// Render time-based score entry form
{scoringSystem?.type === 'time-based' && (
  <div className="time-based-score-entry">
    <h4>Exercise Completion</h4>
    
    {exerciseCompletionStatus.map((exercise, idx) => (
      <div key={idx} className="exercise-completion-row">
        <div className="exercise-info">
          <span>{exercise.exerciseName}</span>
          <small>Target: {exercise.targetReps} reps</small>
        </div>
        
        <div className="completion-checkbox">
          <label>
            <input
              type="checkbox"
              checked={exercise.completed}
              onChange={(e) => {
                const updated = [...exerciseCompletionStatus];
                updated[idx].completed = e.target.checked;
                if (e.target.checked) {
                  updated[idx].maxReps = exercise.targetReps;
                }
                setExerciseCompletionStatus(updated);
              }}
            />
            Completed
          </label>
        </div>
        
        {!exercise.completed && (
          <div className="max-reps-input">
            <label>Max Reps Achieved</label>
            <input
              type="number"
              min="0"
              max={exercise.targetReps}
              value={exercise.maxReps}
              onChange={(e) => {
                const updated = [...exerciseCompletionStatus];
                updated[idx].maxReps = e.target.value;
                setExerciseCompletionStatus(updated);
              }}
              required
            />
          </div>
        )}
      </div>
    ))}
    
    <div className="completion-time-input">
      <label>Completion Time (mm:ss)</label>
      <input
        type="text"
        placeholder="10:00"
        value={completionTime}
        onChange={(e) => setCompletionTime(e.target.value)}
        pattern="[0-9]{1,2}:[0-9]{2}"
      />
      <small>
        Time Cap: {selectedWod.timeCap.minutes}:
        {String(selectedWod.timeCap.seconds).padStart(2, '0')}
      </small>
    </div>
  </div>
)}
```

**Note**: The time cap is displayed from `selectedWod.timeCap`, not from the scoring system configuration.


#### 2.3 Time-Based Score Display UI

**Location**: `frontend/src/components/athlete/ScoreDetails.jsx` (new component)

**Component Structure**:
```jsx
function TimeBasedScoreDetails({ score }) {
  const { breakdown } = score;
  
  return (
    <div className="time-based-score-details">
      <div className="score-header">
        <h3>
          {breakdown.allCompleted ? (
            <>✅ Completed in {breakdown.completionTime}</>
          ) : (
            <>⏱️ Time Cap Reached - {breakdown.totalReps} reps</>
          )}
        </h3>
      </div>
      
      <div className="exercise-breakdown">
        <h4>Exercise Breakdown</h4>
        {breakdown.exercises.map((exercise, idx) => (
          <div key={idx} className="exercise-row">
            <span className="exercise-name">{exercise.exerciseName}</span>
            <span className={`status ${exercise.completed ? 'completed' : 'incomplete'}`}>
              {exercise.completed ? (
                <>✓ {exercise.reps} reps</>
              ) : (
                <>✗ {exercise.maxReps}/{exercise.reps} reps</>
              )}
            </span>
          </div>
        ))}
      </div>
      
      <div className="completion-summary">
        <div className="stat">
          <label>Exercises Completed</label>
          <span>{breakdown.completedExercises}/{breakdown.totalExercises}</span>
        </div>
        {!breakdown.allCompleted && (
          <div className="stat">
            <label>Total Reps</label>
            <span>{breakdown.totalReps}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 2.4 Leaderboard Display Enhancement

**Location**: `frontend/src/components/backoffice/leaderboard/LeaderboardView.jsx` (existing file, enhanced)

**Enhanced Leaderboard Row**:
```jsx
function LeaderboardRow({ entry, scoringType }) {
  return (
    <tr>
      <td>{entry.rank}</td>
      <td>{entry.athleteName}</td>
      <td>
        {scoringType === 'time-based' ? (
          entry.breakdown?.allCompleted ? (
            <span className="completion-time">⏱️ {entry.breakdown.completionTime}</span>
          ) : (
            <span className="total-reps">
              {entry.breakdown?.totalReps} reps 
              ({entry.breakdown?.completedExercises}/{entry.breakdown?.totalExercises} exercises)
            </span>
          )
        ) : (
          <span>{entry.score} pts</span>
        )}
      </td>
      <td>
        <button onClick={() => showDetails(entry)}>View Details</button>
      </td>
    </tr>
  );
}
```


## Data Models

### 1. Scoring System (Time-Based)

**Table**: `ScoringSystemsTable`

**Schema** (no changes to table structure, new type added):
```javascript
{
  eventId: String,           // PK
  scoringSystemId: String,   // SK
  name: String,
  type: "time-based",        // NEW TYPE
  config: {},                // Empty config - no global time cap
  createdBy: String,
  createdAt: String
}
```

**Note**: Unlike Classic and Advanced scoring systems, time-based scoring systems have no global configuration. The time cap is configured per WOD.

### 1.1 WOD Record (Enhanced)

**Table**: `WodsTable`

**Enhanced Schema**:
```javascript
{
  eventId: String,           // PK
  wodId: String,             // SK
  name: String,
  description: String,
  movements: Array,
  scoringSystemId: String,
  timeCap: {                 // NEW FIELD - only present when scoringSystemId references time-based system
    minutes: Number,         // e.g., 10
    seconds: Number          // e.g., 0
  },
  createdBy: String,
  createdAt: String,
  updatedAt: String
}
```

**Validation Rules**:
- `timeCap` is required when `scoringSystemId` references a time-based scoring system
- `timeCap.minutes` must be >= 0
- `timeCap.seconds` must be >= 0 and <= 59
- Total time cap (minutes * 60 + seconds) must be > 0

### 2. Score Record (Time-Based)

**Table**: `ScoresTable`

**Enhanced Schema** (existing table, enhanced rawData structure):
```javascript
{
  eventId: String,           // PK
  scoreId: String,           // SK
  athleteId: String,
  wodId: String,
  categoryId: String,
  scoringSystemId: String,
  score: String,             // completionTime (e.g., "08:45") or totalReps (e.g., "150")
  rawData: {
    exercises: [
      {
        exerciseId: String,
        exerciseName: String,
        completed: Boolean,  // NEW FIELD
        reps: Number,        // target reps
        maxReps: Number      // NEW FIELD - actual reps if incomplete
      }
    ],
    completionTime: String   // NEW FIELD - "mm:ss" format
  },
  breakdown: {
    allCompleted: Boolean,   // NEW FIELD
    completionTime: String,  // NEW FIELD - from rawData or WOD time cap
    totalReps: Number,       // NEW FIELD
    completedExercises: Number,  // NEW FIELD
    totalExercises: Number,  // NEW FIELD
    exercises: [             // NEW FIELD
      {
        exerciseId: String,
        exerciseName: String,
        completed: Boolean,
        maxReps: Number,
        reps: Number
      }
    ]
  },
  createdAt: String,
  updatedAt: String
}
```

**Note**: The `timeCap` is not stored in rawData. It is retrieved from the WOD record and used in the breakdown calculation.

### 3. Leaderboard Cache Entry (Time-Based)

**Table**: `LeaderboardCacheTable`

**Enhanced Schema**:
```javascript
{
  leaderboardId: String,     // PK: "event-{eventId}-category-{categoryId}-wod-{wodId}"
  eventId: String,           // GSI
  categoryId: String,
  wodId: String,
  scoringType: "time-based", // NEW VALUE
  entries: [
    {
      rank: Number,
      athleteId: String,
      athleteName: String,
      score: String,         // completionTime or totalReps
      breakdown: {
        allCompleted: Boolean,
        completionTime: String,
        totalReps: Number,
        completedExercises: Number,
        totalExercises: Number
      }
    }
  ],
  ttl: Number,
  updatedAt: String
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time-based scoring system creation without time cap

*For any* time-based scoring system creation request, the system should successfully create the scoring system with an empty config object (no time cap required).

**Validates: Requirements 1.2**

### Property 2: Scoring system persistence and retrieval

*For any* created time-based scoring system, querying for that scoring system by its ID should return the same scoring system with all original attributes.

**Validates: Requirements 1.3**

### Property 3: Time-based badge display

*For any* list of scoring systems that includes time-based systems, the rendered list should display a "Time-Based" badge for each time-based scoring system.

**Validates: Requirements 1.4**

### Property 4: WOD scoring system association

*For any* WOD created with a time-based scoring system ID, retrieving that WOD should return the same scoring system ID.

**Validates: Requirements 1.5**

### Property 5: Time cap validation

*For any* time cap configuration, the system should accept only values where (minutes * 60 + seconds) > 0, minutes >= 0, and seconds is between 0 and 59.

**Validates: Requirements 2.2**

### Property 6: Time cap persistence

*For any* WOD created with a time cap, retrieving that WOD should return the same time cap values (minutes and seconds).

**Validates: Requirements 2.3**

### Property 7: Time cap display consistency

*For any* WOD with a time cap, the displayed time cap in the UI should match the stored time cap values.

**Validates: Requirements 2.4**

### Property 8: Exercise completion checkbox count

*For any* WOD with N exercises, the score entry form should display exactly N completion checkboxes.

**Validates: Requirements 3.1**

### Property 9: Completion status persistence (true)

*For any* exercise marked as completed in a score submission, the stored score record should have completed=true for that exercise.

**Validates: Requirements 3.2**

### Property 10: Completion status persistence (false)

*For any* exercise left unmarked in a score submission, the stored score record should have completed=false for that exercise.

**Validates: Requirements 3.3**

### Property 11: Completion status toggle

*For any* exercise in the score entry form, toggling the completion checkbox should change the completion state in the UI.

**Validates: Requirements 3.4**

### Property 12: All completion statuses stored

*For any* score submission with multiple exercises, all exercise completion statuses should be present in the stored score record.

**Validates: Requirements 3.5**

### Property 13: Max reps input visibility for incomplete exercises

*For any* exercise marked as incomplete, the score entry form should display a max reps input field.

**Validates: Requirements 4.1**

### Property 14: Max reps validation

*For any* max reps value entered for an incomplete exercise, the system should accept only positive integers.

**Validates: Requirements 4.2**

### Property 15: Max reps input hidden for complete exercises

*For any* exercise marked as complete, the score entry form should not display a max reps input field.

**Validates: Requirements 4.3**

### Property 16: Max reps persistence

*For any* score submission with incomplete exercises, the stored score record should contain the max reps values for all incomplete exercises.

**Validates: Requirements 4.4**

### Property 17: Max reps required validation

*For any* score submission attempt with incomplete exercises missing max reps values, the system should display a validation error and prevent submission.

**Validates: Requirements 4.5**

### Property 18: Completion time acceptance

*For any* valid completion time in mm:ss format that does not exceed the WOD time cap, the system should accept the value.

**Validates: Requirements 5.2**

### Property 19: Completion time cap validation

*For any* completion time that exceeds the WOD time cap, the system should reject the submission with a validation error.

**Validates: Requirements 5.3**

### Property 20: Completion time persistence

*For any* score submission with a completion time, the stored score record should contain the completion time value in the rawData.

**Validates: Requirements 5.4**

### Property 21: Time cap as default for incomplete WODs

*For any* score submission where not all exercises are completed, the breakdown should contain a completion time equal to the WOD time cap.

**Validates: Requirements 5.5**

### Property 22: Score display shows completion time

*For any* time-based score, the score detail view should display either the completion time (if all exercises completed) or the time cap.

**Validates: Requirements 6.1**

### Property 23: All exercises displayed with status

*For any* time-based score with N exercises, the score detail view should display all N exercises with completion status indicators.

**Validates: Requirements 6.2**

### Property 24: Max reps displayed for incomplete exercises

*For any* incomplete exercise in a score, the score detail view should display the max reps achieved.

**Validates: Requirements 6.3**

### Property 25: Leaderboard ranking order

*For any* set of time-based scores, the leaderboard should rank completed athletes before incomplete athletes, with completed athletes sorted by time (ascending) and incomplete athletes sorted by completed exercises (descending) then total reps (descending).

**Validates: Requirements 6.4, 7.1, 7.2, 7.3**

### Property 26: Tie rank assignment

*For any* two or more athletes with identical completion status and time/reps, the system should assign them the same rank.

**Validates: Requirements 7.4**

### Property 27: Leaderboard display completeness

*For any* leaderboard entry, the display should include rank, athlete name, completion time or total reps, and completion status.

**Validates: Requirements 7.5**

### Property 28: ScoreCalculated event emission

*For any* time-based score submission, the system should emit a ScoreCalculated event to EventBridge containing the score details.

**Validates: Requirements 8.1**

### Property 29: RawData structure completeness

*For any* stored time-based score, the rawData should contain exercises array with completion status and max reps for each exercise.

**Validates: Requirements 8.2**

### Property 30: Breakdown generation

*For any* time-based score calculation, the result should include a breakdown object with allCompleted, completionTime, totalReps, completedExercises, totalExercises, and exercises array.

**Validates: Requirements 8.3**

### Property 31: Time-based ranking algorithm application

*For any* leaderboard calculation with time-based scores, the system should apply the time-based ranking algorithm (completed first, sorted appropriately).

**Validates: Requirements 8.4**

### Property 32: Leaderboard cache structure consistency

*For any* cached time-based leaderboard, the cache entry structure should match the structure used for other scoring types (with appropriate time-based fields).

**Validates: Requirements 8.5**


## Error Handling

### 1. Backend Validation Errors

**Scenario**: Missing completion status for exercises
```javascript
{
  statusCode: 400,
  message: "All exercises must have completion status (true/false)"
}
```

**Scenario**: Missing maxReps for incomplete exercise
```javascript
{
  statusCode: 400,
  message: "Incomplete exercises must have maxReps value"
}
```

**Scenario**: Completion time exceeds time cap
```javascript
{
  statusCode: 400,
  message: "Completion time (12:30) cannot exceed time cap (10:00)"
}
```

**Scenario**: Invalid time format
```javascript
{
  statusCode: 400,
  message: "Invalid time format. Use mm:ss (e.g., 10:00)"
}
```

### 2. Frontend Validation

**Client-Side Validation Rules**:
1. All exercises must have completion status before submission
2. Incomplete exercises must have maxReps value (positive integer)
3. Completion time must match pattern `[0-9]{1,2}:[0-9]{2}`
4. Completion time cannot exceed configured time cap
5. MaxReps cannot exceed target reps for the exercise

**Error Display**:
```jsx
{validationErrors.length > 0 && (
  <div className="validation-errors">
    <h4>⚠️ Please fix the following errors:</h4>
    <ul>
      {validationErrors.map((error, idx) => (
        <li key={idx}>{error}</li>
      ))}
    </ul>
  </div>
)}
```

### 3. EventBridge Error Handling

**Scenario**: ScoreCalculated event emission fails

**Handling**: Log error but don't block score submission. Leaderboard will be eventually consistent.

```javascript
try {
  await emitScoreEvent('ScoreCalculated', scoreData);
} catch (error) {
  console.error('Failed to emit ScoreCalculated event:', error);
  // Continue - score is saved, leaderboard will update on next calculation
}
```

### 4. Calculation Errors

**Scenario**: Missing scoring system configuration

**Handling**:
```javascript
if (!scoringSystem) {
  throw new Error('Scoring system not found');
}

if (scoringSystem.type === 'time-based' && !scoringSystem.config?.timeCap) {
  throw new Error('Time cap configuration missing for time-based scoring system');
}
```


## Testing Strategy

### 1. Unit Tests

#### Backend Unit Tests

**Location**: `lambda/scoring/test/calculator.test.js`

**Test Cases**:
```javascript
describe('calculateTimeBasedScore', () => {
  test('should calculate score for fully completed WOD', () => {
    const rawData = {
      exercises: [
        { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
        { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: true, reps: 100 }
      ],
      completionTime: '08:45',
      timeCap: '10:00'
    };
    
    const result = calculateTimeBasedScore(rawData, {});
    
    expect(result.calculatedScore).toBe('08:45');
    expect(result.breakdown.allCompleted).toBe(true);
    expect(result.breakdown.completedExercises).toBe(2);
  });
  
  test('should calculate score for incomplete WOD', () => {
    const rawData = {
      exercises: [
        { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
        { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
      ],
      completionTime: '10:00',
      timeCap: '10:00'
    };
    
    const result = calculateTimeBasedScore(rawData, {});
    
    expect(result.calculatedScore).toBe(125); // 50 + 75
    expect(result.breakdown.allCompleted).toBe(false);
    expect(result.breakdown.totalReps).toBe(125);
    expect(result.breakdown.completedExercises).toBe(1);
  });
  
  test('should handle zero maxReps for incomplete exercise', () => {
    const rawData = {
      exercises: [
        { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: false, reps: 50, maxReps: 0 }
      ],
      completionTime: '10:00',
      timeCap: '10:00'
    };
    
    const result = calculateTimeBasedScore(rawData, {});
    
    expect(result.breakdown.totalReps).toBe(0);
  });
});
```

**Location**: `lambda/scoring/test/leaderboard-calculator.test.js`

**Test Cases**:
```javascript
describe('rankTimeBasedScores', () => {
  test('should rank completed athletes by time', () => {
    const scores = [
      { athleteId: 'a1', breakdown: { allCompleted: true, completionTime: '09:30' } },
      { athleteId: 'a2', breakdown: { allCompleted: true, completionTime: '08:45' } },
      { athleteId: 'a3', breakdown: { allCompleted: true, completionTime: '10:00' } }
    ];
    
    const ranked = rankTimeBasedScores(scores);
    
    expect(ranked[0].athleteId).toBe('a2'); // fastest
    expect(ranked[1].athleteId).toBe('a1');
    expect(ranked[2].athleteId).toBe('a3');
    expect(ranked[0].rank).toBe(1);
  });
  
  test('should rank incomplete athletes by completed exercises then reps', () => {
    const scores = [
      { 
        athleteId: 'a1', 
        breakdown: { 
          allCompleted: false, 
          completedExercises: 2, 
          totalReps: 150 
        } 
      },
      { 
        athleteId: 'a2', 
        breakdown: { 
          allCompleted: false, 
          completedExercises: 2, 
          totalReps: 175 
        } 
      },
      { 
        athleteId: 'a3', 
        breakdown: { 
          allCompleted: false, 
          completedExercises: 1, 
          totalReps: 200 
        } 
      }
    ];
    
    const ranked = rankTimeBasedScores(scores);
    
    expect(ranked[0].athleteId).toBe('a2'); // same exercises, more reps
    expect(ranked[1].athleteId).toBe('a1');
    expect(ranked[2].athleteId).toBe('a3'); // fewer exercises completed
  });
  
  test('should rank completed athletes before incomplete', () => {
    const scores = [
      { athleteId: 'a1', breakdown: { allCompleted: false, completedExercises: 2, totalReps: 200 } },
      { athleteId: 'a2', breakdown: { allCompleted: true, completionTime: '09:59' } }
    ];
    
    const ranked = rankTimeBasedScores(scores);
    
    expect(ranked[0].athleteId).toBe('a2'); // completed
    expect(ranked[1].athleteId).toBe('a1'); // incomplete
  });
});
```


### 2. Integration Tests

**Location**: `lambda/scoring/test/integration.test.js`

**Test Cases**:
```javascript
describe('Time-Based Score Submission Integration', () => {
  test('should submit and calculate time-based score', async () => {
    // Create time-based scoring system
    const scoringSystem = await createScoringSystem({
      eventId: 'test-event',
      type: 'time-based',
      config: { timeCap: { minutes: 10, seconds: 0 } }
    });
    
    // Submit score
    const scorePayload = {
      eventId: 'test-event',
      athleteId: 'test-athlete',
      wodId: 'test-wod',
      categoryId: 'test-category',
      scoringSystemId: scoringSystem.scoringSystemId,
      rawData: {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 }
        ],
        completionTime: '08:45',
        timeCap: '10:00'
      }
    };
    
    const response = await submitScore(scorePayload);
    
    expect(response.statusCode).toBe(201);
    expect(response.body.score).toBe('08:45');
    expect(response.body.breakdown.allCompleted).toBe(true);
  });
  
  test('should reject score with missing maxReps for incomplete exercise', async () => {
    const scorePayload = {
      eventId: 'test-event',
      athleteId: 'test-athlete',
      wodId: 'test-wod',
      categoryId: 'test-category',
      scoringSystemId: 'time-based-system',
      rawData: {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: false, reps: 50 }
          // Missing maxReps
        ],
        completionTime: '10:00',
        timeCap: '10:00'
      }
    };
    
    const response = await submitScore(scorePayload);
    
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('maxReps');
  });
});
```

### 3. Frontend Component Tests

**Location**: `frontend/src/components/backoffice/__tests__/ScoreEntry.test.jsx`

**Test Cases**:
```javascript
describe('Time-Based Score Entry', () => {
  test('should render exercise completion checkboxes', () => {
    const wod = {
      movements: [
        { exerciseId: 'ex-1', exercise: 'Pull Ups', reps: 50 },
        { exerciseId: 'ex-2', exercise: 'Push Ups', reps: 100 }
      ]
    };
    
    const { getByText, getAllByRole } = render(
      <ScoreEntry selectedWod={wod} scoringSystem={{ type: 'time-based' }} />
    );
    
    expect(getByText('Pull Ups')).toBeInTheDocument();
    expect(getByText('Push Ups')).toBeInTheDocument();
    expect(getAllByRole('checkbox')).toHaveLength(2);
  });
  
  test('should show maxReps input when exercise is incomplete', () => {
    const { getByLabelText, getByText } = render(<ScoreEntry />);
    
    const checkbox = getByLabelText('Completed');
    fireEvent.click(checkbox); // uncheck
    
    expect(getByText('Max Reps Achieved')).toBeInTheDocument();
  });
  
  test('should validate completion time format', () => {
    const { getByPlaceholderText, getByText } = render(<ScoreEntry />);
    
    const timeInput = getByPlaceholderText('10:00');
    fireEvent.change(timeInput, { target: { value: 'invalid' } });
    fireEvent.blur(timeInput);
    
    expect(getByText(/Invalid time format/)).toBeInTheDocument();
  });
});
```

### 4. End-to-End Tests

**Location**: `e2e-tests/tests/time-based-scoring.spec.js`

**Test Scenarios**:
1. Create time-based scoring system for event
2. Assign scoring system to WOD
3. Submit score with all exercises completed
4. Submit score with incomplete exercises
5. View leaderboard with mixed completed/incomplete scores
6. Verify ranking order (completed first, then by reps)


## Design Decisions and Rationales

### 1. Score Representation

**Decision**: Store completion time as string (e.g., "08:45") and total reps as number in the `score` field.

**Rationale**: 
- Maintains consistency with existing score storage patterns
- Allows for easy display without additional parsing
- Leaderboard sorting logic handles both types appropriately
- Breakdown object contains structured data for detailed analysis

### 2. Exercise Completion Tracking

**Decision**: Store completion status as boolean per exercise rather than overall WOD completion.

**Rationale**:
- Provides granular visibility into athlete performance
- Enables partial credit for incomplete WODs
- Supports detailed performance analysis and feedback
- Aligns with functional fitness competition standards

### 3. Ranking Algorithm

**Decision**: Rank completed athletes first (by time), then incomplete athletes (by exercises completed, then total reps).

**Rationale**:
- Completing all exercises within time cap is the primary goal
- Among completed athletes, faster time indicates better performance
- Among incomplete athletes, more exercises completed indicates better performance
- Total reps serves as tiebreaker for same number of completed exercises
- This approach is standard in CrossFit and functional fitness competitions

### 4. Time Cap Configuration at WOD Level

**Decision**: Configure time cap per WOD rather than globally in the scoring system.

**Rationale**:
- Different WODs within the same event often require different time limits
- Allows flexibility for organizers to set appropriate time caps based on WOD difficulty
- Maintains consistency with how other WOD-specific attributes are configured
- Simplifies scoring system creation (no configuration needed for time-based type)
- Aligns with functional fitness competition standards where each WOD has its own time cap

### 5. Time Cap Enforcement

**Decision**: Validate completion time against WOD time cap on submission, but allow judges to enter time cap as completion time.

**Rationale**:
- Prevents data entry errors (time exceeding cap)
- Allows automatic population of time cap for incomplete WODs
- Maintains data integrity while supporting judge workflow
- Time cap serves as default for incomplete attempts
- WOD time cap is fetched from WOD record during validation

### 6. MaxReps Requirement

**Decision**: Require maxReps value for all incomplete exercises.

**Rationale**:
- Ensures complete performance data capture
- Enables accurate ranking among incomplete athletes
- Prevents ambiguous or missing data scenarios
- Supports detailed performance analysis

### 7. Integration with Existing Infrastructure

**Decision**: Extend existing calculator.js and leaderboard-calculator.js rather than creating separate services.

**Rationale**:
- Maintains consistency with existing scoring architecture
- Reuses proven calculation and event emission patterns
- Minimizes infrastructure changes and deployment complexity
- Keeps all scoring logic centralized for maintainability

### 8. Frontend Component Strategy

**Decision**: Enhance existing ScoreEntry.jsx with conditional rendering for time-based mode rather than creating separate component.

**Rationale**:
- Reduces code duplication
- Maintains consistent UX across scoring modes
- Simplifies navigation and component management
- Allows for shared validation and submission logic

### 9. EventBridge Integration

**Decision**: Use existing ScoreCalculated event with enhanced detail structure.

**Rationale**:
- Maintains consistency with existing event-driven architecture
- Reuses existing leaderboard update triggers
- Avoids creating new event types and handlers
- Supports eventual consistency model for leaderboards


## Security Considerations

### 1. Authorization

**Score Submission**:
- Athletes can only submit scores for themselves
- Organization members (owner/admin/member) can submit scores for any athlete in their events
- Super admin can submit scores for any athlete in any event
- Existing `checkScoreAccess()` function handles authorization

**Scoring System Management**:
- Only organization members can create/modify scoring systems for their events
- Super admin has full access to all scoring systems
- Existing organization membership checks apply

### 2. Data Validation

**Input Sanitization**:
- Validate all numeric inputs (maxReps, time values)
- Sanitize exercise names and IDs to prevent injection
- Validate time format using regex pattern
- Enforce positive integer constraints on reps

**Business Logic Validation**:
- Verify completion time doesn't exceed time cap
- Ensure maxReps doesn't exceed target reps
- Validate all exercises have completion status
- Verify scoring system exists and matches type

### 3. Data Integrity

**Immutability**:
- Score records include `createdAt` and `updatedAt` timestamps
- Original rawData is preserved for audit trail
- Breakdown is recalculated on each update to ensure consistency

**Consistency**:
- EventBridge events ensure leaderboard eventual consistency
- Failed event emissions are logged but don't block score submission
- Leaderboard cache has TTL for automatic refresh

## Performance Considerations

### 1. Database Access Patterns

**Optimized Queries**:
- Scores queried by eventId (partition key) for leaderboard calculation
- GSI on athleteId for athlete score history
- Leaderboard cache reduces repeated calculations

**Batch Operations**:
- Leaderboard calculation processes all scores for event in single query
- Ranking algorithm operates in-memory for performance

### 2. Calculation Efficiency

**Time Complexity**:
- Score calculation: O(n) where n = number of exercises
- Ranking algorithm: O(n log n) where n = number of scores (sorting)
- Acceptable for typical event sizes (100-1000 athletes)

**Caching Strategy**:
- Leaderboard results cached in LeaderboardCacheTable
- Cache invalidated on new score submission via EventBridge
- TTL ensures stale data is eventually removed

### 3. Frontend Performance

**Lazy Loading**:
- Exercise completion status initialized only when WOD selected
- Score details loaded on-demand when expanded
- Leaderboard paginated for large events

**Optimistic Updates**:
- Score submission shows immediate feedback
- Leaderboard refresh triggered after successful submission
- Error states handled gracefully with retry options


## Deployment Strategy

### 0. Bounded Context Deployment Order

**DDD Principle**: Deploy bounded contexts independently, respecting dependencies.

**Deployment Order**:
1. **WOD Context** (no dependencies on Scoring for this feature)
2. **Scoring Context** (depends on WOD for read-only access)

**Rationale**: 
- WOD context must be deployed first to ensure timeCap field is available
- Scoring context can then read from WodsTable
- Each context can be deployed independently after initial setup
- Rollback can happen per context without affecting others

### 1. Infrastructure Changes (Per Bounded Context)

**No New Resources Required**:
- Existing DynamoDB tables support new data structures
- Existing Lambda functions enhanced with new logic
- Existing API Gateway routes handle new scoring type
- Existing EventBridge bus used for events

**CDK Stack Changes**:

**WOD Stack** (`infrastructure/wods/wods-stack.ts`):
- No infrastructure changes needed
- Lambda code updated with validation logic
- IAM policy already includes read access to ScoringSystemsTable

**Scoring Stack** (`infrastructure/scoring/scoring-stack.ts`):
- No infrastructure changes needed
- Lambda code updated with time-based logic
- IAM policy already includes read access to WodsTable

**Deployment Steps** (Bounded Context Order):
```bash
# Step 1: Deploy WOD Context
cd lambda/wods
npm test  # Run unit tests
cd ../..
cdk deploy Athleon/Wods --profile labvel-dev

# Step 2: Deploy Scoring Context
cd lambda/scoring
npm test  # Run unit tests
cd ../..
cdk deploy Athleon/Scoring --profile labvel-dev

# Step 3: Deploy Frontend (Presentation Layer)
cd frontend
npm test  # Run component tests
npm run build
npm run deploy:s3
npm run invalidate:cloudfront

# Step 4: Verify deployment
cd e2e-tests
npm run test:e2e  # Run end-to-end tests
```

**Bounded Context Independence**:
- Each context can be deployed separately
- WOD context deployment doesn't affect Scoring context (and vice versa)
- Frontend deployment is independent of backend contexts
- Rollback can happen per context

### 2. Database Migration

**No Migration Required**:
- New fields added to existing rawData and breakdown objects
- Existing scores remain valid and functional
- New scoring type coexists with classic and advanced types
- Backward compatibility maintained

### 3. Feature Rollout

**Phased Approach**:

**Phase 1 - Backend (Week 1)**:
- Deploy calculator enhancements
- Deploy score submission validation
- Deploy leaderboard ranking logic
- Test with API calls

**Phase 2 - Frontend (Week 2)**:
- Deploy scoring system creation UI
- Deploy score entry enhancements
- Deploy score display components
- Test with real users

**Phase 3 - Validation (Week 3)**:
- Monitor error rates and performance
- Gather user feedback
- Fix any issues discovered
- Optimize based on usage patterns

### 4. Rollback Plan

**If Issues Arise**:
1. Frontend rollback: Revert CloudFront to previous version
2. Backend rollback: Redeploy previous Lambda versions
3. Data integrity: Existing scores unaffected by rollback
4. Feature flag: Add config to disable time-based scoring if needed

### 5. Monitoring

**Key Metrics**:
- Score submission success rate by scoring type
- Calculation errors and validation failures
- Leaderboard cache hit rate
- API response times for time-based scores
- EventBridge event delivery success rate

**Alerts**:
- High error rate on score submission (>5%)
- Calculation failures (any occurrence)
- Leaderboard cache misses (>20%)
- API latency exceeding 2 seconds


## DDD Benefits and Trade-offs

### Benefits of Bounded Context Approach

**1. Independent Evolution**
- WOD context can change timeCap structure without affecting Scoring context (as long as the ACL adapts)
- Scoring context can add new scoring types without affecting WOD context
- Each context can be refactored independently

**2. Clear Ownership**
- WOD team owns WOD aggregate and timeCap attribute
- Scoring team owns Score aggregate and calculation logic
- No confusion about who can modify what

**3. Scalability**
- Each context can scale independently based on load
- WOD Lambda and Scoring Lambda have separate concurrency limits
- Tables can be scaled independently

**4. Testability**
- Each context can be tested in isolation
- Mock the ACL for cross-context dependencies
- Unit tests don't need to set up multiple contexts

**5. Deployment Independence**
- Deploy WOD context without redeploying Scoring context
- Rollback one context without affecting others
- Reduce deployment risk and blast radius

### Trade-offs and Considerations

**1. Cross-Context Reads**
- **Trade-off**: Scoring Lambda must read from WodsTable (cross-context)
- **Mitigation**: Use Anti-Corruption Layer to isolate dependency
- **Alternative Considered**: Duplicate timeCap in ScoresTable (rejected due to data duplication and sync complexity)

**2. Eventual Consistency**
- **Trade-off**: Leaderboards are eventually consistent via EventBridge
- **Mitigation**: Acceptable for this use case (leaderboards don't need real-time consistency)
- **Alternative Considered**: Synchronous leaderboard calculation (rejected due to performance impact)

**3. Validation Complexity**
- **Trade-off**: WOD context must validate scoring system type (cross-context read)
- **Mitigation**: Use Anti-Corruption Layer and cache scoring system types
- **Alternative Considered**: Allow any scoring system (rejected due to data integrity concerns)

**4. Code Duplication**
- **Trade-off**: Time parsing utilities might be duplicated across contexts
- **Mitigation**: Use Lambda Layer for shared utilities (not domain logic)
- **Alternative Considered**: Shared domain logic (rejected due to coupling)

### When to Violate DDD Principles

**Never Violate**:
- ❌ Cross-context writes (always forbidden)
- ❌ Shared aggregates (always forbidden)
- ❌ Direct coupling between contexts (always use ACL)

**Consider Violating** (with justification):
- ⚠️ Cross-context reads (acceptable for reference data like timeCap)
- ⚠️ Shared value objects (acceptable for truly shared concepts like TimeRange)
- ⚠️ Synchronous cross-context calls (acceptable for critical validations)

**This Feature's Approach**:
- ✅ Cross-context reads via ACL (justified: timeCap is reference data)
- ✅ No shared aggregates (WOD and Score are separate)
- ✅ No cross-context writes (each context owns its data)


## Future Enhancements

### 1. Advanced Time-Based Features

**Tiebreaker Rules**:
- Add configurable tiebreaker logic (e.g., earliest submission time)
- Support for judge-assigned tiebreaker scores
- Automatic tiebreaker calculation based on exercise order

**Partial Time Tracking**:
- Track time at which each exercise was completed
- Display exercise-level time splits
- Enable pace analysis and performance insights

**Video Verification**:
- Link video evidence to exercise completion status
- Support judge review workflow for disputed scores
- Integrate with existing media upload infrastructure

### 2. Analytics and Reporting

**Performance Insights**:
- Athlete performance trends across time-based WODs
- Exercise-level completion rate analysis
- Time distribution analysis for completed athletes
- Comparison of time-based vs other scoring modes

**Event Organizer Tools**:
- Bulk score import from CSV for time-based WODs
- Score validation reports (outliers, anomalies)
- Real-time leaderboard updates during live events
- Export leaderboard data with detailed breakdowns

### 3. Mobile Optimization

**Judge Mobile App**:
- Simplified score entry interface for mobile devices
- Offline score entry with sync when online
- Barcode/QR code scanning for athlete identification
- Voice input for hands-free score entry

**Athlete Mobile Experience**:
- Push notifications for score updates
- Mobile-optimized score detail views
- Share score cards on social media
- Compare performance with other athletes

### 4. Integration Enhancements

**Third-Party Platforms**:
- Export scores to CrossFit Games format
- Integration with Wodify, SugarWOD, etc.
- API endpoints for external leaderboard displays
- Webhook support for real-time score updates

**Advanced Scheduling**:
- Automatic time cap adjustment based on category
- Dynamic time cap based on athlete performance
- Integration with tournament bracket progression
- Heat-based time cap variations

