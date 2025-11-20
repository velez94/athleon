import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicGet } from '../lib/api';
import LoadingSpinner from './common/Loading/LoadingSpinner';

function PublicEventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wods, setWods] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWod, setSelectedWod] = useState('');
  const [showSchedule, setShowSchedule] = useState(true); // Show by default

  useEffect(() => {
    fetchEventData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (event && selectedCategory) {
      fetchScores();
    }
  }, [selectedCategory, selectedWod, event]);

  const fetchEventData = async () => {
    try {
      // Use publicGet for unauthenticated public endpoint
      const eventData = await publicGet(`/public/events/${eventId}`);

      if (!eventData.published) {
        navigate('/events');
        return;
      }

      setEvent(eventData);

      // Fetch public data
      try {
        const [categoriesRes, wodsRes, schedulesRes] = await Promise.all([
          publicGet(`/public/categories?eventId=${eventId}`),
          publicGet(`/public/wods?eventId=${eventId}`),
          publicGet(`/public/schedules/${eventId}`)
        ]);

        setCategories(categoriesRes || []);
        setWods(wodsRes || []);
        setSchedules(schedulesRes || []);

        if (categoriesRes && categoriesRes.length > 0) setSelectedCategory(categoriesRes[0].categoryId);

        // Fetch public scores if publicLeaderboard is enabled
        if (eventData.publicLeaderboard) {
          const scoresResponse = await get({
            apiName: 'CalisthenicsAPI',
            path: `/public/scores?eventId=${eventId}`
          }).response;
          const scoresRes = await scoresResponse.body.json();
          setScores(scoresRes);
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const fetchScores = async () => {
    const canViewScores = event && event.publicLeaderboard;
    if (!canViewScores) return;

    try {
      const scoresResponse = await get({
        apiName: 'CalisthenicsAPI',
        path: `/public/scores?eventId=${eventId}`
      }).response;
      const scoresRes = await scoresResponse.body.json();
      setScores(scoresRes);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setScores([]);
    }
  };

  const getCategoryById = (categoryId) => {
    return categories.find(c => c.categoryId === categoryId) || { name: 'Unknown Category' };
  };

  const getWodById = (wodId) => {
    return wods.find(w => w.wodId === wodId) || { name: 'Unknown WOD' };
  };

  const getLeaderboard = () => {
    if (!scores.length) return [];

    let filteredScores = scores;

    if (selectedCategory) {
      filteredScores = filteredScores.filter(s => s.categoryId === selectedCategory);
    }

    if (selectedWod) {
      filteredScores = filteredScores.filter(s => s.wodId === selectedWod);
    }

    return filteredScores
      .sort((a, b) => b.score - a.score)
      .map((score, index) => ({
        ...score,
        rank: index + 1
      }));
  };

  if (loading) return <LoadingSpinner size="lg" message="Loading event details..." variant="pulse" />;
  if (!event) return null;

  return (
    <div className="public-event-detail">
      <button onClick={() => navigate('/events')} className="back-btn">
        ← Back to Events
      </button>

      <div className="event-header">
        <h1>{event.name}</h1>
        <div className="event-meta">
          <span>📅 {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</span>
          <span>📍 {event.location}</span>
          <span className={`status-badge ${event.status}`}>{event.status}</span>
        </div>
        <p className="event-description">{event.description}</p>
      </div>

      {schedules.length > 0 && (
        <div className="schedule-section">
          <div className="schedule-header">
            <h2>📅 Event Schedule</h2>
            <button 
              onClick={() => setShowSchedule(!showSchedule)} 
              className="schedule-collapse-btn"
            >
              {showSchedule ? '▼ Collapse' : '▶ Expand'}
            </button>
          </div>
          {showSchedule && schedules.map(schedule => (
            <div key={schedule.scheduleId} className="schedule-card">
              <h3>{schedule.name || 'Competition Schedule'}</h3>
              {schedule.competitionMode && (
                <p className="schedule-mode">Mode: {schedule.competitionMode}</p>
              )}
              
              {schedule.days && schedule.days.map(day => (
                <div key={day.dayId} className="day-schedule">
                  <h4>{day.name || 'Competition Day'}</h4>
                  {day.sessions && day.sessions.length > 0 ? (
                    <div className="sessions-list">
                      {day.sessions.map((session, idx) => {
                        const category = getCategoryById(session.categoryId);
                        const wod = getWodById(session.wodId);
                        return (
                          <div key={idx} className="session-item">
                            <div className="session-time">
                              <strong>{session.startTime}</strong>
                            </div>
                            <div className="session-details">
                              <div className="session-info">
                                <span className="session-wod">{wod.name || 'Workout'}</span>
                                <span className="session-category">{category.name || 'Category'}</span>
                              </div>
                              {session.athleteCount && (
                                <span className="session-athletes">👥 {session.athleteCount} athletes</span>
                              )}
                              {session.heatCount && (
                                <span className="session-heats">🔥 {session.heatCount} heats</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-sessions">No sessions scheduled for this day</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="content-grid">
        <div className="categories-section">
          <h2>Categories</h2>
          <div className="categories-list">
            {categories.length > 0 ? (
              categories.map(category => (
                <div 
                  key={category.categoryId}
                  className={`category-card ${selectedCategory === category.categoryId ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(category.categoryId)}
                >
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <div className="category-meta">
                    {category.gender && <span>👤 {category.gender}</span>}
                    {category.minAge && <span>🎂 {category.minAge}+ years</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No categories available</p>
            )}
          </div>
        </div>

        <div className="wods-section">
          <h2>Workouts (WODs)</h2>
          {wods.length > 0 ? (
            <>
              <div className="wods-filter">
                <select 
                  value={selectedWod} 
                  onChange={(e) => setSelectedWod(e.target.value)}
                >
                  <option value="">All WODs</option>
                  {wods.map(wod => (
                    <option key={wod.wodId} value={wod.wodId}>{wod.name}</option>
                  ))}
                </select>
              </div>
              <div className="wods-list">
                {wods.map(wod => (
                  <div key={wod.wodId} className="wod-card">
                    <h3>{wod.name}</h3>
                    <p>{wod.description}</p>
                    <div className="wod-meta">
                      <span>⏱️ {wod.format}</span>
                      {wod.timeCap && (
                        <span>🕐 {typeof wod.timeCap === 'object' ? `${wod.timeCap.minutes}:${String(wod.timeCap.seconds).padStart(2, '0')}` : wod.timeCap}s cap</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="no-data">No workouts available</p>
          )}
        </div>

        <div className="scores-section">
          <h2>Leaderboard</h2>
          {!event.publicLeaderboard && event.status === 'upcoming' ? (
            <div className="leaderboard-notice">
              <p>🔐 Leaderboard will be available when the event starts</p>
              <p className="small-text">Want to compete? <span onClick={() => navigate('/login')} className="signin-link">Sign in here</span></p>
            </div>
          ) : !event.publicLeaderboard ? (
            <div className="leaderboard-notice">
              <p>🔐 Leaderboard is private for this event</p>
              <p className="small-text">Sign in to view scores. <span onClick={() => navigate('/login')} className="signin-link">Sign in here</span></p>
            </div>
          ) : (
            <>
              {selectedCategory && (
                <p className="category-filter">
                  Showing: {getCategoryById(selectedCategory).name}
                  {selectedWod && ` - ${getWodById(selectedWod).name}`}
                </p>
              )}
              <div className="leaderboard">
                {getLeaderboard().length > 0 ? (
                  getLeaderboard().map(entry => (
                    <div key={entry.scoreId} className="score-entry">
                      <div className="rank">#{entry.rank}</div>
                      <div className="athlete-info">
                        <strong>Athlete {entry.athleteId.substring(0, 8)}</strong>
                        {!selectedWod && entry.wodId && (
                          <small>{getWodById(entry.wodId).name}</small>
                        )}
                      </div>
                      <div className="score">{entry.score}</div>
                    </div>
                  ))
                ) : (
                  <p className="no-scores">No scores available yet</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="cta-section">
        <h2>🏆 Ready to Compete?</h2>
        <p>Sign in to register for this event and submit your scores</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Sign In to Compete
        </button>
      </div>

      <style>{`
        .public-event-detail {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 40px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .back-btn {
          background: white;
          border: 2px solid #FF5722;
          color: #FF5722;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 30px;
        }
        .back-btn:hover {
          background: #FF5722;
          color: white;
        }
        .event-header {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        .event-header h1 {
          margin: 0 0 20px 0;
          font-size: 36px;
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .event-meta {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          font-size: 16px;
          color: #6c757d;
        }
        .event-description {
          color: #495057;
          line-height: 1.8;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .schedule-toggle-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .schedule-toggle-btn:hover {
          background: #0056b3;
        }
        .schedule-section {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #FF5722;
          padding-bottom: 10px;
        }
        .schedule-section h2 {
          margin: 0;
          color: #2c3e50;
        }
        .schedule-collapse-btn {
          background: transparent;
          border: 1px solid #FF5722;
          color: #FF5722;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .schedule-collapse-btn:hover {
          background: #FF5722;
          color: white;
        }
        .schedule-card h3 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }
        .schedule-mode {
          color: #6c757d;
          font-size: 14px;
          margin: 0 0 20px 0;
        }
        .day-schedule {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .day-schedule h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 8px;
        }
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .session-item {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #FF5722;
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .session-time {
          min-width: 100px;
          color: #FF5722;
          font-weight: 600;
        }
        .session-details {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .session-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .session-wod {
          font-weight: 600;
          color: #2c3e50;
        }
        .session-category {
          color: #6c757d;
          font-size: 13px;
        }
        .session-athletes, .session-heats {
          background: #e7f3ff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          color: #004085;
        }
        .no-sessions {
          text-align: center;
          color: #6c757d;
          padding: 20px;
          font-style: italic;
        }
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        @media (max-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
        .categories-section, .wods-section, .scores-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .categories-section h2, .wods-section h2, .scores-section h2 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          border-bottom: 2px solid #FF5722;
          padding-bottom: 10px;
        }
        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .category-card {
          padding: 15px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .category-card:hover {
          border-color: #FF5722;
        }
        .category-card.selected {
          border-color: #FF5722;
          background: #fff5f2;
        }
        .category-card h3 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 16px;
        }
        .category-card p {
          margin: 0 0 10px 0;
          color: #6c757d;
          font-size: 14px;
        }
        .category-meta {
          display: flex;
          gap: 10px;
          font-size: 12px;
          color: #6c757d;
        }
        .wods-filter {
          margin-bottom: 20px;
        }
        .wods-filter select {
          width: 100%;
          padding: 10px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
        }
        .wods-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .wod-card {
          padding: 15px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
        }
        .wod-card h3 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 16px;
        }
        .wod-card p {
          margin: 0 0 10px 0;
          color: #6c757d;
          font-size: 14px;
        }
        .wod-meta {
          display: flex;
          gap: 10px;
          font-size: 12px;
          color: #6c757d;
        }
        .leaderboard-notice {
          text-align: center;
          padding: 40px 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .leaderboard-notice p {
          margin: 0 0 10px 0;
          color: #6c757d;
        }
        .leaderboard-notice .small-text {
          font-size: 13px;
        }
        .category-filter {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 14px;
          color: #495057;
        }
        .leaderboard {
          max-height: 500px;
          overflow-y: auto;
        }
        .score-entry {
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #e9ecef;
        }
        .rank {
          font-weight: bold;
          color: #FF5722;
          width: 40px;
        }
        .athlete-info {
          flex: 1;
          margin-left: 15px;
        }
        .athlete-info small {
          display: block;
          color: #6c757d;
          font-size: 12px;
        }
        .score {
          font-weight: bold;
          color: #2c3e50;
        }
        .no-scores, .no-data {
          text-align: center;
          color: #6c757d;
          padding: 30px;
        }
        .cta-section {
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          padding: 60px 40px;
          border-radius: 16px;
          text-align: center;
          color: white;
          box-shadow: 0 8px 24px rgba(255, 87, 34, 0.3);
        }
        .cta-section h2 {
          margin: 0 0 16px 0;
          font-size: 32px;
        }
        .cta-section p {
          margin: 0 0 32px 0;
          font-size: 18px;
          opacity: 0.95;
        }
        .btn-primary {
          background: white;
          color: #FF5722;
          border: none;
          padding: 16px 40px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        .signin-link {
          text-decoration: underline;
          cursor: pointer;
          font-weight: 600;
        }
        .signin-link:hover {
          opacity: 0.8;
        }
        .status-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.active {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
        }
        .status-badge.upcoming {
          background: linear-gradient(135deg, #fff3cd, #ffeaa7);
          color: #856404;
        }
        .status-badge.completed {
          background: linear-gradient(135deg, #e2e3e5, #d6d8db);
          color: #383d41;
        }
        .loading {
          text-align: center;
          padding: 60px;
        }
      `}</style>
    </div>
  );
}

export default PublicEventDetail;
