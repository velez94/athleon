/**
 * Event Repository Interface
 * Defines the contract for event persistence
 */
class EventRepository {
  /**
   * Find event by ID
   * @param {string} eventId
   * @returns {Promise<Event|null>}
   */
  async findById(eventId) {
    throw new Error('Method not implemented');
  }

  /**
   * Find all published events
   * @returns {Promise<Event[]>}
   */
  async findPublished() {
    throw new Error('Method not implemented');
  }

  /**
   * Find events by organization
   * @param {string} organizationId
   * @returns {Promise<Event[]>}
   */
  async findByOrganization(organizationId) {
    throw new Error('Method not implemented');
  }

  /**
   * Save event
   * @param {Event} event
   * @returns {Promise<Event>}
   */
  async save(event) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete event
   * @param {string} eventId
   * @returns {Promise<void>}
   */
  async delete(eventId) {
    throw new Error('Method not implemented');
  }
}

module.exports = EventRepository;
