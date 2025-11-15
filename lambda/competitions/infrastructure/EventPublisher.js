const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

/**
 * Event Publisher for Domain Events
 * Publishes domain events to EventBridge
 */
class EventPublisher {
  constructor(eventBusName = 'default') {
    this.eventBridge = new EventBridgeClient({});
    this.eventBusName = eventBusName;
  }

  /**
   * Publish domain events to EventBridge
   * @param {Array} domainEvents - Array of domain events
   */
  async publish(domainEvents) {
    if (!domainEvents || domainEvents.length === 0) {
      return;
    }

    const entries = domainEvents.map(event => ({
      Source: 'competitions.event',
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
      EventBusName: this.eventBusName
    }));

    try {
      const result = await this.eventBridge.send(new PutEventsCommand({
        Entries: entries
      }));

      // Check for failures
      if (result.FailedEntryCount > 0) {
        console.error('Failed to publish some events:', result.Entries);
      }

      return result;
    } catch (error) {
      console.error('Error publishing domain events:', error);
      throw error;
    }
  }

  /**
   * Publish a single domain event
   * @param {Object} domainEvent - Single domain event
   */
  async publishOne(domainEvent) {
    return this.publish([domainEvent]);
  }
}

module.exports = EventPublisher;
