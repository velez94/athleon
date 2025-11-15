const { PutCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const EventRepository = require('../../domain/repositories/EventRepository');
const Event = require('../../domain/entities/Event');

/**
 * DynamoDB implementation of Event Repository
 */
class DynamoEventRepository extends EventRepository {
  constructor(dynamoClient, eventsTable, organizationEventsTable) {
    super();
    this.dynamodb = dynamoClient;
    this.eventsTable = eventsTable;
    this.organizationEventsTable = organizationEventsTable;
  }

  /**
   * Find event by ID
   */
  async findById(eventId) {
    const { Item } = await this.dynamodb.send(new GetCommand({
      TableName: this.eventsTable,
      Key: { eventId }
    }));

    return Item ? Event.fromDatabase(Item) : null;
  }

  /**
   * Find all published events
   */
  async findPublished() {
    const { Items } = await this.dynamodb.send(new ScanCommand({
      TableName: this.eventsTable,
      FilterExpression: 'published = :published',
      ExpressionAttributeValues: {
        ':published': true
      }
    }));

    return (Items || []).map(item => Event.fromDatabase(item));
  }

  /**
   * Find events by organization
   */
  async findByOrganization(organizationId) {
    // First get event IDs from organization-events table
    const { Items: orgEvents } = await this.dynamodb.send(new QueryCommand({
      TableName: this.organizationEventsTable,
      KeyConditionExpression: 'organizationId = :organizationId',
      ExpressionAttributeValues: {
        ':organizationId': organizationId
      }
    }));

    if (!orgEvents || orgEvents.length === 0) {
      return [];
    }

    // Then fetch full event details
    const events = await Promise.all(
      orgEvents.map(orgEvent => this.findById(orgEvent.eventId))
    );

    return events.filter(event => event !== null);
  }

  /**
   * Save event (create or update)
   */
  async save(event) {
    // Validate before saving
    event.validate();

    const eventData = event.toObject();

    await this.dynamodb.send(new PutCommand({
      TableName: this.eventsTable,
      Item: eventData
    }));

    // If organizationId exists, maintain the organization-event relationship
    if (event.organizationId) {
      await this.dynamodb.send(new PutCommand({
        TableName: this.organizationEventsTable,
        Item: {
          organizationId: event.organizationId,
          eventId: event.eventId,
          createdAt: event.createdAt
        }
      }));
    }

    return event;
  }

  /**
   * Delete event
   */
  async delete(eventId) {
    // Get event first to get organizationId
    const event = await this.findById(eventId);
    
    if (!event) {
      return;
    }

    // Delete from events table
    await this.dynamodb.send(new DeleteCommand({
      TableName: this.eventsTable,
      Key: { eventId }
    }));

    // Delete organization-event relationship if exists
    if (event.organizationId) {
      await this.dynamodb.send(new DeleteCommand({
        TableName: this.organizationEventsTable,
        Key: {
          organizationId: event.organizationId,
          eventId: eventId
        }
      }));
    }
  }
}

module.exports = DynamoEventRepository;
