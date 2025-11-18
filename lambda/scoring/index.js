const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { calculateScore } = require('./calculator');
const { parseTimeToSeconds, isValidTimeFormat, exceedsTimeCap } = require('./utils');

// Import from Lambda Layer
const { verifyToken, isSuperAdmin, checkOrganizationAccess, getCorsHeaders } = require('/opt/nodejs/utils/auth');
const logger = require('/opt/nodejs/utils/logger');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const eventBridge = new EventBridgeClient({});

const SCORES_TABLE = process.env.SCORES_TABLE;
const SCORING_SYSTEMS_TABLE = process.env.SCORING_SYSTEMS_TABLE;
const WODS_TABLE = process.env.WODS_TABLE;
const ORGANIZATION_EVENTS_TABLE = process.env.ORGANIZATION_EVENTS_TABLE;
const ORGANIZATION_MEMBERS_TABLE = process.env.ORGANIZATION_MEMBERS_TABLE;

// Authorization helper
async function checkScoreAccess(userId, userEmail, action, eventId = null, scoreOwnerId = null) {
  // Super admin bypass
  if (userEmail === 'admin@athleon.fitness') {
    return { authorized: true, role: 'super_admin' };
  }

  // Athletes can only create/read their own scores
  if (action === 'create' || (action === 'read' && scoreOwnerId === userId)) {
    return { authorized: true, role: 'athlete' };
  }

  // For organization members (read/update/delete scores)
  if (eventId) {
    try {
      // Get event's organization
      const { Items } = await ddb.send(new QueryCommand({
        TableName: ORGANIZATION_EVENTS_TABLE,
        IndexName: 'event-organization-index',
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: { ':eventId': eventId }
      }));

      if (Items && Items.length > 0) {
        const organizationId = Items[0].organizationId;
        
        // Check organization membership
        const { Item } = await ddb.send(new GetCommand({
          TableName: ORGANIZATION_MEMBERS_TABLE,
          Key: { organizationId, userId }
        }));

        if (Item) {
          return { authorized: true, role: Item.role };
        }
      }
    } catch (error) {
      console.error('Error checking organization access:', error);
    }
  }

  return { authorized: false };
}

async function emitScoreEvent(eventType, scoreData) {
  try {
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'athleon.scores',
        DetailType: eventType,
        Detail: JSON.stringify(scoreData),
        EventBusName: 'default'
      }]
    }));
    console.log(`Emitted ${eventType} event:`, scoreData.scoreId);
  } catch (error) {
    console.error('Error emitting event:', error);
  }
}

