import { useState, useEffect } from 'react';
import { get, post, put, del } from '../../lib/api';

function ScoringSystemManager({ eventId }) {
  const [scoringSystems, setScoringSystems] = useState([]);
  const [_exercises, setExercises] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    type: 'classic',
    config: {
      baseScore: 100,
      decrement: 1,
      timeCap: {
        minutes: 10,
        seconds: 0
      }
    }
  });

      // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    fetchScoringSystems();
    fetchExercises();
  }, [eventId]);

  const fetchScoringSystems = async () => {
    try {
      const response = await get(`/competitions/${eventId}/scoring-systems`);
      setScoringSystems(response);
    } catch (error) {
      console.error('Error fetching scoring systems:', error);
    }
  };

  const fetchExercises = async () => {
    try {
      const response = await get('/exercises');
      setExercises(response);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.type === 'time-based') {
      const minutes = formData.config.timeCap.minutes;
      const seconds = formData.config.timeCap.seconds;
      
      if (minutes < 0 || !Number.isInteger(minutes)) {
        newErrors.minutes = 'Minutes must be a positive integer';
      }
      
      if (seconds < 0 || seconds > 59 || !Number.isInteger(seconds)) {
        newErrors.seconds = 'Seconds must be between 0 and 59';
      }
      
      if (minutes === 0 && seconds === 0) {
        newErrors.timeCap = 'Time cap must be greater than 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createScoringSystem = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Prepare the payload based on scoring type
      const payload = {
        name: formData.name,
        type: formData.type,
        config: formData.type === 'time-based' 
          ? { timeCap: formData.config.timeCap }
          : formData.type === 'classic'
          ? { baseScore: formData.config.baseScore, decrement: formData.config.decrement }
          : {}
      };
      
      await post(`/competitions/${eventId}/scoring-systems`, payload);
      setShowForm(false);
      setErrors({});
      // Reset form
      setFormData({
        name: '',
        type: 'classic',
        config: {
          baseScore: 100,
          decrement: 1,
          timeCap: {
            minutes: 10,
            seconds: 0
          }
        }
      });
      fetchScoringSystems();
    } catch (error) {
      console.error('Error creating scoring system:', error);
      setErrors({ submit: 'Failed to create scoring system. Please try again.' });
    }
  };

  const handleTypeChange = (newType) => {
    setFormData({
      ...formData,
      type: newType,
      config: {
        baseScore: 100,
        decrement: 1,
        timeCap: {
          minutes: 10,
          seconds: 0
        }
      }
    });
    setErrors({});
  };

  const deleteScoringSystem = async (scoringSystemId) => {
    if (!window.confirm('Delete this scoring system?')) return;
    try {
      await del(`/competitions/${eventId}/scoring-systems/${scoringSystemId}`);
      fetchScoringSystems();
    } catch (error) {
      console.error('Error deleting scoring system:', error);
    }
  };

  return (
    <div style={{padding: '20px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
        <h2>Scoring Systems</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #EE5F32 0%, #B87333 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancel' : 'Create Scoring System'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createScoringSystem} style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '5px'}}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
              required
            />
          </div>

          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '5px'}}>Type</label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
            >
              <option value="classic">Classic (Rank-based)</option>
              <option value="advanced">Advanced (EDS × EQS + TB)</option>
              <option value="time-based">Time-Based (Completion Tracking)</option>
            </select>
          </div>

          {formData.type === 'classic' && (
            <>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px'}}>Base Score</label>
                <input
                  type="number"
                  value={formData.config.baseScore}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {...formData.config, baseScore: Number(e.target.value)}
                  })}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px'}}>Decrement per Rank</label>
                <input
                  type="number"
                  value={formData.config.decrement}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {...formData.config, decrement: Number(e.target.value)}
                  })}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
            </>
          )}

          {formData.type === 'time-based' && (
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px'}}>
                Time Cap <span style={{color: '#dc3545'}}>*</span>
              </label>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <div style={{flex: 1}}>
                  <input
                    type="number"
                    min="0"
                    value={formData.config.timeCap.minutes}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          timeCap: {...formData.config.timeCap, minutes: value}
                        }
                      });
                      setErrors({...errors, minutes: null, timeCap: null});
                    }}
                    placeholder="Minutes"
                    style={{
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: errors.minutes || errors.timeCap ? '1px solid #dc3545' : '1px solid #ddd'
                    }}
                  />
                  <small style={{color: '#6c757d', display: 'block', marginTop: '4px'}}>Minutes</small>
                  {errors.minutes && (
                    <small style={{color: '#dc3545', display: 'block', marginTop: '4px'}}>
                      {errors.minutes}
                    </small>
                  )}
                </div>
                <span style={{fontSize: '20px', fontWeight: 'bold'}}>:</span>
                <div style={{flex: 1}}>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={formData.config.timeCap.seconds}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          timeCap: {...formData.config.timeCap, seconds: value}
                        }
                      });
                      setErrors({...errors, seconds: null, timeCap: null});
                    }}
                    placeholder="Seconds"
                    style={{
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: errors.seconds || errors.timeCap ? '1px solid #dc3545' : '1px solid #ddd'
                    }}
                  />
                  <small style={{color: '#6c757d', display: 'block', marginTop: '4px'}}>Seconds</small>
                  {errors.seconds && (
                    <small style={{color: '#dc3545', display: 'block', marginTop: '4px'}}>
                      {errors.seconds}
                    </small>
                  )}
                </div>
              </div>
              {errors.timeCap && (
                <small style={{color: '#dc3545', display: 'block', marginTop: '4px'}}>
                  {errors.timeCap}
                </small>
              )}
              <small style={{color: '#6c757d', display: 'block', marginTop: '8px'}}>
                Maximum time allowed to complete the WOD
              </small>
            </div>
          )}

          {errors.submit && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              background: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              border: '1px solid #f5c6cb'
            }}>
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #EE5F32 0%, #B87333 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Create
          </button>
        </form>
      )}

      <div style={{display: 'grid', gap: '15px'}}>
        {scoringSystems.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            <p>No scoring systems created yet.</p>
            <p>Click "Create Scoring System" to get started.</p>
          </div>
        ) : (
          scoringSystems.map(system => (
            <div key={system.scoringSystemId} style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                <div>
                  <h3 style={{margin: '0 0 10px 0'}}>{system.name}</h3>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: system.type === 'classic' 
                      ? '#4caf50' 
                      : system.type === 'time-based' 
                      ? '#ff9800' 
                      : '#2196f3',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {system.type === 'time-based' ? '⏱️ TIME-BASED' : system.type.toUpperCase()}
                  </span>
                  {system.type === 'classic' && (
                    <p style={{marginTop: '10px', color: '#666'}}>
                      Base: {system.config.baseScore} | Decrement: {system.config.decrement}
                    </p>
                  )}
                  {system.type === 'time-based' && system.config?.timeCap && (
                    <p style={{marginTop: '10px', color: '#666'}}>
                      ⏱️ Time Cap: {system.config.timeCap.minutes}:
                      {String(system.config.timeCap.seconds).padStart(2, '0')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteScoringSystem(system.scoringSystemId)}
                  style={{
                    padding: '6px 12px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ScoringSystemManager;
