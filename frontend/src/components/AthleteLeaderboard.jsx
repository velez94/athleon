import { useState, useEffect, useCallback } from 'react';
import { get } from '../lib/api';

function AthleteLeaderboard({ userProfile }) {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [, setExpandedCards] = useState({});
  const [leaderboardType] = useState('general');
  const [, setPublishedSchedules] = useState([]);
  const [selectedSchedule] = useState(null);

  const fetchData = async () => {
    try {
      const [eventsRes, athletesRes, categoriesRes] = await Promise.all([
        get('/public/events'),
        get('/athletes'),
        get('/categories')
      ]);
      
      setEvents(eventsRes || []);
      setAthletes(athletesRes || []);
      setCategories(categoriesRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchPublishedSchedules = async () => {
    try {
      const response = await get(`/scheduler/${selectedEvent.eventId}`);
      const schedules = Array.isArray(response) ? response.filter(s => s.published) : [];
      setPublishedSchedules(schedules);
    } catch (error) {
      console.error('Error fetching published schedules:', error);
      setPublishedSchedules([]);
    }
  };

  const fetchEventScores = async () => {
    try {
      const response = await get(`/public/scores?eventId=${selectedEvent.eventId}`);
      setAllScores(response || []);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setAllScores([]);
    }
  };

  const calculateLeaderboard = useCallback(() => {
    if (!selectedCategory || allScores.length === 0) {
      setLeaderboard([]);
      return;
    }

    const categoryAthletes = athletes.filter(athlete => 
      athlete.categoryId === selectedCategory
    );

    if (categoryAthletes.length === 0) {
      setLeaderboard([]);
      return;
    }

    const athleteScores = {};
    
    categoryAthletes.forEach(athlete => {
      athleteScores[athlete.userId] = {
        athlete,
        totalScore: 0,
        wodScores: {},
        completedWods: 0
      };
    });

    allScores.forEach(score => {
      if (score.categoryId === selectedCategory && athleteScores[score.athleteId]) {
        const currentScore = athleteScores[score.athleteId].wodScores[score.wodId];
        if (!currentScore || score.score > currentScore.score) {
          if (!currentScore) {
            athleteScores[score.athleteId].completedWods++;
          }
          athleteScores[score.athleteId].wodScores[score.wodId] = score;
        }
      }
    });

    Object.values(athleteScores).forEach(athleteData => {
      athleteData.totalScore = Object.values(athleteData.wodScores)
        .reduce((sum, score) => sum + (score.score || 0), 0);
    });

    const sortedLeaderboard = Object.values(athleteScores)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        return b.completedWods - a.completedWods;
      })
      .map((athleteData, index) => ({
        rank: index + 1,
        ...athleteData
      }));

    setLeaderboard(sortedLeaderboard);
  }, [selectedCategory, allScores, athletes]);

  const fetchLeaderboard = async () => {
    if (!selectedEvent) return;
    
    try {
      let url = `/leaderboard?eventId=${selectedEvent.eventId}`;
      if (selectedCategory) url += `&categoryId=${selectedCategory}`;
      if (selectedSchedule) url += `&scheduleId=${selectedSchedule.scheduleId}`;
      
      const response = await get(url);
      if (response?.leaderboard) {
        setLeaderboard(response.leaderboard);
      } else {
        calculateLeaderboard();
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      calculateLeaderboard();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (userProfile?.categoryId && !selectedCategory) {
      setSelectedCategory(userProfile.categoryId);
    }
  }, [userProfile, selectedCategory]);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventScores();
      fetchPublishedSchedules();
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, leaderboardType, selectedSchedule]);

  useEffect(() => {
    if (allScores.length > 0) {
      calculateLeaderboard();
    }
  }, [selectedCategory, athletes, allScores, calculateLeaderboard]);

  const isCurrentUser = (athleteId) => {
    return userProfile?.athleteId === athleteId;
  };

  const toggleCard = (athleteId) => {
    setExpandedCards(prev => ({
      ...prev,
      [athleteId]: !prev[athleteId]
    }));
  };

  return (
    <div className="athlete-leaderboard">
      <h2>Leaderboard</h2>
      
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="event-select">Event:</label>
          <select 
            id="event-select"
            value={selectedEvent?.eventId || ''} 
            onChange={(e) => {
              const event = events.find(ev => ev.eventId === e.target.value);
              setSelectedEvent(event);
            }}
          >
            <option value="">Select an event</option>
            {events.map(event => (
              <option key={event.eventId} value={event.eventId}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="category-select">Category:</label>
          <select 
            id="category-select"
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="leaderboard-content">
        {leaderboard.length > 0 ? (
          <div className="leaderboard-list">
            {leaderboard.map((entry) => (
              <div 
                key={entry.athlete.userId} 
                className={`leaderboard-card ${isCurrentUser(entry.athlete.userId) ? 'current-user' : ''}`}
                onClick={() => toggleCard(entry.athlete.userId)}
              >
                <div className="card-header">
                  <div className="position-badge">
                    <span className="position-number">#{entry.rank}</span>
                  </div>
                  <div className="athlete-info">
                    <h4 className="athlete-name">
                      {entry.athlete.firstName} {entry.athlete.lastName}
                    </h4>
                  </div>
                  <div className="card-stats">
                    <div className="stat">
                      <span className="stat-label">Score</span>
                      <span className="stat-value">{entry.totalScore}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">WODs</span>
                      <span className="stat-value">{entry.completedWods}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-scores">
            <div className="no-scores-icon">🏆</div>
            <h3>No scores yet</h3>
            <p>Scores will appear here once athletes start competing!</p>
          </div>
        )}
      </div>

      <style>{`
        .athlete-leaderboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .filters {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .filter-group label {
          font-weight: 600;
          color: #374151;
        }
        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          min-width: 200px;
        }
        .leaderboard-content h3 {
          margin-bottom: 20px;
          color: #1f2937;
        }
        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .leaderboard-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .leaderboard-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }
        .leaderboard-card.current-user {
          border-color: #10b981;
          background: #f0fdf4;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .position-badge {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .position-number {
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        .athlete-info {
          flex: 1;
        }
        .athlete-name {
          margin: 0;
          font-size: 18px;
          color: #1f2937;
        }
        .card-stats {
          display: flex;
          gap: 30px;
        }
        .stat {
          text-align: center;
        }
        .stat-label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin-top: 2px;
        }
        .no-scores {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }
        .no-scores-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .no-scores h3 {
          margin: 0 0 8px 0;
          color: #374151;
        }
        .no-scores p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}

export default AthleteLeaderboard;
