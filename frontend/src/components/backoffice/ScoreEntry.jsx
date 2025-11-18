import { useState, useEffect } from 'react';
import { get, post } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';

function ScoreEntry({ user: _user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [wods, setWods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [entryMode, setEntryMode] = useState('wod');
  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedWod, setSelectedWod] = useState(null);
  const [athletePerformance, setAthletePerformance] = useState([]);
  const [rank, setRank] = useState(1);
  
  // Scoring system state
  const [scoringSystem, setScoringSystem] = useState(null);
  
  // Time-based scoring state
  const [exerciseCompletionStatus, setExerciseCompletionStatus] = useState([]);
  const [completionTime, setCompletionTime] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Global advanced scoring system (fallback)
  const globalScoringSystem = {
    type: 'advanced',
    config: {
      timeBonuses: { 1: 10, 2: 7, 3: 5 }
    }
  };
  
  const [scoreData, setScoreData] = useState({
    athleteId: '',
    wodId: '',
    categoryId: '',
    score: '',
    scheduleId: '',
    sessionId: '',
    competitionMode: 'HEATS',
    scoreType: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (eventId && events.length > 0) {
      const event = events.find(e => e.eventId === eventId);
      if (event) {
        setSelectedEvent(event);
      }
    }
  }, [eventId, events]);

  useEffect(() => {
    const filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [events, searchTerm]);

  useEffect(() => {
    if (selectedEvent) {
      fetchWods(selectedEvent.eventId);
      fetchPublishedSchedules();
      fetchAthletes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    if (scoreData.wodId) {
      const wod = wods.find(w => w.wodId === scoreData.wodId);
      setSelectedWod(wod);
      if (wod?.movements) {
        setAthletePerformance(wod.movements.map(m => ({
          exerciseId: m.exerciseId,
          exercise: m.exercise,
          reps: '',
          weight: '',
          eqs: 5
        })));
      }
      
      // Fetch scoring system for this WOD
      fetchScoringSystem(wod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [scoreData.wodId, wods]);

  // Initialize exercise completion status when scoring system changes to time-based
  useEffect(() => {
    if (selectedWod?.movements && scoringSystem?.type === 'time-based') {
      setExerciseCompletionStatus(selectedWod.movements.map(m => ({
        exerciseId: m.exerciseId,
        exerciseName: m.exercise,
        targetReps: m.reps,
        completed: false,
        maxReps: ''
      })));
    } else if (scoringSystem?.type !== 'time-based') {
      // Clear time-based state when switching away from time-based scoring
      setExerciseCompletionStatus([]);
      setCompletionTime('');
      setValidationErrors([]);
    }
  }, [selectedWod, scoringSystem]);

  const fetchExercises = async () => {
    try {
      const response = await get('/exercises');
      setExercises(response || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const fetchScoringSystem = async (wod) => {
    try {
      if (!wod || !wod.scoringSystemId) {
        // Fallback to global advanced scoring system
        setScoringSystem(globalScoringSystem);
        return;
      }
      
      const response = await get(`/scoring-systems/${wod.scoringSystemId}`);
      setScoringSystem(response || globalScoringSystem);
    } catch (error) {
      console.error('Error fetching scoring system:', error);
      setScoringSystem(globalScoringSystem);
    }
  };

  const parseTimeToSeconds = (timeString) => {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  };

  const formatSecondsToTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const validateTimeBasedScore = () => {
    const errors = [];
    
    // Validate all exercises have completion status
    if (exerciseCompletionStatus.some(ex => typeof ex.completed !== 'boolean')) {
      errors.push('All exercises must have completion status');
    }
    
    // Validate incomplete exercises have maxReps
    const incompleteExercises = exerciseCompletionStatus.filter(ex => !ex.completed);
    incompleteExercises.forEach(ex => {
      if (!ex.maxReps && ex.maxReps !== 0) {
        errors.push(`${ex.exerciseName}: Max reps required for incomplete exercise`);
      }
      if (ex.maxReps && parseInt(ex.maxReps) > parseInt(ex.targetReps)) {
        errors.push(`${ex.exerciseName}: Max reps cannot exceed target reps (${ex.targetReps})`);
      }
    });
    
    // Validate completion time is provided
    if (!completionTime) {
      errors.push('Completion time is required');
    }
    
    // Validate completion time format
    if (completionTime && !/^\d{1,2}:\d{2}$/.test(completionTime)) {
      errors.push('Completion time must be in mm:ss format (e.g., 10:00)');
    }
    
    // Validate completion time doesn't exceed time cap (from WOD, not scoring system)
    if (completionTime && selectedWod?.timeCap) {
      const completionSeconds = parseTimeToSeconds(completionTime);
      const capSeconds = parseTimeToSeconds(
        `${selectedWod.timeCap.minutes}:${String(selectedWod.timeCap.seconds).padStart(2, '0')}`
      );
      if (completionSeconds > capSeconds) {
        errors.push(`Completion time cannot exceed time cap (${selectedWod.timeCap.minutes}:${String(selectedWod.timeCap.seconds).padStart(2, '0')})`);
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const calculateScore = () => {
    if (!selectedWod || !athletePerformance.length || !exercises.length) {
      return null;
    }

    let totalEDS = 0;
    
    athletePerformance.forEach(perf => {
      const exercise = exercises.find(e => 
        e.exerciseId === perf.exerciseId || 
        e.name.toLowerCase() === perf.exercise?.toLowerCase()
      );
      
      if (!exercise || !perf.reps) return;

      const reps = parseInt(perf.reps) || 0;
      const weight = parseFloat(perf.weight?.replace(/[^\d.]/g, '')) || 0;
      const eqs = parseInt(perf.eqs) || 5;
      
      let eds = exercise.baseScore * reps;
      
      exercise.modifiers?.forEach(mod => {
        if (mod.type === 'weight' && weight > 0) {
          eds += Math.floor(weight / mod.increment) * mod.points * reps;
        }
      });
      
      totalEDS += eds * eqs;
    });

    const timeBonus = (scoringSystem || globalScoringSystem).config?.timeBonuses?.[rank] || 0;
    return totalEDS + timeBonus;
  };

  useEffect(() => {
    if (selectedEvent) {
      console.log('Fetching scores for:', { eventId: selectedEvent.eventId, wodId: scoreData.wodId, categoryId: scoreData.categoryId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchScores();
    }
  }, [selectedEvent?.eventId, scoreData.wodId, scoreData.categoryId]);

  const fetchEvents = async () => {
    try {
      const response = await get('/public/events');
      setEvents(response);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchWods = async (eventId) => {
    try {
      console.log('Fetching WODs for eventId:', eventId);
      
      // Try both approaches: event record wods field AND separate WODs query
      const eventResponse = await get(`/competitions/${eventId}`);
      const eventWods = eventResponse.wods || eventResponse.workouts || [];
      
      const linkedWods = await get(`/wods?eventId=${eventId}`);
      
      // Combine both sources and deduplicate by wodId
      const allWods = [...eventWods, ...(linkedWods || [])];
      const uniqueWods = allWods.reduce((acc, wod) => {
        if (!acc.find(w => w.wodId === wod.wodId)) {
          acc.push(wod);
        }
        return acc;
      }, []);
      
      console.log('WODs response:', uniqueWods);
      setWods(uniqueWods);
    } catch (error) {
      console.error('Error fetching WODs:', error);
      setWods([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await get('/categories');
      setCategories(response);
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

  const fetchScores = async () => {
    try {
      if (!selectedEvent) return;
      
      console.log('Fetching scores from API...');
      const response = await get(`/scores?eventId=${selectedEvent.eventId}`);
      console.log('All scores response:', response);
      
      // Only filter if both wodId and categoryId are selected
      if (scoreData.wodId && scoreData.categoryId) {
        console.log('Filtering with:', { wodId: scoreData.wodId, categoryId: scoreData.categoryId });
        const filteredScores = response.filter(score => {
          console.log('Comparing score:', { scoreWodId: score.wodId, scoreCategoryId: score.categoryId });
          return score.wodId === scoreData.wodId && score.categoryId === scoreData.categoryId;
        });
        console.log('Filtered scores:', filteredScores);
        setScores(filteredScores);
      } else {
        // Show all scores if no filters are applied
        console.log('No filters applied, showing all scores');
        setScores(response || []);
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
      setScores([]); // Set empty array on error
    }
  };

  const fetchPublishedSchedules = async () => {
    try {
      console.log('Fetching published schedules for eventId:', selectedEvent.eventId);
      const response = await get(`/scheduler/${selectedEvent.eventId}`);
      console.log('Schedules response:', response);
      const schedules = Array.isArray(response) ? response.filter(s => s.published) : [];
      
      // Get detailed schedule data for each published schedule
      const detailedSchedules = [];
      for (const schedule of schedules) {
        try {
          const details = await get(`/scheduler/${selectedEvent.eventId}/${schedule.scheduleId}`);
          console.log('Schedule details:', details);
          detailedSchedules.push(details);
        } catch (error) {
          console.error('Error fetching schedule details:', error);
          detailedSchedules.push(schedule); // Fallback to basic schedule
        }
      }
      
      setPublishedSchedules(detailedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setPublishedSchedules([]);
    }
  };

  const submitScore = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setValidationErrors([]);

    try {
      // Validate time-based scoring if applicable
      if (scoringSystem?.type === 'time-based') {
        if (!validateTimeBasedScore()) {
          setSubmitting(false);
          return;
        }
      }
      
      const calculatedScore = calculateScore();
      
      let scorePayload;
      
      if (scoringSystem?.type === 'time-based') {
        // Time-based scoring payload
        const allCompleted = exerciseCompletionStatus.every(ex => ex.completed);
        // Get time cap from WOD record (not scoring system config)
        const timeCap = selectedWod?.timeCap 
          ? `${selectedWod.timeCap.minutes}:${String(selectedWod.timeCap.seconds).padStart(2, '0')}`
          : '10:00';
        
        scorePayload = {
          eventId: selectedEvent.eventId,
          athleteId: scoreData.athleteId,
          wodId: scoreData.wodId,
          categoryId: scoreData.categoryId,
          dayId: scoreData.dayId || 'day-1',
          scoringSystemId: scoringSystem.scoringSystemId || 'time-based-default',
          score: allCompleted ? completionTime : exerciseCompletionStatus.reduce((sum, ex) => {
            return sum + (ex.completed ? parseInt(ex.targetReps) : parseInt(ex.maxReps || 0));
          }, 0).toString(),
          rawData: {
            exercises: exerciseCompletionStatus.map(ex => ({
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              completed: ex.completed,
              reps: parseInt(ex.targetReps),
              maxReps: ex.completed ? null : parseInt(ex.maxReps || 0)
            })),
            completionTime: allCompleted ? completionTime : timeCap,
            timeCap: timeCap
          },
          ...(scoreData.scheduleId && { scheduleId: scoreData.scheduleId }),
          ...(scoreData.sessionId && { sessionId: scoreData.sessionId }),
          ...(selectedMatch && { matchId: selectedMatch.matchId || `match-${Date.now()}` })
        };
      } else {
        // Classic/Advanced scoring payload
        scorePayload = {
          eventId: selectedEvent.eventId,
          athleteId: scoreData.athleteId,
          wodId: scoreData.wodId,
          categoryId: scoreData.categoryId,
          dayId: scoreData.dayId || 'day-1',
          score: calculatedScore || scoreData.score,
          rank: rank,
          rawData: {
            exercises: athletePerformance.filter(p => p.reps),
            rank: rank,
            timeTaken: scoreData.timeTaken || 'Completed'
          },
          ...(scoreData.scheduleId && { scheduleId: scoreData.scheduleId }),
          ...(scoreData.sessionId && { sessionId: scoreData.sessionId }),
          ...(selectedMatch && { matchId: selectedMatch.matchId || `match-${Date.now()}` })
        };
      }

      console.log('Submitting score payload:', scorePayload);

      const response = await post('/scores', scorePayload);

      if (response.updated) {
        setMessage('✅ Score updated successfully!');
      } else {
        setMessage('✅ Score submitted successfully!');
      }
      
      setScoreData({
        athleteId: '',
        wodId: '',
        categoryId: '',
        score: '',
        timeTaken: ''
      });
      setAthleteSearch('');
      setAthletePerformance([]);
      setExerciseCompletionStatus([]);
      setCompletionTime('');
      setRank(1);
      
      // Refresh scores
      await fetchScores();
    } catch (error) {
      console.error('Error submitting score:', error);
      setMessage('❌ Error submitting score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredAthletes = () => {
    if (!scoreData.categoryId) return [];
    
    let filtered = athletes.filter(athlete => athlete.categoryId === scoreData.categoryId);
    
    if (athleteSearch) {
      const search = athleteSearch.toLowerCase();
      filtered = filtered.filter(athlete => 
        athlete.firstName?.toLowerCase().includes(search) ||
        athlete.lastName?.toLowerCase().includes(search) ||
        (athlete.alias && athlete.alias.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  };

  return (
    <div className="score-entry">
      <h1>📊 Score Entry</h1>
      
      {!selectedEvent ? (
        <div className="event-selection">
          <h2>Step 1: Select Competition Event</h2>
          <div className="search-container">
            <input
              type="text"
              placeholder="🔍 Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="events-grid">
            {filteredEvents.map(event => (
              <div key={event.eventId} className="event-card" onClick={() => navigate(`/backoffice/scores/${event.eventId}`)}>
                <h3>{event.name}</h3>
                <p>📍 {event.location}</p>
                <p>📅 {new Date(event.startDate).toLocaleDateString()}</p>
                <span className={`status-badge ${event.status}`}>{event.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="selected-event-header">
            <div>
              <h2>✅ {selectedEvent.name}</h2>
              <p>{selectedEvent.location} • {new Date(selectedEvent.startDate).toLocaleDateString()}</p>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/backoffice/scores')}>Change Event</button>
          </div>

          <div className="mode-selection-header">
            <h3>Step 2: Choose Entry Method</h3>
            <div className="entry-mode-toggle">
              <button 
                className={`mode-btn ${entryMode === 'wod' ? 'active' : ''}`}
                onClick={() => setEntryMode('wod')}
              >
                📝 WOD-Based Entry
                <small>Manual selection of WOD and category</small>
              </button>
              <button 
                className={`mode-btn ${entryMode === 'schedule' ? 'active' : ''}`}
                onClick={() => setEntryMode('schedule')}
              >
                📅 Schedule-Based Entry
                <small>Follow tournament schedule structure</small>
              </button>
            </div>
          </div>

          <div style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', fontSize: '12px', border: '1px solid #ccc'}}>
            <strong>🐛 Debug Info:</strong><br/>
            Selected Event ID: {selectedEvent.eventId}<br/>
            Entry Mode: {entryMode}<br/>
            WODs Count: {wods.length}<br/>
            Categories Count: {categories.length}<br/>
            Published Schedules Count: {publishedSchedules.length}<br/>
            Scores Count: {scores.length}<br/>
            Selected WOD: {scoreData.wodId}<br/>
            Selected Category: {scoreData.categoryId}<br/>
            {entryMode === 'wod' && (
              <>
                {wods.length > 0 && (
                  <div>WODs: {wods.map(w => w.name || w.wodId).join(', ')}</div>
                )}
                {wods.length === 0 && (
                  <div style={{color: 'red'}}>⚠️ No WODs found for this event!</div>
                )}
              </>
            )}
            {entryMode === 'schedule' && (
              <>
                {publishedSchedules.length > 0 && (
                  <div>Schedules: {publishedSchedules.map(s => s.scheduleId).join(', ')}</div>
                )}
                {publishedSchedules.length === 0 && (
                  <div style={{color: 'red'}}>⚠️ No published schedules found for this event!</div>
                )}
              </>
            )}
          </div>

          <form onSubmit={submitScore} className="score-form">
            <h3>Step 3: Enter Score</h3>
            
            {entryMode === 'wod' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>WOD *</label>
                    <select
                      value={scoreData.wodId}
                      onChange={(e) => setScoreData({...scoreData, wodId: e.target.value})}
                      required
                    >
                      <option value="">Select WOD</option>
                      {wods.map(wod => (
                        <option key={wod.wodId} value={wod.wodId}>{wod.name}</option>
                      ))}
                    </select>
                    {wods.length === 0 && <p style={{color: 'orange', fontSize: '12px'}}>No WODs found for this event</p>}
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={scoreData.categoryId}
                      onChange={(e) => {
                        setScoreData({...scoreData, categoryId: e.target.value, athleteId: ''});
                        setAthleteSearch('');
                      }}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category.categoryId} value={category.categoryId}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {scoreData.categoryId && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Search Athlete</label>
                      <input
                        type="text"
                        placeholder="🔍 Search by name or alias..."
                        value={athleteSearch}
                        onChange={(e) => setAthleteSearch(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Athlete *</label>
                    <select
                      value={scoreData.athleteId}
                      onChange={(e) => setScoreData({...scoreData, athleteId: e.target.value})}
                      required
                      disabled={!scoreData.categoryId}
                    >
                      <option value="">Select Athlete</option>
                      {getFilteredAthletes().map(athlete => (
                        <option key={athlete.athleteId} value={athlete.athleteId}>
                          {athlete.firstName} {athlete.lastName}
                          {athlete.alias && ` (${athlete.alias})`}
                        </option>
                      ))}
                    </select>
                    {scoreData.categoryId && getFilteredAthletes().length === 0 && (
                      <p style={{color: 'orange', fontSize: '12px'}}>
                        No athletes found for this category
                      </p>
                    )}
                  </div>
                </div>

                {selectedWod && scoringSystem?.type === 'time-based' && exerciseCompletionStatus.length > 0 && (
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
                    <div style={{
                      background: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      borderLeft: '4px solid #FF5722'
                    }}>
                      <h4 style={{margin: '0 0 8px 0', color: '#FF5722'}}>📋 {selectedWod.name}</h4>
                      <div style={{fontSize: '13px', color: '#666'}}>
                        <div><strong>Format:</strong> {selectedWod.format}</div>
                        {selectedWod.timeCap && (
                          <div>
                            <strong>Time Cap:</strong> ⏱️ {selectedWod.timeCap.minutes}:{String(selectedWod.timeCap.seconds).padStart(2, '0')}
                          </div>
                        )}
                        <div style={{marginTop: '8px'}}><strong>Movements:</strong></div>
                        <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                          {selectedWod.movements?.map((m, i) => (
                            <li key={i}>{m.reps} {m.exercise} {m.weight && `(${m.weight})`}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <h4 style={{marginTop: 0}}>⏱️ Time-Based Score Entry</h4>
                    
                    {validationErrors.length > 0 && (
                      <div style={{
                        background: '#f8d7da',
                        border: '1px solid #f5c6cb',
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '15px'
                      }}>
                        <h4 style={{margin: '0 0 8px 0', color: '#721c24'}}>⚠️ Please fix the following errors:</h4>
                        <ul style={{margin: 0, paddingLeft: '20px', color: '#721c24'}}>
                          {validationErrors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{marginBottom: '10px', color: '#495057'}}>Exercise Completion Status</h5>
                      {exerciseCompletionStatus.map((exercise, idx) => (
                        <div key={idx} style={{
                          background: 'white',
                          padding: '15px',
                          borderRadius: '6px',
                          marginBottom: '10px',
                          border: '1px solid #e1e8ed'
                        }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr',
                            gap: '15px',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{fontWeight: '600', color: '#2c3e50', marginBottom: '4px'}}>
                                {exercise.exerciseName}
                              </div>
                              <small style={{color: '#6c757d'}}>Target: {exercise.targetReps} reps</small>
                            </div>
                            
                            <div>
                              <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={exercise.completed}
                                  onChange={(e) => {
                                    const updated = [...exerciseCompletionStatus];
                                    updated[idx].completed = e.target.checked;
                                    if (e.target.checked) {
                                      updated[idx].maxReps = exercise.targetReps;
                                    }
                                    setExerciseCompletionStatus(updated);
                                  }}
                                  style={{marginRight: '8px', width: '18px', height: '18px'}}
                                />
                                <span style={{color: exercise.completed ? '#28a745' : '#6c757d'}}>
                                  {exercise.completed ? '✓ Completed' : 'Incomplete'}
                                </span>
                              </label>
                            </div>
                            
                            <div>
                              {!exercise.completed && (
                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    color: '#6c757d',
                                    marginBottom: '4px'
                                  }}>
                                    Max Reps Achieved *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={exercise.targetReps}
                                    value={exercise.maxReps}
                                    onChange={(e) => {
                                      const updated = [...exerciseCompletionStatus];
                                      updated[idx].maxReps = e.target.value;
                                      setExerciseCompletionStatus(updated);
                                    }}
                                    placeholder="0"
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '8px',
                                      borderRadius: '4px',
                                      border: '1px solid #ddd',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '6px',
                      border: '1px solid #e1e8ed'
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        marginBottom: '8px'
                      }}>
                        Completion Time (mm:ss) *
                      </label>
                      <input
                        type="text"
                        placeholder="10:00"
                        value={completionTime}
                        onChange={(e) => setCompletionTime(e.target.value)}
                        pattern="[0-9]{1,2}:[0-9]{2}"
                        required
                        style={{
                          width: '200px',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '2px solid #e1e8ed',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}
                      />
                      {selectedWod.timeCap && (
                        <small style={{display: 'block', color: '#6c757d', marginTop: '6px'}}>
                          Time Cap: {selectedWod.timeCap.minutes}:{String(selectedWod.timeCap.seconds).padStart(2, '0')}
                        </small>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedWod && scoringSystem?.type !== 'time-based' && athletePerformance.length > 0 && (
                  <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
                    <div style={{
                      background: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      borderLeft: '4px solid #FF5722'
                    }}>
                      <h4 style={{margin: '0 0 8px 0', color: '#FF5722'}}>📋 {selectedWod.name}</h4>
                      <div style={{fontSize: '13px', color: '#666'}}>
                        <div><strong>Format:</strong> {selectedWod.format}</div>
                        {selectedWod.timeLimit && <div><strong>Time Cap:</strong> ⏱️ {selectedWod.timeLimit}</div>}
                        <div style={{marginTop: '8px'}}><strong>Movements:</strong></div>
                        <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                          {selectedWod.movements?.map((m, i) => {
                            const reps = typeof m.reps === 'object' ? JSON.stringify(m.reps) : m.reps;
                            const exercise = typeof m.exercise === 'object' ? JSON.stringify(m.exercise) : m.exercise;
                            const weight = typeof m.weight === 'object' ? JSON.stringify(m.weight) : m.weight;
                            return (
                              <li key={i}>
                                {reps} {exercise} {weight && `(${weight})`}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    
                    <h4 style={{marginTop: 0}}>Athlete Performance</h4>
                    
                    <div style={{marginBottom: '15px'}}>
                      <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px'}}>
                        Time Taken (mm:ss) or DNF
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 05:30 or DNF"
                        value={scoreData.timeTaken || ''}
                        onChange={(e) => setScoreData({...scoreData, timeTaken: e.target.value})}
                        style={{width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                      />
                      <small style={{display: 'block', color: '#999', marginTop: '3px'}}>
                        Leave empty if completed within time cap
                      </small>
                    </div>
                    
                    {athletePerformance.map((perf, idx) => (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        gap: '10px',
                        marginBottom: '10px',
                        padding: '10px',
                        background: 'white',
                        borderRadius: '4px'
                      }}>
                        <div>
                          <label style={{fontSize: '12px', color: '#666'}}>{perf.exercise}</label>
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Reps"
                            value={perf.reps}
                            onChange={(e) => {
                              const updated = [...athletePerformance];
                              updated[idx].reps = e.target.value;
                              setAthletePerformance(updated);
                            }}
                            style={{width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                          />
                          <small style={{fontSize: '10px', color: '#999'}}>Completed</small>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Weight (kg)"
                            value={perf.weight}
                            onChange={(e) => {
                              const updated = [...athletePerformance];
                              updated[idx].weight = e.target.value;
                              setAthletePerformance(updated);
                            }}
                            style={{width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                          />
                        </div>
                        <div>
                          <select
                            value={perf.eqs}
                            onChange={(e) => {
                              const updated = [...athletePerformance];
                              updated[idx].eqs = e.target.value;
                              setAthletePerformance(updated);
                            }}
                            style={{width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                          >
                            <option value="5">EQS: 5</option>
                            <option value="4">EQS: 4</option>
                            <option value="3">EQS: 3</option>
                            <option value="2">EQS: 2</option>
                            <option value="1">EQS: 1</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    
                    <div style={{marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                      <div>
                        <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px'}}>Rank/Position</label>
                        <select
                          value={rank}
                          onChange={(e) => setRank(parseInt(e.target.value))}
                          style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                        >
                          <option value="1">1st Place (+10 pts)</option>
                          <option value="2">2nd Place (+7 pts)</option>
                          <option value="3">3rd Place (+5 pts)</option>
                          <option value="4">4th+ Place (+0 pts)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px'}}>Calculated Score</label>
                        <div style={{
                          padding: '8px',
                          background: 'linear-gradient(135deg, #EE5F32 0%, #B87333 100%)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          {calculateScore() || 0} pts
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {entryMode === 'schedule' && (
              <div className="schedule-mode">
                {publishedSchedules.length === 0 ? (
                  <p>No published schedules available for this event.</p>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Schedule *</label>
                      <select
                        value={selectedSchedule?.scheduleId || ''}
                        onChange={(e) => {
                          const schedule = publishedSchedules.find(s => s.scheduleId === e.target.value);
                          setSelectedSchedule(schedule);
                          setSelectedSession(null);
                          setSelectedMatch(null);
                          setScoreData({...scoreData, scheduleId: schedule?.scheduleId || '', sessionId: '', athleteId: ''});
                        }}
                        required
                      >
                        <option value="">Select a schedule...</option>
                        {publishedSchedules.map(schedule => (
                          <option key={schedule.scheduleId} value={schedule.scheduleId}>
                            {schedule.name || `Schedule ${schedule.scheduleId}`} - {schedule.competitionMode}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSchedule && selectedSchedule.days && (
                      <div className="form-group">
                        <label>Session *</label>
                        <select
                          value={selectedSession?.sessionId || ''}
                          onChange={(e) => {
                            const allSessions = selectedSchedule.days.flatMap(day => day.sessions || []);
                            const session = allSessions.find(s => s.sessionId === e.target.value);
                            setSelectedSession(session);
                            setSelectedMatch(null);
                            setScoreData({
                              ...scoreData, 
                              sessionId: session?.sessionId || '',
                              wodId: session?.wodId || '',
                              categoryId: session?.categoryId || '',
                              athleteId: ''
                            });
                          }}
                          required
                        >
                          <option value="">Select a session...</option>
                          {selectedSchedule.days.flatMap(day => day.sessions || []).map(session => (
                            <option key={session.sessionId} value={session.sessionId}>
                              {session.wodName || session.wodId} - {session.categoryName || session.categoryId} ({session.startTime})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedSession && selectedSession.matches && (
                      <div className="form-group">
                        <label>Match *</label>
                        <select
                          value={selectedMatch?.matchId || ''}
                          onChange={(e) => {
                            const match = selectedSession.matches.find(m => m.matchId === e.target.value);
                            setSelectedMatch(match);
                            setScoreData({...scoreData, athleteId: ''});
                          }}
                          required
                        >
                          <option value="">Select a match...</option>
                          {selectedSession.matches.map((match, index) => (
                            <option key={match.matchId || index} value={match.matchId || index}>
                              Match {index + 1}: {match.athlete1?.firstName} {match.athlete1?.lastName} vs {match.athlete2?.firstName} {match.athlete2?.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedMatch && (
                      <>
                        <div className="form-group">
                          <label>Athlete *</label>
                          <select
                            value={scoreData.athleteId}
                            onChange={(e) => setScoreData({...scoreData, athleteId: e.target.value})}
                            required
                          >
                            <option value="">Select athlete...</option>
                            {[selectedMatch.athlete1, selectedMatch.athlete2].filter(Boolean).map(athlete => (
                              <option key={athlete.userId || athlete.athleteId} value={athlete.userId || athlete.athleteId}>
                                {athlete.firstName} {athlete.lastName} ({athlete.alias || athlete.categoryId})
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedWod && scoringSystem?.type === 'time-based' && exerciseCompletionStatus.length > 0 && (
                          <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
                            <div style={{
                              background: 'white',
                              padding: '12px',
                              borderRadius: '6px',
                              marginBottom: '15px',
                              borderLeft: '4px solid #FF5722'
                            }}>
                              <h4 style={{margin: '0 0 8px 0', color: '#FF5722'}}>📋 {selectedWod.name}</h4>
                              <div style={{fontSize: '13px', color: '#666'}}>
                                <div><strong>Format:</strong> {selectedWod.format}</div>
                                {selectedWod.timeCap && (
                                  <div>
                                    <strong>Time Cap:</strong> ⏱️ {selectedWod.timeCap.minutes}:{String(selectedWod.timeCap.seconds).padStart(2, '0')}
                                  </div>
                                )}
                                <div style={{marginTop: '8px'}}><strong>Movements:</strong></div>
                                <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                                  {selectedWod.movements?.map((m, i) => (
                                    <li key={i}>{m.reps} {m.exercise} {m.weight && `(${m.weight})`}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            
                            <h4 style={{marginTop: 0}}>⏱️ Time-Based Score Entry</h4>
                            
                            {validationErrors.length > 0 && (
                              <div style={{
                                background: '#f8d7da',
                                border: '1px solid #f5c6cb',
                                borderRadius: '6px',
                                padding: '12px',
                                marginBottom: '15px'
                              }}>
                                <h4 style={{margin: '0 0 8px 0', color: '#721c24'}}>⚠️ Please fix the following errors:</h4>
                                <ul style={{margin: 0, paddingLeft: '20px', color: '#721c24'}}>
                                  {validationErrors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div style={{marginBottom: '20px'}}>
                              <h5 style={{marginBottom: '10px', color: '#495057'}}>Exercise Completion Status</h5>
                              {exerciseCompletionStatus.map((exercise, idx) => (
                                <div key={idx} style={{
                                  background: 'white',
                                  padding: '15px',
                                  borderRadius: '6px',
                                  marginBottom: '10px',
                                  border: '1px solid #e1e8ed'
                                }}>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr',
                                    gap: '15px',
                                    alignItems: 'center'
                                  }}>
                                    <div>
                                      <div style={{fontWeight: '600', color: '#2c3e50', marginBottom: '4px'}}>
                                        {exercise.exerciseName}
                                      </div>
                                      <small style={{color: '#6c757d'}}>Target: {exercise.targetReps} reps</small>
                                    </div>
                                    
                                    <div>
                                      <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                      }}>
                                        <input
                                          type="checkbox"
                                          checked={exercise.completed}
                                          onChange={(e) => {
                                            const updated = [...exerciseCompletionStatus];
                                            updated[idx].completed = e.target.checked;
                                            if (e.target.checked) {
                                              updated[idx].maxReps = exercise.targetReps;
                                            }
                                            setExerciseCompletionStatus(updated);
                                          }}
                                          style={{marginRight: '8px', width: '18px', height: '18px'}}
                                        />
                                        <span style={{color: exercise.completed ? '#28a745' : '#6c757d'}}>
                                          {exercise.completed ? '✓ Completed' : 'Incomplete'}
                                        </span>
                                      </label>
                                    </div>
                                    
                                    <div>
                                      {!exercise.completed && (
                                        <div>
                                          <label style={{
                                            display: 'block',
                                            fontSize: '12px',
                                            color: '#6c757d',
                                            marginBottom: '4px'
                                          }}>
                                            Max Reps Achieved *
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            max={exercise.targetReps}
                                            value={exercise.maxReps}
                                            onChange={(e) => {
                                              const updated = [...exerciseCompletionStatus];
                                              updated[idx].maxReps = e.target.value;
                                              setExerciseCompletionStatus(updated);
                                            }}
                                            placeholder="0"
                                            required
                                            style={{
                                              width: '100%',
                                              padding: '8px',
                                              borderRadius: '4px',
                                              border: '1px solid #ddd',
                                              fontSize: '14px'
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div style={{
                              background: 'white',
                              padding: '15px',
                              borderRadius: '6px',
                              border: '1px solid #e1e8ed'
                            }}>
                              <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#2c3e50',
                                marginBottom: '8px'
                              }}>
                                Completion Time (mm:ss) *
                              </label>
                              <input
                                type="text"
                                placeholder="10:00"
                                value={completionTime}
                                onChange={(e) => setCompletionTime(e.target.value)}
                                pattern="[0-9]{1,2}:[0-9]{2}"
                                required
                                style={{
                                  width: '200px',
                                  padding: '10px',
                                  borderRadius: '6px',
                                  border: '2px solid #e1e8ed',
                                  fontSize: '16px',
                                  fontWeight: '500'
                                }}
                              />
                              {selectedWod.timeCap && (
                                <small style={{display: 'block', color: '#6c757d', marginTop: '6px'}}>
                                  Time Cap: {selectedWod.timeCap.minutes}:{String(selectedWod.timeCap.seconds).padStart(2, '0')}
                                </small>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {selectedWod && scoringSystem?.type !== 'time-based' && athletePerformance.length > 0 && (
                          <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
                            <div style={{
                              background: 'white',
                              padding: '12px',
                              borderRadius: '6px',
                              marginBottom: '15px',
                              borderLeft: '4px solid #FF5722'
                            }}>
                              <h4 style={{margin: '0 0 8px 0', color: '#FF5722'}}>📋 {selectedWod.name}</h4>
                              <div style={{fontSize: '13px', color: '#666'}}>
                                <div><strong>Format:</strong> {selectedWod.format}</div>
                                {selectedWod.timeLimit && <div><strong>Time Cap:</strong> ⏱️ {selectedWod.timeLimit}</div>}
                                <div style={{marginTop: '8px'}}><strong>Movements:</strong></div>
                                <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                                  {selectedWod.movements?.map((m, i) => (
                                    <li key={i}>{m.reps} {m.exercise} {m.weight && `(${m.weight})`}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            
                            <h4 style={{marginTop: 0}}>Athlete Performance</h4>
                            
                            <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px'}}>
                                Time Taken (mm:ss) or DNF
                              </label>
                              <input
                                type="text"
                                placeholder="e.g., 05:30 or DNF"
                                value={scoreData.timeTaken || ''}
                                onChange={(e) => setScoreData({...scoreData, timeTaken: e.target.value})}
                                style={{width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                              />
                            </div>
                            
                            {athletePerformance.map((perf, idx) => (
                              <div key={idx} style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                gap: '10px',
                                marginBottom: '10px',
                                padding: '10px',
                                background: 'white',
                                borderRadius: '4px'
                              }}>
                                <div>
                                  <label style={{fontSize: '12px', color: '#666'}}>{perf.exercise}</label>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    placeholder="Reps"
                                    value={perf.reps}
                                    onChange={(e) => {
                                      const updated = [...athletePerformance];
                                      updated[idx].reps = e.target.value;
                                      setAthletePerformance(updated);
                                    }}
                                    style={{width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                                  />
                                  <small style={{fontSize: '10px', color: '#999'}}>Completed</small>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="Weight (kg)"
                                    value={perf.weight}
                                    onChange={(e) => {
                                      const updated = [...athletePerformance];
                                      updated[idx].weight = e.target.value;
                                      setAthletePerformance(updated);
                                    }}
                                    style={{width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                                  />
                                </div>
                                <div>
                                  <select
                                    value={perf.eqs}
                                    onChange={(e) => {
                                      const updated = [...athletePerformance];
                                      updated[idx].eqs = e.target.value;
                                      setAthletePerformance(updated);
                                    }}
                                    style={{width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                                  >
                                    <option value="5">EQS: 5</option>
                                    <option value="4">EQS: 4</option>
                                    <option value="3">EQS: 3</option>
                                    <option value="2">EQS: 2</option>
                                    <option value="1">EQS: 1</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                            
                            <div style={{marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                              <div>
                                <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px'}}>Rank/Position</label>
                                <select
                                  value={rank}
                                  onChange={(e) => setRank(parseInt(e.target.value))}
                                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                                >
                                  <option value="1">1st Place (+10 pts)</option>
                                  <option value="2">2nd Place (+7 pts)</option>
                                  <option value="3">3rd Place (+5 pts)</option>
                                  <option value="4">4th+ Place (+0 pts)</option>
                                </select>
                              </div>
                              <div>
                                <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px'}}>Calculated Score</label>
                                <div style={{
                                  padding: '8px',
                                  background: 'linear-gradient(135deg, #EE5F32 0%, #B87333 100%)',
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '20px',
                                  fontWeight: 'bold',
                                  textAlign: 'center'
                                }}>
                                  {calculateScore() || 0} pts
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting...' : 'Submit Score'}
              </button>
            </div>

            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </form>

          {/* Current Scores Display - Always Visible */}
          <div className="current-scores" style={{marginTop: '40px'}}>
            <h3 style={{marginBottom: '20px'}}>📊 Current Scores</h3>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500'}}>Filter by WOD</label>
                <select
                  value={scoreData.wodId}
                  onChange={(e) => {
                    setScoreData({...scoreData, wodId: e.target.value});
                    if (e.target.value && scoreData.categoryId) {
                      fetchScores();
                    }
                  }}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                >
                  <option value="">All WODs</option>
                  {wods.map(wod => (
                    <option key={wod.wodId} value={wod.wodId}>{wod.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500'}}>Filter by Category</label>
                <select
                  value={scoreData.categoryId}
                  onChange={(e) => {
                    setScoreData({...scoreData, categoryId: e.target.value});
                    if (scoreData.wodId && e.target.value) {
                      fetchScores();
                    }
                  }}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.categoryId} value={category.categoryId}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {scoreData.wodId && scoreData.categoryId ? (
              scores.length === 0 ? (
                <p style={{textAlign: 'center', color: '#999', padding: '20px'}}>No scores found for this WOD and category combination.</p>
              ) : (
                <div className="scores-table">
                  <div className="table-header">
                    <span>Rank</span>
                    <span>Athlete</span>
                    <span>Score</span>
                    <span>Time</span>
                    <span>Submitted</span>
                  </div>
                  {scores
                    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
                    .map((score, index) => {
                      const athlete = athletes.find(a => a.athleteId === score.athleteId);
                      return (
                        <div key={score.scoreId} className="table-row">
                          <span style={{fontWeight: 'bold', color: index < 3 ? '#FF5722' : '#666'}}>#{index + 1}</span>
                          <span>
                            {athlete ? `${athlete.firstName} ${athlete.lastName}` : score.athleteId}
                            {athlete?.alias && ` (${athlete.alias})`}
                          </span>
                          <span className="score-value">{score.score} pts</span>
                          <span style={{fontSize: '13px', color: '#666'}}>
                            {score.rawData?.timeTaken || '-'}
                          </span>
                          <span className="score-time">{new Date(score.createdAt).toLocaleTimeString()}</span>
                        </div>
                      );
                    })}
                </div>
              )
            ) : (
              <p style={{textAlign: 'center', color: '#999', padding: '20px'}}>
                Select a WOD and Category to view scores
              </p>
            )}
          </div>
        </>
      )}

      <style>{`
        .score-entry {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .score-entry h1 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 28px;
          font-weight: 600;
        }

        .event-selection h2 {
          margin-bottom: 20px;
          color: #2c3e50;
          font-size: 22px;
          font-weight: 600;
        }

        .search-container {
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 12px 16px;
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #FF5722;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .event-card {
          background: white;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(255, 87, 34, 0.15);
          border-color: #FF5722;
        }

        .event-card h3 {
          margin: 0 0 12px 0;
          color: #2c3e50;
          font-size: 18px;
          font-weight: 600;
        }

        .event-card p {
          margin: 8px 0;
          color: #6c757d;
          font-size: 14px;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 8px;
        }

        .status-badge.active {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
        }

        .status-badge.upcoming {
          background: linear-gradient(135deg, #fff3cd, #ffeaa7);
          color: #856404;
        }

        .selected-event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 20px 24px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .selected-event-header h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 22px;
          font-weight: 600;
        }

        .selected-event-header p {
          margin: 4px 0 0 0;
          color: #6c757d;
          font-size: 14px;
        }

        .mode-selection-header {
          background: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .mode-selection-header h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 20px;
          font-weight: 600;
        }

        .entry-mode-toggle {
          display: flex;
          gap: 20px;
        }

        .mode-btn {
          flex: 1;
          padding: 20px;
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          background: white;
          color: #495057;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .mode-btn small {
          font-size: 13px;
          font-weight: 400;
          margin-top: 8px;
          opacity: 0.7;
        }

        .mode-btn:hover {
          border-color: #FF5722;
          background: #fff5f2;
        }

        .mode-btn.active {
          border-color: #FF5722;
          background: linear-gradient(135deg, #ed7845, #f09035)
          color: white;
        }

        .score-form {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .score-form h3 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 20px;
          font-weight: 600;
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #FF5722;
        }

        .form-group input:disabled,
        .form-group select:disabled {
          background: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
        }

        .form-actions {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e1e8ed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #ed7845, #f09035)
          color: white;
          border: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .message {
          margin-top: 20px;
          padding: 16px;
          border-radius: 8px;
          font-weight: 600;
        }

        .message.success {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: linear-gradient(135deg, #f8d7da, #f5c6cb);
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .current-scores {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          margin-top: 25px;
        }

        .current-scores h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 20px;
          font-weight: 600;
        }

        .scores-table {
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e1e8ed;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          background: linear-gradient(135deg, #ed7845, #f09035)
          color: white;
          font-weight: 600;
          padding: 16px;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          padding: 16px;
          border-bottom: 1px solid #e1e8ed;
          transition: background 0.2s;
        }

        .table-row:hover {
          background: #f8f9ff;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .score-value {
          font-weight: 600;
          color: #FF5722;
        }

        .score-time {
          color: #6c757d;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
          }
          
          .entry-mode-toggle {
            flex-direction: column;
          }
          
          .events-grid {
            grid-template-columns: 1fr;
          }
          
          .selected-event-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
}

export default ScoreEntry;
