const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const logger = require('/opt/nodejs/utils/logger');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;

/**
 * EventBridge handler for Categories domain
 * Listens to domain events from other bounded contexts
 */
exports.handler = async (event) => {
  logger.info('Categories event handler triggered', { 
    detailType: event['detail-type'],
    source: event.source 
  });

  try {
    const detailType = event['detail-type'];
    const detail = event.detail;

    // Handle EventCategoriesUpdated from Competitions domain
    if (detailType === 'EventCategoriesUpdated') {
      await handleEventCategoriesUpdated(detail);
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
 * Handle EventCategoriesUpdated event
 * Updates category-event associations in the Categories table
 */
async function handleEventCategoriesUpdated(detail) {
  const { eventId, categories } = detail;
  
  logger.info('Processing EventCategoriesUpdated', { eventId, categoryCount: categories.length });

  // Get existing categories for this event
  const { Items: existingCategories } = await ddb.send(new QueryCommand({
    TableName: CATEGORIES_TABLE,
    KeyConditionExpression: 'eventId = :eventId',
    ExpressionAttributeValues: { ':eventId': eventId }
  }));

  const existingCategoryIds = new Set((existingCategories || []).map(c => c.categoryId));
  const newCategoryIds = new Set(categories.map(c => typeof c === 'object' ? c.categoryId : c));

  // Delete categories that are no longer selected
  for (const existing of (existingCategories || [])) {
    if (!newCategoryIds.has(existing.categoryId)) {
      await ddb.send(new DeleteCommand({
        TableName: CATEGORIES_TABLE,
        Key: { eventId, categoryId: existing.categoryId }
      }));
      logger.info('Removed category from event', { eventId, categoryId: existing.categoryId });
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
      logger.info('Updated category for event', { eventId, categoryId: category.categoryId });
    }
  }

  logger.info('EventCategoriesUpdated processed successfully', { eventId });
}
