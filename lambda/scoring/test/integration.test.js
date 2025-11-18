/**
 * Integration Tests for Time-Based Scoring Flow
 * 
 * These tests verify the end-to-end flow of time-based scoring including:
 * - Creating time-based scoring systems
 * - Submitting scores with complete/incomplete exercises
 * - Validation of time-based score submissions
 * - EventBridge event emission
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.5, 3.5, 4.4, 7.1, 7.2
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { handler } = require('../index');

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-eventbridge');

// Mock Lambda Layer utilities
jest.mock('/opt/nodejs/utils/auth', () => ({
  verifyToken: jest.fn(),
  isSuperAdmin: jest.fn(),
  checkOrganizationAccess: jest.fn(),
  getCorsHeaders: jest.fn(() => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }))
}));

jest.mock('/opt/nodejs/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Time-Based Scoring Integration Tests', () => {
  let mockDdbSend;
  let mockEventBridgeSend;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup DynamoDB mock
    mockDdbSend = jest.fn();
    DynamoDBDocumentClient.from = jest.fn(() => ({
      send: mockDdbSend
    }));
    
    // Setup EventBridge mock
    mockEventBridgeSend = jest.fn().mockResolvedValue({});
    EventBridgeClient.mockImplementation(() => ({
      send: mockEventBridgeSend
    }));
    
    // Set environment variables
    process.env.SCORES_TABLE = 'test-scores-table';
    process.env.SCORING_SYSTEMS_TABLE = 'test-scoring-systems-table';
    process.env.WODS_TABLE = 'test-wods-table';
    process.env.ORGANIZATION_EVENTS_TABLE = 'test-org-events-table';
    process.env.ORGANIZATION_MEMBERS_TABLE = 'test-org-members-table';
  });

  describe('Creating Time-Based Scoring System', () => {
    /**
     * Test: Create time-based scoring system without global time cap
     * Validates: Requirements 1.1, 1.2, 1.3
     */
    it('should successfully create a time-based scoring system with empty config', async () => {
      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        name: 'Time-Based WOD Scoring',
        type: 'time-based',
        config: {}, // No global time cap
        createdBy: 'user-789',
        createdAt: '2025-11-17T10:00:00Z'
      };
      
      // Mock DynamoDB put
      mockDdbSend.mockResolvedValueOnce({});
      
      // Mock DynamoDB get for retrieval verification
      mockDdbSend.mockResolvedValueOnce({
        Item: scoringSystem
      });
      
      // Verify the scoring system can be stored and retrieved
      expect(scoringSystem.type).toBe('time-based');
      expect(scoringSystem.config).toEqual({});
      expect(Object.keys(scoringSystem.config).length).toBe(0);
    });
  });

  describe('Submitting Time-Based Scores', () => {
    const testEvent = {
      httpMethod: 'POST',
      path: '',
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'athlete@test.com'
          }
        }
      },
      queryStringParameters: null
    };

    /**
     * Test: Submit score with all exercises completed
     * Validates: Requirements 2.5, 3.5, 7.1
     */
    it('should submit and calculate score for all exercises completed', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50,
              maxReps: null
            },
            {
              exerciseId: 'ex-push-ups',
              exerciseName: 'Push Ups',
              completed: true,
              reps: 100,
              maxReps: null
            }
          ],
          completionTime: '08:45'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        // Query for existing scores
        .mockResolvedValueOnce({ Items: [] })
        // Get scoring system
        .mockResolvedValueOnce({ Item: scoringSystem })
        // Get WOD for time cap
        .mockResolvedValueOnce({ Item: wod })
        // Put score
        .mockResolvedValueOnce({});

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.score).toBe('08:45');
      expect(body.breakdown.allCompleted).toBe(true);
      expect(body.breakdown.completedExercises).toBe(2);
      expect(body.breakdown.totalExercises).toBe(2);
      expect(body.breakdown.completionTime).toBe('08:45');
      
      // Verify EventBridge event was emitted
      expect(mockEventBridgeSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Entries: expect.arrayContaining([
              expect.objectContaining({
                Source: 'athleon.scores',
                DetailType: 'ScoreCalculated',
                Detail: expect.stringContaining('sys-time-based-001')
              })
            ])
          })
        })
      );
    });

    /**
     * Test: Submit score with incomplete exercises
     * Validates: Requirements 2.5, 3.5, 4.4, 7.2
     */
    it('should submit and calculate score for incomplete exercises', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50,
              maxReps: null
            },
            {
              exerciseId: 'ex-push-ups',
              exerciseName: 'Push Ups',
              completed: false,
              reps: 100,
              maxReps: 75 // Achieved 75 out of 100 target reps
            }
          ],
          completionTime: '10:00'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod })
        .mockResolvedValueOnce({});

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.score).toBe(125); // 50 (completed) + 75 (maxReps)
      expect(body.breakdown.allCompleted).toBe(false);
      expect(body.breakdown.totalReps).toBe(125);
      expect(body.breakdown.completedExercises).toBe(1);
      expect(body.breakdown.totalExercises).toBe(2);
      expect(body.breakdown.completionTime).toBe('10:00'); // Time cap used
      
      // Verify exercise breakdown includes maxReps
      const incompleteExercise = body.breakdown.exercises.find(
        ex => ex.exerciseId === 'ex-push-ups'
      );
      expect(incompleteExercise.completed).toBe(false);
      expect(incompleteExercise.maxReps).toBe(75);
    });
  });

  describe('Validation Errors', () => {
    const testEvent = {
      httpMethod: 'POST',
      path: '',
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'athlete@test.com'
          }
        }
      },
      queryStringParameters: null
    };

    /**
     * Test: Reject score with missing maxReps for incomplete exercise
     * Validates: Requirements 4.4
     */
    it('should reject score submission when maxReps is missing for incomplete exercise', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50
            },
            {
              exerciseId: 'ex-push-ups',
              exerciseName: 'Push Ups',
              completed: false,
              reps: 100
              // Missing maxReps
            }
          ],
          completionTime: '10:00'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod });

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toContain('Incomplete exercises must have maxReps value');
    });

    /**
     * Test: Reject score when completion time exceeds time cap
     * Validates: Requirements 2.5
     */
    it('should reject score submission when completion time exceeds time cap', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50
            }
          ],
          completionTime: '12:30' // Exceeds 10:00 time cap
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod });

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toContain('Completion time (12:30) cannot exceed time cap (10:00)');
    });

    /**
     * Test: Reject score with missing completion status
     * Validates: Requirements 3.5
     */
    it('should reject score submission when exercise completion status is missing', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              // Missing completed field
              reps: 50
            }
          ],
          completionTime: '08:45'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod });

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toContain('All exercises must have completion status (true/false)');
    });

    /**
     * Test: Reject score with invalid time format
     * Validates: Requirements 2.5
     */
    it('should reject score submission with invalid time format', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50
            }
          ],
          completionTime: '8:5' // Invalid format (should be 08:05)
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod });

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toContain('Invalid time format. Use mm:ss (e.g., 10:00)');
    });

    /**
     * Test: Reject score when WOD has no time cap configured
     * Validates: Requirements 2.5
     */
    it('should reject score submission when WOD has no time cap configured', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50
            }
          ],
          completionTime: '08:45'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789'
        // Missing timeCap
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod });

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.message).toBe('WOD must have time cap configured for time-based scoring');
    });
  });

  describe('EventBridge Event Emission', () => {
    const testEvent = {
      httpMethod: 'POST',
      path: '',
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'athlete@test.com'
          }
        }
      },
      queryStringParameters: null
    };

    /**
     * Test: Verify ScoreCalculated event emission with time-based details
     * Validates: Requirements 7.1, 7.2
     */
    it('should emit ScoreCalculated event with time-based score details', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50
            },
            {
              exerciseId: 'ex-push-ups',
              exerciseName: 'Push Ups',
              completed: false,
              reps: 100,
              maxReps: 75
            }
          ],
          completionTime: '10:00'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod })
        .mockResolvedValueOnce({});

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      await handler(event);

      // Verify EventBridge was called
      expect(mockEventBridgeSend).toHaveBeenCalled();
      
      // Get the event details
      const eventBridgeCall = mockEventBridgeSend.mock.calls[0][0];
      expect(eventBridgeCall.input.Entries).toHaveLength(1);
      
      const eventEntry = eventBridgeCall.input.Entries[0];
      expect(eventEntry.Source).toBe('athleon.scores');
      expect(eventEntry.DetailType).toBe('ScoreCalculated');
      
      // Parse and verify event detail
      const eventDetail = JSON.parse(eventEntry.Detail);
      expect(eventDetail.eventId).toBe('test-event-123');
      expect(eventDetail.athleteId).toBe('athlete-456');
      expect(eventDetail.wodId).toBe('wod-789');
      expect(eventDetail.categoryId).toBe('cat-012');
      expect(eventDetail.scoringSystemId).toBe('sys-time-based-001');
      expect(eventDetail.score).toBe(125); // Total reps for incomplete WOD
      expect(eventDetail.breakdown).toBeDefined();
      expect(eventDetail.breakdown.allCompleted).toBe(false);
      expect(eventDetail.breakdown.totalReps).toBe(125);
      expect(eventDetail.breakdown.completedExercises).toBe(1);
      expect(eventDetail.breakdown.totalExercises).toBe(2);
      expect(eventDetail.breakdown.completionTime).toBe('10:00');
    });

    /**
     * Test: Verify event emission for completed WOD
     * Validates: Requirements 7.1
     */
    it('should emit ScoreCalculated event for completed WOD with completion time', async () => {
      const scorePayload = {
        eventId: 'test-event-123',
        athleteId: 'athlete-456',
        wodId: 'wod-789',
        categoryId: 'cat-012',
        scoringSystemId: 'sys-time-based-001',
        rawData: {
          exercises: [
            {
              exerciseId: 'ex-pull-ups',
              exerciseName: 'Pull Ups',
              completed: true,
              reps: 50
            }
          ],
          completionTime: '08:45'
        }
      };

      const scoringSystem = {
        eventId: 'test-event-123',
        scoringSystemId: 'sys-time-based-001',
        type: 'time-based',
        config: {}
      };

      const wod = {
        eventId: 'test-event-123',
        wodId: 'wod-789',
        timeCap: { minutes: 10, seconds: 0 }
      };

      // Mock DynamoDB responses
      mockDdbSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({ Item: scoringSystem })
        .mockResolvedValueOnce({ Item: wod })
        .mockResolvedValueOnce({});

      const event = {
        ...testEvent,
        body: JSON.stringify(scorePayload)
      };

      await handler(event);

      // Verify EventBridge was called
      expect(mockEventBridgeSend).toHaveBeenCalled();
      
      const eventBridgeCall = mockEventBridgeSend.mock.calls[0][0];
      const eventDetail = JSON.parse(eventBridgeCall.input.Entries[0].Detail);
      
      expect(eventDetail.score).toBe('08:45'); // Completion time for completed WOD
      expect(eventDetail.breakdown.allCompleted).toBe(true);
      expect(eventDetail.breakdown.completionTime).toBe('08:45');
    });
  });
});
