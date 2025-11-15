const Event = require('../domain/entities/Event');

/**
 * Event Application Service
 * Orchestrates use cases for event management
 */
class EventApplicationService {
  constructor(eventRepository, eventPublisher) {
    this.eventRepository = eventRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Create a new event
   */
  async createEvent(eventData, userId) {
    // Generate event ID if not provided
    if (!eventData.eventId) {
      eventData.eventId = `evt-${Date.now()}`;
    }

    const event = new Event(eventData);
    event.validate();

    await this.eventRepository.save(event);

    // Publish domain events
    const domainEvents = event.getDomainEvents();
    if (domainEvents.length > 0) {
      await this.eventPublisher.publish(domainEvents);
    }

    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId, updates, userId) {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Update properties
    Object.keys(updates).forEach(key => {
      if (key !== 'eventId' && key !== 'createdAt' && updates[key] !== undefined) {
        event[key] = updates[key];
      }
    });

    event.updatedAt = new Date().toISOString();
    event.validate();

    await this.eventRepository.save(event);

    // Publish domain events
    const domainEvents = event.getDomainEvents();
    if (domainEvents.length > 0) {
      await this.eventPublisher.publish(domainEvents);
    }

    return event;
  }

  /**
   * Publish an event (make it visible to public)
   */
  async publishEvent(eventId, userId) {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    event.publish(userId);
    await this.eventRepository.save(event);

    // Publish domain events
    const domainEvents = event.getDomainEvents();
    if (domainEvents.length > 0) {
      await this.eventPublisher.publish(domainEvents);
    }

    return event;
  }

  /**
   * Unpublish an event
   */
  async unpublishEvent(eventId, userId) {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    event.unpublish(userId);
    await this.eventRepository.save(event);

    // Publish domain events
    const domainEvents = event.getDomainEvents();
    if (domainEvents.length > 0) {
      await this.eventPublisher.publish(domainEvents);
    }

    return event;
  }

  /**
   * Make leaderboard public
   */
  async makeLeaderboardPublic(eventId, userId) {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    event.makeLeaderboardPublic(userId);
    await this.eventRepository.save(event);

    // Publish domain events
    const domainEvents = event.getDomainEvents();
    if (domainEvents.length > 0) {
      await this.eventPublisher.publish(domainEvents);
    }

    return event;
  }

  /**
   * Make leaderboard private
   */
  async makeLeaderboardPrivate(eventId, userId) {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    event.makeLeaderboardPrivate(userId);
    await this.eventRepository.save(event);

    // Publish domain events
    const domainEvents = event.getDomainEvents();
    if (domainEvents.length > 0) {
      await this.eventPublisher.publish(domainEvents);
    }

    return event;
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId) {
    return await this.eventRepository.findById(eventId);
  }

  /**
   * Get all published events
   */
  async getPublishedEvents() {
    return await this.eventRepository.findPublished();
  }

  /**
   * Get events by organization
   */
  async getOrganizationEvents(organizationId) {
    return await this.eventRepository.findByOrganization(organizationId);
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId, userId) {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    await this.eventRepository.delete(eventId);

    // Publish domain event
    await this.eventPublisher.publishOne({
      eventType: 'EventDeleted',
      eventId: eventId,
      deletedBy: userId,
      deletedAt: new Date().toISOString()
    });
  }
}

module.exports = EventApplicationService;