// Validate time-based score submission
function validateTimeBasedScore(rawData, scoringSystem, wodTimeCap) {
  const { exercises, completionTime } = rawData;
  const errors = [];

  // Validate all exercises have completion status (boolean)
  if (!exercises || !Array.isArray(exercises)) {
    errors.push('Exercises array is required for time-based scoring');
    return { valid: false, errors };
  }

  // Check that all exercises have a boolean completed field
  const missingCompletionStatus = exercises.some(ex => typeof ex.completed !== 'boolean');
  if (missingCompletionStatus) {
    errors.push('All exercises must have completion status (true/false)');
  }

  // Validate incomplete exercises have maxReps value
  const incompleteExercises = exercises.filter(ex => !ex.completed);
  const missingMaxReps = incompleteExercises.some(ex => 
    ex.maxReps === undefined || ex.maxReps === null || ex.maxReps === ''
  );
  if (missingMaxReps) {
    errors.push('Incomplete exercises must have maxReps value');
  }

  // Validate time format for completionTime
  if (completionTime && !isValidTimeFormat(completionTime)) {
    errors.push('Invalid time format. Use mm:ss (e.g., 10:00)');
  }

  // Validate completion time doesn't exceed WOD time cap
  if (completionTime && wodTimeCap && exceedsTimeCap(completionTime, wodTimeCap)) {
    errors.push(`Completion time (${completionTime}) cannot exceed time cap (${wodTimeCap})`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

exports.handler = async (event) => {
  console.log('Scores Service:', JSON.stringify(event, null, 2));
  
  let path = event.path || '';
  if (event.pathParameters?.proxy) {
    path = '/' + event.pathParameters.proxy;
  }
  
  // Clean path - remove /scores prefix if present
  if (path.startsWith('/scores')) {
    path = path.substring('/scores'.length);
  }
  
  const method = event.httpMethod;
  const headers = getCorsHeaders(event);
  
  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Handle public scores endpoint - /public/scores?eventId={eventId}
    if (path.startsWith('/public/scores') && method === 'GET') {
      const eventId = event.queryStringParameters?.eventId;
      
      if (!eventId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'eventId query parameter is required' })
        };
      }
      
      const { Items } = await ddb.send(new QueryCommand({
        TableName: SCORES_TABLE,
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: {
          ':eventId': eventId
        }
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(Items || [])
      };
    }

    // GET /scores/leaderboard/{eventId} - Domain-specific leaderboard endpoint
    if ((path.startsWith('/leaderboard/') || path.startsWith('/scores/leaderboard/')) && method === 'GET') {
      const pathParts = path.split('/').filter(p => p);
      const eventId = pathParts[pathParts.length - 1];
      
      if (!eventId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'eventId is required' })
        };
      }
      
      const leaderboard = await calculateEventLeaderboard(eventId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ leaderboard })
      };
    }

    // Submit score directly to /scores
    if (path === '' && method === 'POST') {
      const body = JSON.parse(event.body);

      // Extract user info
      const userId = event.requestContext?.authorizer?.claims?.sub;
      const userEmail = event.requestContext?.authorizer?.claims?.email;

      if (!userId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Authentication required' })
        };
      }

      // Check authorization for score submission
      const authCheck = await checkScoreAccess(userId, userEmail, 'create', body.eventId);
      if (!authCheck.authorized) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Access denied - insufficient permissions to submit scores' })
        };
      }
      
      // Check if score already exists for this athlete+WOD+category
      const { Items: existingScores } = await ddb.send(new QueryCommand({
        TableName: SCORES_TABLE,
        KeyConditionExpression: 'eventId = :eventId',
        FilterExpression: 'athleteId = :athleteId AND wodId = :wodId AND categoryId = :categoryId',
        ExpressionAttributeValues: {
          ':eventId': body.eventId,
          ':athleteId': body.athleteId,
          ':wodId': body.wodId,
          ':categoryId': body.categoryId
        }
      }));
      
      const existingScore = existingScores?.[0];
      const scoreId = existingScore?.scoreId || `score-${Date.now()}`;
      
      let calculatedScore = body.score;
      let breakdown = null;
      
      // If scoringSystemId provided, calculate score
      if (body.scoringSystemId && body.rawData) {
        const { Item: scoringSystem } = await ddb.send(new GetCommand({
          TableName: SCORING_SYSTEMS_TABLE,
          Key: { eventId: body.eventId, scoringSystemId: body.scoringSystemId }
        }));
        
        if (scoringSystem) {
          let wodTimeCap = null;
          
          // For time-based scoring, fetch WOD to get time cap
          if (scoringSystem.type === 'time-based' && body.wodId) {
            try {
              const { Item: wod } = await ddb.send(new GetCommand({
                TableName: WODS_TABLE,
                Key: { eventId: body.eventId, wodId: body.wodId }
              }));
              
              if (wod && wod.timeCap) {
                // Convert time cap to mm:ss format for validation
                wodTimeCap = `${wod.timeCap.minutes}:${String(wod.timeCap.seconds).padStart(2, '0')}`;
              } else {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({
                    message: 'WOD must have time cap configured for time-based scoring'
                  })
                };
              }
            } catch (error) {
              logger.error('Error fetching WOD for time cap:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                  message: 'Error fetching WOD configuration'
                })
              };
            }
          }
          
          // Validate time-based score submission
          if (scoringSystem.type === 'time-based') {
            const validation = validateTimeBasedScore(body.rawData, scoringSystem, wodTimeCap);
            if (!validation.valid) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                  message: 'Validation failed',
                  errors: validation.errors
                })
              };
            }
          }
          
          const result = calculateScore(body.rawData, scoringSystem, wodTimeCap);
          calculatedScore = result.calculatedScore;
          breakdown = result.breakdown;
        }
      }
      
      const item = {
        eventId: body.eventId,
        scoreId,
        dayId: body.dayId,
        wodId: body.wodId,
        athleteId: body.athleteId,
        categoryId: body.categoryId,
        score: Number(calculatedScore) || calculatedScore,
        rank: body.rank || 0,
        sessionId: body.sessionId,
        scheduleId: body.scheduleId,
        scoreType: body.scoreType,
        matchId: body.matchId,
        scoringSystemId: body.scoringSystemId,
        rawData: body.rawData,
        breakdown,
        createdAt: existingScore?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await ddb.send(new PutCommand({
        TableName: SCORES_TABLE,
        Item: item
      }));
      
      // Emit ScoreCalculated event
      await emitScoreEvent('ScoreCalculated', {
        scoreId: item.scoreId,
        eventId: item.eventId,
        athleteId: item.athleteId,
        wodId: item.wodId,
        categoryId: item.categoryId,
        score: item.score,
        scoringSystemId: item.scoringSystemId,
        breakdown: item.breakdown,
        timestamp: item.updatedAt
      });
      
      return {
        statusCode: existingScore ? 200 : 201,
        headers,
        body: JSON.stringify({
          ...item,
          updated: !!existingScore
        })
      };
    }

    // Get scores by eventId query parameter - /scores?eventId={eventId}
    if (path === '' && method === 'GET') {
      console.log('GET scores request - path:', path, 'method:', method);
      const eventId = event.queryStringParameters?.eventId;
      console.log('EventId from query:', eventId);
      
      if (!eventId) {
        console.log('Missing eventId parameter');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'eventId query parameter is required' })
        };
      }
      
      console.log('Querying scores table:', SCORES_TABLE, 'for eventId:', eventId);
      
      try {
        const { Items } = await ddb.send(new QueryCommand({
          TableName: SCORES_TABLE,
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: {
            ':eventId': eventId
          }
        }));
        
        console.log('Scores query result:', Items?.length || 0, 'items');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(Items || [])
        };
      } catch (dbError) {
        console.error('Database error in scores GET:', dbError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Database error', error: dbError.message })
        };
      }
    }
    
    // Get scores for a specific event - /competitions/{eventId}/scores (legacy)
    if (path.match(/^\/competitions\/[^/]+\/scores$/) && method === 'GET') {
      const eventId = path.split('/')[2];
      
      const { Items } = await ddb.send(new QueryCommand({
        TableName: SCORES_TABLE,
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: {
          ':eventId': eventId
        }
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(Items || [])
      };
    }
    
    // Get scores for a specific day
    if (path.match(/^\/competitions\/[^/]+\/days\/[^/]+\/scores$/) && method === 'GET') {
      const [, , eventId, , dayId] = path.split('/');
      
      const { Items } = await ddb.send(new QueryCommand({
        TableName: SCORES_TABLE,
        IndexName: 'dayId-score-index',
        KeyConditionExpression: 'dayId = :dayId',
        ExpressionAttributeValues: {
          ':dayId': dayId
        }
      }));
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(event),
        body: JSON.stringify(Items || [])
      };
    }
    
    // Submit score
    if (path.match(/^\/competitions\/[^/]+\/scores$/) && method === 'POST') {
      const eventId = path.split('/')[2];
      const body = JSON.parse(event.body);
      const scoreId = `score-${Date.now()}`;
      
      let calculatedScore = body.score;
      let breakdown = null;
      
      // If scoringSystemId provided, calculate score
      if (body.scoringSystemId && body.rawData) {
        const { Item: scoringSystem } = await ddb.send(new GetCommand({
          TableName: SCORING_SYSTEMS_TABLE,
          Key: { eventId, scoringSystemId: body.scoringSystemId }
        }));
        
        if (scoringSystem) {
          let wodTimeCap = null;
          
          // For time-based scoring, fetch WOD to get time cap
          if (scoringSystem.type === 'time-based' && body.wodId) {
            try {
              const { Item: wod } = await ddb.send(new GetCommand({
                TableName: WODS_TABLE,
                Key: { eventId, wodId: body.wodId }
              }));
              
              if (wod && wod.timeCap) {
                // Convert time cap to mm:ss format for validation
                wodTimeCap = `${wod.timeCap.minutes}:${String(wod.timeCap.seconds).padStart(2, '0')}`;
              } else {
                return {
                  statusCode: 400,
                  headers: getCorsHeaders(event),
                  body: JSON.stringify({
                    message: 'WOD must have time cap configured for time-based scoring'
                  })
                };
              }
            } catch (error) {
              console.error('Error fetching WOD for time cap:', error);
              return {
                statusCode: 500,
                headers: getCorsHeaders(event),
                body: JSON.stringify({
                  message: 'Error fetching WOD configuration'
                })
              };
            }
          }
          
          // Validate time-based score submission
          if (scoringSystem.type === 'time-based') {
            const validation = validateTimeBasedScore(body.rawData, scoringSystem, wodTimeCap);
            if (!validation.valid) {
              return {
                statusCode: 400,
                headers: getCorsHeaders(event),
                body: JSON.stringify({ 
                  message: 'Validation failed',
                  errors: validation.errors
                })
              };
            }
          }
          
          const result = calculateScore(body.rawData, scoringSystem, wodTimeCap);
          calculatedScore = result.calculatedScore;
          breakdown = result.breakdown;
        }
      }
      
      const item = {
        eventId,
        scoreId,
        dayId: body.dayId,
        wodId: body.wodId,
        athleteId: body.athleteId,
        categoryId: body.categoryId,
        score: Number(calculatedScore) || calculatedScore,
        rank: body.rank || 0,
        scoreType: body.scoreType,
        matchId: body.matchId,
        scoringSystemId: body.scoringSystemId,
        rawData: body.rawData,
        breakdown,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await ddb.send(new PutCommand({
        TableName: SCORES_TABLE,
        Item: item
      }));
      
      // Emit ScoreCalculated event
      await emitScoreEvent('ScoreCalculated', {
        scoreId: item.scoreId,
        eventId: item.eventId,
        athleteId: item.athleteId,
        wodId: item.wodId,
        categoryId: item.categoryId,
        score: item.score,
        scoringSystemId: item.scoringSystemId,
        breakdown: item.breakdown,
        timestamp: item.createdAt
      });
      
      return {
        statusCode: 201,
        headers: getCorsHeaders(event),
        body: JSON.stringify(item)
      };
    }
    
    // Update score
    if (path.match(/^\/scores\/[^/]+$/) && method === 'PUT') {
      const scoreId = path.split('/')[2];
      const body = JSON.parse(event.body);
      
      // Get existing score to get eventId
      const { Item: existingScore } = await ddb.send(new GetCommand({
        TableName: SCORES_TABLE,
        Key: { eventId: body.eventId, scoreId }
      }));
      
      if (!existingScore) {
        return {
          statusCode: 404,
          headers: getCorsHeaders(event),
          body: JSON.stringify({ message: 'Score not found' })
        };
      }
      
      const updateExpr = [];
      const exprAttrNames = {};
      const exprAttrValues = {};
      
      Object.keys(body).forEach(key => {
        if (key !== 'eventId' && key !== 'scoreId') {
          updateExpr.push(`#${key} = :${key}`);
          exprAttrNames[`#${key}`] = key;
          exprAttrValues[`:${key}`] = body[key];
        }
      });
      
      exprAttrNames['#updatedAt'] = 'updatedAt';
      exprAttrValues[':updatedAt'] = new Date().toISOString();
      updateExpr.push('#updatedAt = :updatedAt');
      
      await ddb.send(new UpdateCommand({
        TableName: SCORES_TABLE,
        Key: { eventId: body.eventId, scoreId },
        UpdateExpression: `SET ${updateExpr.join(', ')}`,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues
      }));
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ message: 'Score updated' })
      };
    }
    
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ message: error.message })
    };
  }
};

