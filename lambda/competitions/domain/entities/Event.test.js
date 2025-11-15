const Event = require('./Event');

describe('Event Entity', () => {
  describe('Business Rules', () => {
    test('should create a valid event', () => {
      const eventData = {
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: false,
        publicLeaderboard: false
      };

      const event = new Event(eventData);
      expect(event.eventId).toBe('evt-123');
      expect(event.name).toBe('Test Event');
      expect(event.publicLeaderboard).toBe(false);
    });

    test('should not allow public leaderboard for unpublished event', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: false
      });

      expect(() => {
        event.makeLeaderboardPublic('user-123');
      }).toThrow('Cannot make leaderboard public for unpublished event');
    });

    test('should allow public leaderboard for published event', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: true
      });

      event.makeLeaderboardPublic('user-123');
      expect(event.publicLeaderboard).toBe(true);
    });

    test('should emit domain event when making leaderboard public', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: true
      });

      event.makeLeaderboardPublic('user-123');
      const domainEvents = event.getDomainEvents();

      expect(domainEvents).toHaveLength(1);
      expect(domainEvents[0].eventType).toBe('LeaderboardVisibilityChanged');
      expect(domainEvents[0].publicLeaderboard).toBe(true);
      expect(domainEvents[0].changedBy).toBe('user-123');
    });

    test('should make leaderboard private when unpublishing event', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: true,
        publicLeaderboard: true
      });

      event.unpublish('user-123');
      
      expect(event.published).toBe(false);
      expect(event.publicLeaderboard).toBe(false);
      
      const domainEvents = event.getDomainEvents();
      expect(domainEvents).toHaveLength(2); // LeaderboardVisibilityChanged + EventUnpublished
    });

    test('should validate required fields', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: '',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location'
      });

      expect(() => {
        event.validate();
      }).toThrow('Event name is required');
    });

    test('should validate date range', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-03',
        endDate: '2025-06-01',
        location: 'Test Location'
      });

      expect(() => {
        event.validate();
      }).toThrow('Start date must be before end date');
    });

    test('should not allow public leaderboard without published event', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: false,
        publicLeaderboard: true
      });

      expect(() => {
        event.validate();
      }).toThrow('Cannot have public leaderboard for unpublished event');
    });

    test('should check if user can view leaderboard', () => {
      const publicEvent = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: true,
        publicLeaderboard: true
      });

      const privateEvent = new Event({
        eventId: 'evt-456',
        name: 'Test Event 2',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: true,
        publicLeaderboard: false
      });

      expect(publicEvent.canViewLeaderboard(false)).toBe(true);
      expect(publicEvent.canViewLeaderboard(true)).toBe(true);
      expect(privateEvent.canViewLeaderboard(false)).toBe(false);
      expect(privateEvent.canViewLeaderboard(true)).toBe(true);
    });
  });

  describe('Domain Events', () => {
    test('should clear domain events after retrieval', () => {
      const event = new Event({
        eventId: 'evt-123',
        name: 'Test Event',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        location: 'Test Location',
        published: true
      });

      event.makeLeaderboardPublic('user-123');
      const events1 = event.getDomainEvents();
      const events2 = event.getDomainEvents();

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(0);
    });
  });
});
