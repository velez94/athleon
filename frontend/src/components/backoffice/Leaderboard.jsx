import React, { useState, useEffect } from 'react';
import { get } from '../../lib/api';
import { useOrganization } from '../../contexts/OrganizationContext';
import ScoreBreakdown from '../athlete/ScoreBreakdown';
import ScoreDetails from '../athlete/ScoreDetails';
import LoadingSpinner from '../common/Loading/LoadingSpinner';
import './Backoffice.css';

function Leaderboard() {
  const { selectedOrganization } = useOrganization();
  const [view, setView] = useState('wod'); // 'wod' or 'general'
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wods, setWods] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedWod, setSelectedWod] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedScore, setExpandedScore] = useState(null);

  useEffect(() => {
    if (selectedOrganization) {
      fetchEvents();
    }
    fetchCategories();
  }, [selectedOrganization]);

  useEffect(() => {
    if (selectedEvent) {
      fetchWods();
      fetchScores();
      fetchAthletes();
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (selectedEvent && (selectedWod || view === 'general')) {
      fetchScores();
    }
  }, [selectedWod, selectedCategory]);

  const fetchEvents = async () => {
    if (!selectedOrganization) return;
    try {
      const response = await get('/competitions', {
        queryStringParameters: { organizationId: selectedOrganization.organizationId }
      });
      setEvents(response || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await get('/categories');
      setCategories(response || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAthletes = async () => {
    try {
      if (!selectedEvent) return;
      
      const response = await get(`/athletes?eventId=${selectedEvent.eventId}`);
      setAthletes(response || []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  const fetchWods = async () => {
    try {
      const response = await get(`/wods?eventId=${selectedEvent.eventId}`);
      setWods(response || []);
    } catch (error) {
      console.error('Error fetching WODs:', error);
    }
  };

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await get(`/public/scores?eventId=${selectedEvent.eventId}`);
      setScores(response || []);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse time string to seconds for comparison
  const parseTimeToSeconds = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  };

  // Helper function to check if a score is time-based
  const isTimeBasedScore = (score) => {
    return score.breakdown && score.breakdown.allCompleted !== undefined;
  };

  const getWodLeaderboard = () => {
    if (!selectedWod) return [];
    
    let filtered = scores.filter(s => s.wodId === selectedWod.wodId);
    if (selectedCategory) {
      filtered = filtered.filter(s => s.categoryId === selectedCategory);
    }
    
    // Check if any score is time-based to determine sorting strategy
    const hasTimeBasedScores = filtered.some(isTimeBasedScore);
    
    if (hasTimeBasedScores) {
      // Time-based ranking: completed first (by time), then incomplete (by exercises then reps)
      const completed = filtered.filter(s => s.breakdown?.allCompleted === true);
      const incomplete = filtered.filter(s => s.breakdown?.allCompleted !== true);
      
      // Sort completed by time (ascending - faster is better)
      completed.sort((a, b) => {
        const timeA = parseTimeToSeconds(a.breakdown?.completionTime);
        const timeB = parseTimeToSeconds(b.breakdown?.completionTime);
        return timeA - timeB;
      });
      
      // Sort incomplete by completed exercises (descending), then total reps (descending)
      incomplete.sort((a, b) => {
        const completedDiff = (b.breakdown?.completedExercises || 0) - (a.breakdown?.completedExercises || 0);
        if (completedDiff !== 0) return completedDiff;
        return (b.breakdown?.totalReps || 0) - (a.breakdown?.totalReps || 0);
      });
      
      return [...completed, ...incomplete];
    }
    
    // Default sorting for non-time-based scores
    return filtered.sort((a, b) => b.score - a.score);
  };

  const getGeneralLeaderboard = () => {
    const athletePoints = {};
    
    const filtered = selectedCategory 
      ? scores.filter(s => s.categoryId === selectedCategory)
      : scores;

    const byWod = {};
    filtered.forEach(score => {
      if (!byWod[score.wodId]) byWod[score.wodId] = [];
      byWod[score.wodId].push(score);
    });

    Object.values(byWod).forEach(wodScores => {
      const sorted = wodScores.sort((a, b) => b.score - a.score);
      sorted.forEach((score, idx) => {
        const points = score.score; // Use actual score instead of ranking-based points
        if (!athletePoints[score.athleteId]) {
          athletePoints[score.athleteId] = {
            athleteId: score.athleteId,
            categoryId: score.categoryId,
            totalPoints: 0,
            wodResults: []
          };
        }
        athletePoints[score.athleteId].totalPoints += points;
        const wod = wods.find(w => w.wodId === score.wodId);
        athletePoints[score.athleteId].wodResults.push({
          wodName: wod?.name || score.wodId,
          position: idx + 1,
          points,
          score: score.score
        });
      });
    });

    return Object.values(athletePoints)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((a, idx) => ({ ...a, rank: idx + 1 }));
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  const getAthleteName = (athleteId) => {
    const athlete = athletes.find(a => 
      a.athleteId === athleteId || 
      a.userId === athleteId || 
      a.email === athleteId
    );
    if (athlete) {
      return `${athlete.firstName} ${athlete.lastName}`;
    }
    return athleteId;
  };

  const leaderboard = view === 'wod' ? getWodLeaderboard() : getGeneralLeaderboard();

  return (
    <div className="leaderboard">
      <h1>Leaderboard</h1>

      <div className="view-tabs">
        <button 
          className={view === 'wod' ? 'active' : ''} 
          onClick={() => setView('wod')}
        >
          WOD Leaderboard
        </button>
        <button 
          className={view === 'general' ? 'active' : ''} 
          onClick={() => setView('general')}
        >
          General Leaderboard
        </button>
      </div>

      <div className="filters">
        <div className="form-group">
          <label>Event</label>
          <select 
            value={selectedEvent?.eventId || ''} 
            onChange={(e) => {
              const event = events.find(ev => ev.eventId === e.target.value);
              setSelectedEvent(event);
              setSelectedWod(null);
            }}
          >
            <option value="">Select Event</option>
            {events.map(event => (
              <option key={event.eventId} value={event.eventId}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {view === 'wod' && selectedEvent && (
          <div className="form-group">
            <label>WOD</label>
            <select 
              value={selectedWod?.wodId || ''} 
              onChange={(e) => {
                const wod = wods.find(w => w.wodId === e.target.value);
                setSelectedWod(wod);
              }}
            >
              <option value="">Select WOD</option>
              {wods.map(wod => (
                <option key={wod.wodId} value={wod.wodId}>
                  {wod.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Category</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="md" message="Loading leaderboard..." variant="bars" />
      ) : leaderboard.length === 0 ? (
        <div className="no-data">No scores available</div>
      ) : (
        <div className="leaderboard-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Athlete</th>
                <th>Category</th>
                {view === 'wod' ? (
                  <>
                    <th>Score</th>
                    <th>Actions</th>
                  </>
                ) : (
                  <>
                    <th>Total Points</th>
                    <th>WOD Results</th>
                    <th>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => {
                const rank = view === 'wod' ? idx + 1 : entry.rank;
                const category = categories.find(c => c.categoryId === entry.categoryId);
                const isExpanded = expandedScore === entry.athleteId;
                const isTimeBased = isTimeBasedScore(entry);
                
                return (
                  <React.Fragment key={entry.athleteId}>
                    <tr className={getRankClass(rank)}>
                      <td className="rank-cell">
                        <span className={`rank-badge ${getRankClass(rank)}`}>
                          #{rank}
                        </span>
                      </td>
                      <td className="athlete-cell">
                        {getAthleteName(entry.athleteId)}
                        {entry.breakdown && <span style={{marginLeft: '8px', fontSize: '12px'}}>📊</span>}
                      </td>
                      <td>{category?.name || 'N/A'}</td>
                      {view === 'wod' ? (
                        <td className="score-cell">
                          {isTimeBased ? (
                            // Time-based score display
                            entry.breakdown?.allCompleted ? (
                              <span className="time-based-score completed">
                                <span className="clock-icon">⏱️</span>
                                <span className="time-value">{entry.breakdown.completionTime}</span>
                              </span>
                            ) : (
                              <span className="time-based-score incomplete">
                                <span className="reps-value">{entry.breakdown?.totalReps || 0} reps</span>
                                <span className="exercises-info">
                                  ({entry.breakdown?.completedExercises || 0}/{entry.breakdown?.totalExercises || 0} exercises)
                                </span>
                              </span>
                            )
                          ) : (
                            // Regular score display
                            entry.score
                          )}
                        </td>
                      ) : (
                        <>
                          <td className="points-cell">{entry.totalPoints}</td>
                          <td className="results-cell">
                            {entry.wodResults.map((r, i) => (
                              <div key={i} className="wod-result">
                                <span>{r.wodName}</span>
                                <span>#{r.position} ({r.points}pts)</span>
                              </div>
                            ))}
                          </td>
                        </>
                      )}
                      <td className="actions-cell">
                        {entry.breakdown && (
                          <button 
                            className="view-details-btn"
                            onClick={() => setExpandedScore(isExpanded ? null : entry.athleteId)}
                            aria-label={isExpanded ? 'Hide details' : 'View details'}
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && entry.breakdown && (
                      <tr className="expanded-row">
                        <td colSpan={view === 'wod' ? 5 : 6} style={{padding: '15px', background: '#f8f9fa'}}>
                          {isTimeBased ? (
                            <ScoreDetails score={entry} />
                          ) : (
                            <ScoreBreakdown score={entry} />
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .leaderboard {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .leaderboard h1 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 28px;
          font-weight: 600;
        }
        .view-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 25px;
          background: white;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          width: fit-content;
        }
        .view-tabs button {
          padding: 12px 24px;
          border: none;
          background: transparent;
          color: #6c757d;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          position: relative;
        }
        .view-tabs button:hover {
          color: #495057;
          background: #f8f9fa;
        }
        .view-tabs button.active {
          background: #007bff;
          color: white;
          box-shadow: 0 2px 8px rgba(0,123,255,0.3);
        }
        .filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #495057;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e9ecef;
          border-radius: 6px;
          font-size: 14px;
          color: #495057;
          background: white;
          transition: all 0.2s;
          cursor: pointer;
        }
        .form-group select:hover {
          border-color: #ced4da;
        }
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }
        .loading, .no-data {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          color: #6c757d;
          font-size: 15px;
        }
        .leaderboard-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          padding: 16px;
          text-align: left;
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          color: white;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: none;
        }
        td {
          padding: 16px;
          border-bottom: 1px solid #f1f3f5;
        }
        tbody tr {
          transition: all 0.2s;
        }
        tbody tr:hover {
          background: #f8f9fa;
          transform: scale(1.01);
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          border-radius: 50%;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .rank-badge.gold {
          background: linear-gradient(135deg, #ffd700, #ffed4e);
          color: #b8860b;
        }
        .rank-badge.silver {
          background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
          color: #696969;
        }
        .rank-badge.bronze {
          background: linear-gradient(135deg, #cd7f32, #daa520);
          color: #8b4513;
        }
        .rank-badge {
          background: #e9ecef;
          color: #495057;
        }
        tr.gold {
          background: linear-gradient(90deg, rgba(255,215,0,0.08), transparent);
        }
        tr.silver {
          background: linear-gradient(90deg, rgba(192,192,192,0.08), transparent);
        }
        tr.bronze {
          background: linear-gradient(90deg, rgba(205,127,50,0.08), transparent);
        }
        .athlete-cell {
          font-weight: 600;
          color: #2c3e50;
          font-size: 15px;
        }
        .score-cell, .points-cell {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .results-cell {
          max-width: 400px;
        }
        .wod-result {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border-radius: 6px;
          margin-bottom: 6px;
          font-size: 13px;
          border-left: 3px solid #007bff;
        }
        .wod-result span:first-child {
          font-weight: 600;
          color: #495057;
        }
        .wod-result span:last-child {
          color: #6c757d;
          font-weight: 500;
        }
        .time-based-score {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
        }
        .time-based-score.completed {
          color: #28a745;
          font-weight: 700;
        }
        .time-based-score.incomplete {
          color: #6c757d;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .clock-icon {
          font-size: 18px;
        }
        .time-value {
          font-size: 20px;
          font-weight: 700;
        }
        .reps-value {
          font-size: 18px;
          font-weight: 700;
          color: #495057;
        }
        .exercises-info {
          font-size: 13px;
          color: #6c757d;
          font-weight: 500;
        }
        .actions-cell {
          text-align: center;
        }
        .view-details-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,123,255,0.2);
        }
        .view-details-btn:hover {
          background: linear-gradient(135deg, #0056b3, #004085);
          box-shadow: 0 4px 8px rgba(0,123,255,0.3);
          transform: translateY(-1px);
        }
        .view-details-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,123,255,0.2);
        }
        .expanded-row {
          background: #f8f9fa !important;
        }
        .expanded-row:hover {
          background: #f8f9fa !important;
          transform: none !important;
        }
        @media (max-width: 768px) {
          .leaderboard {
            padding: 15px;
          }
          .view-tabs {
            width: 100%;
          }
          .view-tabs button {
            flex: 1;
            padding: 10px 16px;
            font-size: 13px;
          }
          .filters {
            grid-template-columns: 1fr;
            gap: 15px;
            padding: 15px;
          }
          .leaderboard-table {
            overflow-x: auto;
          }
          table {
            min-width: 700px;
          }
          th, td {
            padding: 12px 8px;
            font-size: 13px;
          }
          .rank-badge {
            min-width: 32px;
            height: 32px;
            font-size: 14px;
          }
          .score-cell, .points-cell {
            font-size: 16px;
          }
          .view-details-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
          .time-based-score {
            font-size: 14px;
          }
          .time-value {
            font-size: 16px;
          }
          .reps-value {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default Leaderboard;