async function calculateEventLeaderboard(eventId) {
  try {
    // Get all scores for the event
    const { Items: scores } = await ddb.send(new QueryCommand({
      TableName: SCORES_TABLE,
      KeyConditionExpression: 'eventId = :eventId',
      ExpressionAttributeValues: { ':eventId': eventId }
    }));

    if (!scores || scores.length === 0) {
      return [];
    }

    // Calculate points-based leaderboard
    const athletePoints = {};
    const workoutScores = {};
    
    scores.forEach(score => {
      if (!workoutScores[score.wodId]) {
        workoutScores[score.wodId] = [];
      }
      workoutScores[score.wodId].push(score);
    });

    Object.values(workoutScores).forEach(wodScores => {
      const sortedScores = wodScores.sort((a, b) => b.score - a.score);
      
      sortedScores.forEach((score, index) => {
        const points = Math.max(100 - index, 1);
        const athleteId = score.athleteId;
        
        if (!athletePoints[athleteId]) {
          athletePoints[athleteId] = {
            athleteId,
            totalPoints: 0,
            workoutCount: 0,
            categoryId: score.categoryId,
            type: 'general'
          };
        }
        
        athletePoints[athleteId].totalPoints += points;
        athletePoints[athleteId].workoutCount += 1;
      });
    });

    return Object.values(athletePoints)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((athlete, index) => ({ ...athlete, rank: index + 1 }));

  } catch (error) {
    console.error('Error calculating event leaderboard:', error);
    throw error;
  }
}
