const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const logger = require('/opt/nodejs/utils/logger');

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  logger.info('EventBridge event received', { event });

  try {
    for (const record of event.Records || [event]) {
      const detail = typeof record.detail === 'string' ? JSON.parse(record.detail) : record.detail;
      
      if (record.source === 'scheduling.domain' && record['detail-type'] === 'EventDataRequested') {
        await handleEventDataRequest(detail);
      }
    }

    return { statusCode: 200 };
  } catch (error) {
    logger.error('EventBridge handler error', { error: error.message });
    return { statusCode: 500 };
  }
};

async function handleEventDataRequest({ eventId, requestId }) {
  try {
    const { Item: eventData } = await ddb.send(new GetCommand({
      TableName: process.env.EVENTS_TABLE,
      Key: { eventId }
    }));

    if (!eventData) {
      throw new Error('Event not found');
    }

    // Respond with event data
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'competitions.domain',
        DetailType: 'EventDataResponse',
        Detail: JSON.stringify({
          requestId,
          eventId,
          eventData: {
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            name: eventData.name,
            location: eventData.location
          }
        }),
        EventBusName: process.env.CENTRAL_EVENT_BUS
      }]
    }));

    logger.info('Event data response sent', { eventId, requestId });
  } catch (error) {
    logger.error('Failed to handle event data request', { eventId, requestId, error: error.message });
    
    // Send error response
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'competitions.domain',
        DetailType: 'EventDataError',
        Detail: JSON.stringify({
          requestId,
          eventId,
          error: error.message
        }),
        EventBusName: process.env.CENTRAL_EVENT_BUS
      }]
    }));
  }
}
