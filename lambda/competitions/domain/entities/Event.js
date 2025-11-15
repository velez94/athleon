/**
 * Event Aggregate Root
 * Represents a competition event with all its business rules
 */
class Event {
  constructor(data) {
    this.eventId = data.eventId;
    this.name = data.name;
    this.description = data.description;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.location = data.location;
    this.status = data.status || 'upcoming';
    this.published = data.published || false;
    this.publicLeaderboard = data.publicLeaderboard || false;
    this.maxParticipants = data.maxParticipants;
    this.registrationDeadline = data.registrationDeadline;
    this.organizationId = data.organizationId;
    this.imageUrl = data.imageUrl;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Domain events to be published
    this._domainEvents = [];
  }

  /**
   * Business rule: Make leaderboard public
   * Only published events can have public leaderboards
   */
  makeLeaderboardPublic(userId) {
    if (!this.published) {
      throw new Error('Cannot make leaderboard public for unpublished event');
    }

    if (this.publicLeaderboard) {
      return; // Already public, no change needed
    }

    this.publicLeaderboard = true;
    this.updatedAt = new Date().toISOString();
    
    this._domainEvents.push({
      eventType: 'LeaderboardVisibilityChanged',
      eventId: this.eventId,
      publicLeaderboard: true,
      changedBy: userId,
      changedAt: this.updatedAt
    });
  }

  /**
   * Business rule: Make leaderboard private
   */
  makeLeaderboardPrivate(userId) {
    if (!this.publicLeaderboard) {
      return; // Already private, no change needed
    }

    this.publicLeaderboard = false;
    this.updatedAt = new Date().toISOString();
    
    this._domainEvents.push({
      eventType: 'LeaderboardVisibilityChanged',
      eventId: this.eventId,
      publicLeaderboard: false,
      changedBy: userId,
      changedAt: this.updatedAt
    });
  }

  /**
   * Business rule: Publish event
   */
  publish(userId) {
    if (this.published) {
      return; // Already published
    }

    this.published = true;
    this.updatedAt = new Date().toISOString();
    
    this._domainEvents.push({
      eventType: 'EventPublished',
      eventId: this.eventId,
      publishedBy: userId,
      publishedAt: this.updatedAt
    });
  }

  /**
   * Business rule: Unpublish event
   * When unpublishing, leaderboard must also become private
   */
  unpublish(userId) {
    if (!this.published) {
      return; // Already unpublished
    }

    this.published = false;
    
    // Business rule: Unpublished events cannot have public leaderboards
    if (this.publicLeaderboard) {
      this.publicLeaderboard = false;
      this._domainEvents.push({
        eventType: 'LeaderboardVisibilityChanged',
        eventId: this.eventId,
        publicLeaderboard: false,
        changedBy: userId,
        changedAt: this.updatedAt,
        reason: 'Event unpublished'
      });
    }
    
    this.updatedAt = new Date().toISOString();
    
    this._domainEvents.push({
      eventType: 'EventUnpublished',
      eventId: this.eventId,
      unpublishedBy: userId,
      unpublishedAt: this.updatedAt
    });
  }

  /**
   * Check if a user can view the leaderboard
   */
  canViewLeaderboard(isAuthenticated) {
    return this.publicLeaderboard || isAuthenticated;
  }

  /**
   * Validate event data
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (!this.startDate) {
      errors.push('Start date is required');
    }

    if (!this.endDate) {
      errors.push('End date is required');
    }

    if (this.startDate && this.endDate && new Date(this.startDate) > new Date(this.endDate)) {
      errors.push('Start date must be before end date');
    }

    if (!this.location || this.location.trim().length === 0) {
      errors.push('Location is required');
    }

    if (this.publicLeaderboard && !this.published) {
      errors.push('Cannot have public leaderboard for unpublished event');
    }

    if (errors.length > 0) {
      throw new Error(`Event validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Get domain events and clear them
   */
  getDomainEvents() {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  /**
   * Convert to plain object for persistence
   */
  toObject() {
    return {
      eventId: this.eventId,
      name: this.name,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      location: this.location,
      status: this.status,
      published: this.published,
      publicLeaderboard: this.publicLeaderboard,
      maxParticipants: this.maxParticipants,
      registrationDeadline: this.registrationDeadline,
      organizationId: this.organizationId,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Event from database record
   */
  static fromDatabase(data) {
    return new Event(data);
  }
}

module.exports = Event;
