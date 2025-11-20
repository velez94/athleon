/**
 * DDD-Aligned Lambda Handler for Competitions/Events
 * This is a thin HTTP adapter layer that delegates to the application service
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const DynamoEventRepository = require('./infrastructure/repositories/DynamoEventRepository');
const EventPublisher = require('./infrastructure/EventPublisher');
const EventApplicationService = require('./application/EventApplicationService');
const logger = require('./logger');
const { 
  createResponse, 
  createOptionsResponse, 
  createErrorResponse,
  getCorsHeaders 
} = require('/opt/nodejs/utils/http-headers');
const { 
  extractAuthContext, 
  requireRole, 
  ForbiddenError, 
  UnauthorizedError 
} = require('/opt/nodejs/utils/authorization');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const EVENTS_TABLE = process.env.EVENTS_TABLE;
const ORGANIZATION_EVENTS_TABLE = process.env.ORGANIZATION_EVENTS_TABLE;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';

// Use global CORS headers
const headers = getCorsHeaders();


// Initialize services (reused across warm Lambda invocations)
let eventService;

function getEventService() {
  if (!eventService) {
    const eventRepository = new DynamoEventRepository(
      ddb,
      EVENTS_TABLE,
      ORGANIZATION_EVENTS_TABLE
    );
    const eventPublisher = new EventPublisher(EVENT_BUS_NAME);
    eventService = new EventApplicationService(eventRepository, eventPublisher);
  }
  return eventService;
}

exports.handler = async (event) => {
  logger.info('DDD Event Handler', {
    method: event.httpMethod,
    path: event.path
  });

  // Extract origin for CORS
  const origin = event.headers?.origin || event.headers?.Origin;

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return createOptionsResponse(origin);
  }

  try {
    const service = getEventService();
    
    // Extract path
    let path = event.path || '';
    // Don't override path with proxy parameter - keep full path to preserve /public prefix
    
    // Clean path
    if (path.startsWith('/competitions')) {
      path = path.substring('/competitions'.length);
    } else if (path.startsWith('/events') && !path.startsWith('/public/events')) {
      path = path.substring('/events'.length);
    }
    
    const method = event.httpMethod;
    const pathParts = path.split('/').filter(p => p);
    const eventId = pathParts[0];
    
    // Extract user info
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;
    
    // Parse request body
    let requestBody = {};
    if (event.body && (method === 'PUT' || method === 'POST')) {
      requestBody = JSON.parse(event.body);
    }

    // ===== PUBLIC ENDPOINTS (No Auth Required) =====
    
    // GET /public/events - Get all published events
    if (path === '/public/events' && method === 'GET') {
      const events = await service.getPublishedEvents();
      return createResponse(200, events.map(e => e.toObject()), origin);
    }

    // GET /public/events/{eventId} - Get single published event
    if (path.startsWith('/public/events/') && method === 'GET') {
      const publicEventId = pathParts[2]; // pathParts = ['public', 'events', 'evt-demo-2025']
      const event = await service.getEvent(publicEventId);
      
      if (!event || !event.published) {
        return createErrorResponse(404, 'Event not found or not published', origin);
      }
      
      return createResponse(200, event.toObject(), origin);
    }

    // ===== AUTHENTICATED ENDPOINTS =====
    
    if (!userId) {
      return createErrorResponse(401, 'Authentication required', origin);
    }

    // Extract authentication context for role-based authorization
    let authContext;
    try {
      authContext = extractAuthContext(event);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return createErrorResponse(401, error.message, origin);
      }
      throw error;
    }

    // GET /competitions?organizationId={orgId} - Get organization events
    if (path === '' && method === 'GET') {
      const organizationId = event.queryStringParameters?.organizationId;
      
      if (!organizationId) {
        return createErrorResponse(400, 'organizationId is required', origin);
      }
      
      const events = await service.getOrganizationEvents(organizationId);
      return createResponse(200, events.map(e => e.toObject()), origin);
    }

    // POST /competitions - Create new event
    if (path === '' && method === 'POST') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const { categories, wods, ...eventData } = requestBody;
      
      const newEvent = await service.createEvent(eventData, userId);
      
      // Save categories to CATEGORIES_TABLE (DDD violation but necessary for functionality)
      if (categories && Array.isArray(categories) && categories.length > 0) {
        const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;
        if (CATEGORIES_TABLE) {
          const { PutCommand } = require('@aws-sdk/lib-dynamodb');
          
          for (const category of categories) {
            if (typeof category === 'object' && category.categoryId) {
              await ddb.send(new PutCommand({
                TableName: CATEGORIES_TABLE,
                Item: {
                  eventId: newEvent.eventId,
                  categoryId: category.categoryId,
                  name: category.name,
                  description: category.description || '',
                  gender: category.gender || null,
                  minAge: category.minAge || null,
                  maxAge: category.maxAge || null,
                  maxParticipants: category.maxParticipants || null,
                  createdAt: new Date().toISOString()
                }
              }));
            }
          }
        }
      }
      
      // Save WODs to WODS_TABLE (DDD violation but necessary for functionality)
      if (wods && Array.isArray(wods) && wods.length > 0) {
        const WODS_TABLE = process.env.WODS_TABLE;
        if (WODS_TABLE) {
          const { PutCommand } = require('@aws-sdk/lib-dynamodb');
          
          for (const wod of wods) {
            if (typeof wod === 'object' && wod.wodId) {
              await ddb.send(new PutCommand({
                TableName: WODS_TABLE,
                Item: {
                  eventId: newEvent.eventId,
                  wodId: wod.wodId,
                  name: wod.name,
                  description: wod.description || '',
                  format: wod.format || '',
                  timeLimit: wod.timeLimit || null,
                  movements: wod.movements || [],
                  createdAt: new Date().toISOString()
                }
              }));
            }
          }
        }
      }
      return createResponse(201, newEvent.toObject(), origin);
    }

    // GET /competitions/{eventId} - Get single event
    if (eventId && pathParts.length === 1 && method === 'GET') {
      const eventData = await service.getEvent(eventId);
      
      if (!eventData) {
        return createErrorResponse(404, 'Event not found', origin);
      }
      
      return createResponse(200, eventData.toObject(), origin);
    }

    // PUT /competitions/{eventId} - Update event
    if (eventId && pathParts.length === 1 && method === 'PUT') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const { categories, wods, workouts, ...eventData } = requestBody;
      
      const updatedEvent = await service.updateEvent(eventId, eventData, userId);
      
      // Pragmatic DDD: Write synchronously for immediate consistency + publish events for other consumers
      // This balances DDD principles with user experience requirements
      const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;
      const WODS_TABLE = process.env.WODS_TABLE;
      const { PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
      
      // Update categories synchronously
      if (categories !== undefined && CATEGORIES_TABLE) {
        const { Items: existingCategories } = await ddb.send(new QueryCommand({
          TableName: CATEGORIES_TABLE,
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: { ':eventId': eventId }
        }));
        
        const existingCategoryIds = new Set((existingCategories || []).map(c => c.categoryId));
        const newCategoryIds = new Set(categories.map(c => typeof c === 'object' ? c.categoryId : c));
        
        // Delete removed categories
        for (const existing of (existingCategories || [])) {
          if (!newCategoryIds.has(existing.categoryId)) {
            await ddb.send(new DeleteCommand({
              TableName: CATEGORIES_TABLE,
              Key: { eventId, categoryId: existing.categoryId }
            }));
          }
        }
        
        // Add or update selected categories
        for (const category of categories) {
          if (typeof category === 'object' && category.categoryId) {
            await ddb.send(new PutCommand({
              TableName: CATEGORIES_TABLE,
              Item: {
                eventId,
                categoryId: category.categoryId,
                name: category.name,
                description: category.description || '',
                gender: category.gender || null,
                minAge: category.minAge || null,
                maxAge: category.maxAge || null,
                maxParticipants: category.maxParticipants || null,
                createdAt: existingCategoryIds.has(category.categoryId)
                  ? (existingCategories.find(c => c.categoryId === category.categoryId)?.createdAt || new Date().toISOString())
                  : new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }));
          }
        }
      }
      
      // Update WODs synchronously
      const wodsToSave = wods || workouts;
      if (wodsToSave !== undefined && WODS_TABLE) {
        const { Items: existingWods } = await ddb.send(new QueryCommand({
          TableName: WODS_TABLE,
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: { ':eventId': eventId }
        }));
        
        const existingWodIds = new Set((existingWods || []).map(w => w.wodId));
        const newWodIds = new Set(wodsToSave.map(w => typeof w === 'object' ? w.wodId : w));
        
        // Delete removed WODs
        for (const existing of (existingWods || [])) {
          if (!newWodIds.has(existing.wodId)) {
            await ddb.send(new DeleteCommand({
              TableName: WODS_TABLE,
              Key: { eventId, wodId: existing.wodId }
            }));
          }
        }
        
        // Add or update selected WODs
        for (const wod of wodsToSave) {
          if (typeof wod === 'object' && wod.wodId) {
            await ddb.send(new PutCommand({
              TableName: WODS_TABLE,
              Item: {
                eventId,
                wodId: wod.wodId,
                name: wod.name,
                description: wod.description || '',
                format: wod.format || '',
                timeLimit: wod.timeLimit || null,
                timeCap: wod.timeCap || null,
                movements: wod.movements || [],
                scoringType: wod.scoringType || null,
                createdAt: existingWodIds.has(wod.wodId)
                  ? (existingWods.find(w => w.wodId === wod.wodId)?.createdAt || new Date().toISOString())
                  : new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }));
          }
        }
      }
      
      // Also publish domain events for other consumers (audit, analytics, etc.)
      const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
      const eventBridge = new EventBridgeClient({});
      const CENTRAL_EVENT_BUS = process.env.CENTRAL_EVENT_BUS || 'default';
      
      const domainEvents = [];
      
      if (categories !== undefined) {
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
      }
      
      if (wodsToSave !== undefined) {
        domainEvents.push({
          Source: 'competitions.domain',
          DetailType: 'EventWodsUpdated',
          Detail: JSON.stringify({
            eventId,
            wods: wodsToSave || [],
            updatedBy: userId,
            timestamp: new Date().toISOString()
          }),
          EventBusName: CENTRAL_EVENT_BUS
        });
      }
      
      // Publish events asynchronously (fire and forget for audit/analytics)
      if (domainEvents.length > 0) {
        eventBridge.send(new PutEventsCommand({
          Entries: domainEvents
        })).catch(error => {
          logger.error('Failed to publish domain events', { error: error.message });
        });
      }
      
      return createResponse(200, updatedEvent.toObject(), origin);
    }

    // POST /competitions/{eventId}/publish - Publish event
    if (eventId && pathParts[1] === 'publish' && method === 'POST') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const publishedEvent = await service.publishEvent(eventId, userId);
      return createResponse(200, publishedEvent.toObject(), origin);
    }

    // POST /competitions/{eventId}/unpublish - Unpublish event
    if (eventId && pathParts[1] === 'unpublish' && method === 'POST') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const unpublishedEvent = await service.unpublishEvent(eventId, userId);
      return createResponse(200, unpublishedEvent.toObject(), origin);
    }

    // POST /competitions/{eventId}/leaderboard/public - Make leaderboard public
    if (eventId && pathParts[1] === 'leaderboard' && pathParts[2] === 'public' && method === 'POST') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const updatedEvent = await service.makeLeaderboardPublic(eventId, userId);
      return createResponse(200, updatedEvent.toObject(), origin);
    }

    // POST /competitions/{eventId}/leaderboard/private - Make leaderboard private
    if (eventId && pathParts[1] === 'leaderboard' && pathParts[2] === 'private' && method === 'POST') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const updatedEvent = await service.makeLeaderboardPrivate(eventId, userId);
      return createResponse(200, updatedEvent.toObject(), origin);
    }

    // DELETE /competitions/{eventId} - Delete event
    if (eventId && pathParts.length === 1 && method === 'DELETE') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      await service.deleteEvent(eventId, userId);
      return createResponse(204, '', origin);
    }

    // DDD VIOLATION REMOVED: Event days and scoring systems belong to other bounded contexts
    // Frontend should call the appropriate domain APIs:
    // - Event days: Not implemented yet (would be part of Scheduling domain)
    // - Scoring systems: Call /scoring-systems API directly


    // GET /competitions/{eventId}/days - Get event days (returns empty array if none exist)
    if (eventId && pathParts[1] === 'days' && method === 'GET') {
      try {
        const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
        const EVENT_DAYS_TABLE = process.env.EVENT_DAYS_TABLE;
        
        if (!EVENT_DAYS_TABLE) {
          return createResponse(200, [], origin);
        }
        
        const { Items } = await ddb.send(new QueryCommand({
          TableName: EVENT_DAYS_TABLE,
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: {
            ':eventId': eventId
          }
        }));
        
        return createResponse(200, Items || [], origin);
      } catch (error) {
        logger.error('Error fetching event days:', error);
        return createResponse(200, [], origin);
      }
    }
    // POST /competitions/{eventId}/upload-url - Generate S3 upload URL
    if (eventId && pathParts[1] === 'upload-url' && method === 'POST') {
      // Require organizer or super_admin role
      try {
        requireRole(['organizer', 'super_admin'])(authContext);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return createErrorResponse(403, error.message, origin);
        }
        throw error;
      }

      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      
      const s3Client = new S3Client({});
      const EVENT_IMAGES_BUCKET = process.env.EVENT_IMAGES_BUCKET;
      
      if (!EVENT_IMAGES_BUCKET) {
        return createErrorResponse(500, 'Event images bucket not configured', origin);
      }
      
      const { fileName, fileType } = requestBody;
      if (!fileName || !fileType) {
        return createErrorResponse(400, 'fileName and fileType are required', origin);
      }
      
      const key = `events/${eventId}/${fileName}`;
      const command = new PutObjectCommand({
        Bucket: EVENT_IMAGES_BUCKET,
        Key: key,
        ContentType: fileType
      });
      
      try {
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        
        // Use CloudFront domain if available, otherwise fall back to S3 URL
        // CloudFront serves images from /images/* path which gets rewritten to S3 root
        const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
        const imageUrl = CLOUDFRONT_DOMAIN 
          ? `${CLOUDFRONT_DOMAIN}/images/${key}`
          : `https://${EVENT_IMAGES_BUCKET}.s3.amazonaws.com/${key}`;
        
        return createResponse(200, { uploadUrl, imageUrl }, origin);
      } catch (error) {
        logger.error('Error generating upload URL', { error: error.message, eventId });
        return createErrorResponse(500, 'Failed to generate upload URL', origin);
      }
    }

    // Route not found
    return createErrorResponse(404, 'Route not found', origin);

  } catch (error) {
    logger.error('Error in DDD handler', { error: error.message, stack: error.stack });
    
    return createErrorResponse(
      error.message.includes('not found') ? 404 : 500,
      error.message || 'Internal server error',
      origin
    );
  }
};
