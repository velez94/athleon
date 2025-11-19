const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('/opt/nodejs/utils/logger');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const WODS_TABLE = process.env.WODS_TABLE;

/**
 * EventBridge handler for WODs domain
 * Listens to domain events from other bounded contexts
 */
exports.handler = async (event) => {
  logger.info('WODs event handler triggered', { 
    detailType: event['detail-type'],
    source: event.source 
  });

  try {
    const detailType = event['detail-type'];
    const detail = event.detail;

    // Handle EventWodsUpdated from Competitions domain
    if (detailType === 'EventWodsUpdated') {
      await handleEventWodsUpdated(detail);
    }

    return { statusCode: 200, body: 'Event processed successfully' };
  } catch (error) {
    logger.error('Error processing event', { 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
  }
};

/**
 * Handle EventWodsUpdated event
 * Updates WOD-event associations in the WODs table
 */
async function handleEventWodsUpdated(detail) {
  const { eventId, wods } = detail;
  
  logger.info('Processing EventWodsUpdated', { eventId, wodCount: wods.length });

  // Get existing WODs for this event
  const { Items: existingWods } = await ddb.send(new QueryCommand({
    TableName: WODS_TABLE,
    KeyConditionExpression: 'eventId = :eventId',
    ExpressionAttributeValues: { ':eventId': eventId }
  }));

  const existingWodIds = new Set((existingWods || []).map(w => w.wodId));
  const newWodIds = new Set(wods.map(w => typeof w === 'object' ? w.wodId : w));

  // Delete WODs that are no longer selected
  for (const existing of (existingWods || [])) {
    if (!newWodIds.has(existing.wodId)) {
      await ddb.send(new DeleteCommand({
        TableName: WODS_TABLE,
        Key: { eventId, wodId: existing.wodId }
      }));
      logger.info('Removed WOD from event', { eventId, wodId: existing.wodId });
    }
  }

  // Add or update selected WODs
  for (const wod of wods) {
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
      logger.info('Updated WOD for event', { eventId, wodId: wod.wodId });
    }
  }

  logger.info('EventWodsUpdated processed successfully', { eventId });
}
