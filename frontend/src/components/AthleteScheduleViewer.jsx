import { useState, useEffect } from 'react';
import { get, post, put, del } from '../lib/api';
import { getCurrentUser } from 'aws-amplify/auth';
import './AthleteScheduleViewer.css';
import LoadingSpinner from './common/Loading/LoadingSpinner';


const AthleteScheduleViewer = ({ eventId }) => {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'mine'
  const [athleteSearch, setAthleteSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
     
  }, []);

  useEffect(() => {
    if (eventId && currentUser) {
      loadPublishedSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, currentUser]);

  const loadPublishedSchedules = async () => {
    setLoading(true);
    try {
      // Use the scheduler endpoint to get all schedules, then filter for published ones
      const response = await get(`/scheduler/${eventId}`);
      const allSchedules = Array.isArray(response) ? response : (response ? [response] : []);
      const publishedSchedules = allSchedules.filter(schedule => schedule.published === true);
      
      setSchedules(publishedSchedules);
      
      if (publishedSchedules.length > 0) {
        setSelectedSchedule(publishedSchedules[0]);
      }
    } catch (error) {
      console.error('Error loading published schedules:', error);
      // Fallback to empty schedules
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const isMyMatch = (session) => {
    if (!currentUser) return false;
    
    const userId = currentUser.username;
    const userEmail = currentUser.signInDetails?.loginId || currentUser.attributes?.email;
    if (!userId) return false;

    // Check if user is in athlete schedule (for HEATS mode)
    const inAthleteSchedule = session.athleteSchedule?.some(athlete => 
      athlete.athleteId === userId || athlete.athleteId === userEmail
    );
    
    // Check if user is in matches (for VERSUS mode)
    // Important: Only check athlete2 if it exists (not a BYE match)
    const inMatches = session.matches?.some(match => {
      const isAthlete1 = match.athlete1?.userId === userId || match.athlete1?.userId === userEmail;
      const isAthlete2 = match.athlete2 && (match.athlete2.userId === userId || match.athlete2.userId === userEmail);
      return isAthlete1 || isAthlete2;
    });

    return inAthleteSchedule || inMatches;
  };

  const getFilteredSessions = (day) => {
    let sessions = day.sessions || [];
    
    // Filter by mode (all or mine)
    if (filterMode === 'mine') {
      sessions = sessions.filter(session => isMyMatch(session));
    }
    
    // Filter by category
    if (categoryFilter) {
      sessions = sessions.filter(session => 
        session.categoryId === categoryFilter || session.categoryName === categoryFilter
      );
    }
    
    // Filter by athlete search
    if (athleteSearch.trim()) {
      const searchLower = athleteSearch.toLowerCase();
      sessions = sessions.filter(session => {
        // Search in athlete schedule
        const inAthleteSchedule = session.athleteSchedule?.some(athlete =>
          athlete.athleteName?.toLowerCase().includes(searchLower) ||
          athlete.athleteId?.toLowerCase().includes(searchLower)
        );
        
        // Search in matches
        const inMatches = session.matches?.some(match =>
          match.athlete1?.name?.toLowerCase().includes(searchLower) ||
          match.athlete1?.userId?.toLowerCase().includes(searchLower) ||
          (match.athlete2 && (
            match.athlete2.name?.toLowerCase().includes(searchLower) ||
            match.athlete2.userId?.toLowerCase().includes(searchLower)
          ))
        );
        
        return inAthleteSchedule || inMatches;
      });
    }
    
    return sessions;
  };

  const highlightMyMatches = (session) => {
    return isMyMatch(session) ? 'my-match' : '';
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading schedules..." variant="dots" />;
  }

  if (!schedules.length) {
    return (
      <div className="no-schedules-card">
        <div className="no-schedules-icon">📅</div>
        <h3>No Published Schedules</h3>
        <p>The organizers haven't published any schedules for this event yet.</p>
        <p className="check-back">Check back later for updates!</p>
      </div>
    );
  }

  return (
    <div className="athlete-schedule-viewer">
      {schedules.length > 1 && (
        <div className="schedule-selector-card">
          <label htmlFor="schedule-select">📋 Select Schedule:</label>
          <select 
            id="schedule-select"
            value={selectedSchedule?.scheduleId || ''} 
            onChange={(e) => {
              const schedule = schedules.find(s => s.scheduleId === e.target.value);
              setSelectedSchedule(schedule);
            }}
            className="schedule-select"
          >
            {schedules.map(schedule => (
              <option key={schedule.scheduleId} value={schedule.scheduleId}>
                Schedule {schedule.scheduleId.slice(-8)} - {schedule.config?.competitionMode || 'HEATS'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-controls">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            🏆 All Matches
          </button>
          <button 
            className={`filter-btn ${filterMode === 'mine' ? 'active' : ''}`}
            onClick={() => setFilterMode('mine')}
          >
            👤 My Matches
          </button>
        </div>
        
        <div className="search-filters">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="🔍 Search athlete..."
              value={athleteSearch}
              onChange={(e) => setAthleteSearch(e.target.value)}
              className="search-input"
            />
            {athleteSearch && (
              <button 
                className="clear-btn" 
                onClick={() => setAthleteSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="category-filter-group">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="category-select"
            >
              <option value="">All Categories</option>
              {selectedSchedule && [...new Set(
                selectedSchedule.days?.flatMap(day => 
                  day.sessions?.map(s => s.categoryName || s.categoryId) || []
                ) || []
              )].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedSchedule && (
        <div className="schedule-display-card">
          <div className="schedule-header-info">
            <div className="schedule-title">
              <h2>🏁 Competition Schedule</h2>
              <span className="schedule-mode">{selectedSchedule.config?.competitionMode || 'HEATS'}</span>
            </div>
            <div className="schedule-meta">
              <div className="meta-item">
                <span className="meta-label">⏰ Start Time:</span>
                <span className="meta-value">{selectedSchedule.config?.startTime} ({selectedSchedule.config?.timezone})</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">📅 Days:</span>
                <span className="meta-value">{selectedSchedule.days?.length || 0}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">⏱️ Duration:</span>
                <span className="meta-value">{selectedSchedule.totalDuration?.toFixed(1)} hours</span>
              </div>
            </div>
          </div>

          {selectedSchedule.days?.map(day => {
            const filteredSessions = getFilteredSessions(day);
            
            if (filteredSessions.length === 0 && filterMode === 'mine') {
              return null;
            }

            return (
              <div key={day.dayId} className="day-schedule-card">
                <div className="day-header">
                  <h3>📆 {day.name || `Day ${day.dayId}`}</h3>
                  <span className="day-date">
                    {day.date ? new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Date TBD'}
                  </span>
                </div>
                
                {filteredSessions.map(session => (
                  <div key={session.sessionId} className={`session-card ${highlightMyMatches(session)}`}>
                    <div className="session-header">
                      <div className="session-info">
                        <h4 className="category-name">🏷️ {session.categoryName || session.categoryId}</h4>
                        <div className="session-badges">
                          <span className="session-mode-badge">{session.competitionMode || 'HEATS'}</span>
                          {isMyMatch(session) && <span className="my-match-badge">MY MATCH</span>}
                        </div>
                      </div>
                      <div className="session-timing">
                        <div className="time-display">
                          <span className="start-time">🕐 {session.startTime}</span>
                          <span className="duration">({session.duration}min)</span>
                        </div>
                      </div>
                    </div>

                    {session.competitionMode === 'VERSUS' && session.matches && (
                      <div className="matches-section">
                        <h5 className="section-title">⚔️ Matches</h5>
                        <div className="matches-grid">
                          {session.matches.map(match => (
                            <div key={match.matchId} className="match-card">
                              <div className="match-header">
                                <span className="heat-number">Heat {match.heatNumber || 1}</span>
                              </div>
                              <div className="vs-container">
                                <div className="athlete-card athlete-1">
                                  <span className="athlete-name">
                                    {match.athlete1?.firstName} {match.athlete1?.lastName}
                                  </span>
                                </div>
                                <div className="vs-divider">
                                  <span className="vs-text">VS</span>
                                </div>
                                {match.athlete2 ? (
                                  <div className="athlete-card athlete-2">
                                    <span className="athlete-name">
                                      {match.athlete2.firstName} {match.athlete2.lastName}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="bye-card">
                                    <span className="bye-text">BYE</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {session.athleteSchedule && session.athleteSchedule.length > 0 && (
                      <div className="athletes-section">
                        {(() => {
                          const currentUserAthlete = session.athleteSchedule.find(athlete => 
                            athlete.athleteId === currentUser?.username
                          );
                          
                          // If user is not in this heat, show general heat info
                          if (!currentUserAthlete) {
                            return (
                              <div>
                                <h5 className="section-title">👥 Athletes ({session.athleteSchedule.length})</h5>
                                <div className="general-heat-info">
                                  {session.athleteSchedule.slice(0, 8).map((athlete, index) => (
                                    <div key={athlete.athleteId || index} className="athlete-name-simple">
                                      {athlete.athleteName}
                                    </div>
                                  ))}
                                  {session.athleteSchedule.length > 8 && (
                                    <div className="more-athletes">
                                      +{session.athleteSchedule.length - 8} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // User is in this heat - show detailed info
                          return (
                            <div>
                              <h5 className="section-title">👥 Your Heat</h5>
                              <div className="my-heat-info">
                                {(() => {
                                  // For VERSUS mode, show the specific match
                                  if (session.competitionMode === 'VERSUS' && session.matches) {
                                    const userMatch = session.matches.find(match => 
                                      match.athlete1?.userId === currentUser?.username || 
                                      match.athlete2?.userId === currentUser?.username
                                    );
                                    
                                    if (userMatch) {
                                      const opponent = userMatch.athlete1?.userId === currentUser?.username 
                                        ? userMatch.athlete2 
                                        : userMatch.athlete1;
                                      
                                      return (
                                        <div className="versus-heat">
                                          <div className="heat-time">🕐 {currentUserAthlete.startTime}</div>
                                          <div className="versus-matchup">
                                            <span className="you">You</span>
                                            <span className="vs">VS</span>
                                            <span className="opponent">
                                              {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'BYE'}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  }

                                  // For HEATS mode, show heat competitors
                                  if (session.competitionMode === 'HEATS') {
                                    const heatNumber = currentUserAthlete.heatNumber;
                                    const heatCompetitors = session.athleteSchedule.filter(athlete => 
                                      athlete.heatNumber === heatNumber
                                    );
                                    
                                    return (
                                      <div className="heat-competitors">
                                        <div className="heat-info">
                                          <span className="heat-time">🕐 {currentUserAthlete.startTime}</span>
                                          <span className="heat-number">Heat {heatNumber}</span>
                                        </div>
                                        <div className="competitors-list">
                                          <h6>Your competitors:</h6>
                                          {heatCompetitors.map((athlete, index) => {
                                            const isYou = athlete.athleteId === currentUser?.username;
                                            return (
                                              <div key={athlete.athleteId} className={`competitor ${isYou ? 'you' : ''}`}>
                                                <span className="lane">Lane {athlete.lane || index + 1}:</span>
                                                <span className="name">
                                                  {athlete.athleteName}
                                                  {isYou && ' (You)'}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Fallback for other modes
                                  return (
                                    <div className="simple-heat">
                                      <div className="heat-time">🕐 {currentUserAthlete.startTime}</div>
                                      <div className="heat-note">
                                        You're scheduled for this session with {session.athleteSchedule.length - 1} other athletes
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {filterMode === 'mine' && selectedSchedule.days?.every(day => getFilteredSessions(day).length === 0) && (
            <div className="no-matches-card">
              <div className="no-matches-icon">🤷‍♂️</div>
              <h3>No Matches Found</h3>
              <p>You don't have any matches in this schedule.</p>
              <p>Make sure you're registered for this event!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AthleteScheduleViewer;
