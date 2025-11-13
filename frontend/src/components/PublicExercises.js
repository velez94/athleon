import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './common/LanguageSwitcher';

function PublicExercises() {
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredExercises(exercises);
    } else {
      setFilteredExercises(exercises.filter(ex => ex.category === selectedCategory));
    }
  }, [exercises, selectedCategory]);

  const fetchExercises = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.dev.athleon.fitness'}/public/exercises`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setExercises(data);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      // Fallback to sample exercises if API fails
      const sampleExercises = [
        {
          exerciseId: 'ex-muscle-up',
          name: 'Muscle Up (Bodyweight)',
          category: 'strength',
          baseScore: 5,
          modifiers: []
        },
        {
          exerciseId: 'ex-muscle-up-weighted',
          name: 'Muscle Up (Weighted)',
          category: 'strength',
          baseScore: 5,
          modifiers: [{ type: 'weight', points: 1 }]
        },
        {
          exerciseId: 'ex-pull-up',
          name: 'Pull Up (Bodyweight)',
          category: 'strength',
          baseScore: 1,
          modifiers: []
        },
        {
          exerciseId: 'ex-push-ups',
          name: 'Push Ups (Bodyweight)',
          category: 'endurance',
          baseScore: 0.5,
          modifiers: []
        },
        {
          exerciseId: 'ex-push-ups-deadstop',
          name: 'Push Ups (Deadstop)',
          category: 'endurance',
          baseScore: 0.5,
          modifiers: [{ type: 'deadstop', points: 0.5 }]
        },
        {
          exerciseId: 'ex-handstand-hold',
          name: 'Handstand Hold',
          category: 'skill',
          baseScore: 2,
          modifiers: []
        },
        {
          exerciseId: 'ex-front-lever',
          name: 'Front Lever Hold',
          category: 'skill',
          baseScore: 3,
          modifiers: []
        },
        {
          exerciseId: 'ex-one-arm-pullup',
          name: 'One Arm Pull Up',
          category: 'skill',
          baseScore: 8,
          modifiers: []
        }
      ];
      setExercises(sampleExercises);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'strength': return '#FF5722';
      case 'endurance': return '#6B7C93';
      case 'skill': return '#FF8A65';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="public-exercises">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="public-exercises">
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/')}>
          <img src="/athleon-white-crop.PNG" alt="Athleon" className="logo-image" />
          <span className="logo-text">Athleon</span>
        </div>
        
        <div className="nav-links">
          <a href="/events" className="nav-link">
            {t('navigation.events')}
          </a>
          <a href="/wods" className="nav-link">
            WODs Library
          </a>
          <a href="/exercises" className="nav-link">
            Exercises Library
          </a>
        </div>
        
        <div className="nav-right">
          <LanguageSwitcher className="language-toggle-header" />
        </div>
      </nav>

      <div className="hero">
        <div className="hero-header">
          <h1>{t('exercises.title')}</h1>
        </div>
        <p>{t('exercises.subtitle')}</p>
      </div>

      <div className="content">
        <div className="filter-section">
          <label>{t('exercises.filterLabel')}</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">{t('exercises.all')} ({exercises.length})</option>
            <option value="strength">{t('exercises.strength')} ({exercises.filter(ex => ex.category === 'strength').length})</option>
            <option value="endurance">{t('exercises.endurance')} ({exercises.filter(ex => ex.category === 'endurance').length})</option>
            <option value="skill">{t('exercises.skill')} ({exercises.filter(ex => ex.category === 'skill').length})</option>
          </select>
        </div>
        
        <div className="exercises-grid">
          {filteredExercises.map(exercise => (
            <div key={exercise.exerciseId} className="exercise-card">
              <div className="exercise-header">
                <h3>{exercise.name}</h3>
                <span 
                  className="category-badge"
                  style={{ backgroundColor: getCategoryColor(exercise.category) }}
                >
                  {exercise.category}
                </span>
              </div>
              
              <div className="base-score">
                <strong>{t('exercises.baseScore')}:</strong> {exercise.baseScore} pts
              </div>
              
              {exercise.modifiers && exercise.modifiers.length > 0 && (
                <div className="modifiers">
                  <strong>{t('exercises.modifiers')}:</strong>
                  <ul>
                    {exercise.modifiers.map((modifier, idx) => (
                      <li key={idx}>
                        {modifier.type}: +{modifier.points} pts
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredExercises.length === 0 && (
          <div className="no-exercises">
            {t('exercises.noExercises')}
          </div>
        )}
      </div>

      <style jsx>{`
        .public-exercises {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 5%;
          background: linear-gradient(135deg, #FF5722 0%, #6B7C93 100%);
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .logo:hover {
          transform: scale(1.05);
        }
        .logo-image {
          width: 40px;
          height: 40px;
          border-radius: 8px;
        }
        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }
        .nav-right {
          display: flex;
          align-items: center;
        }
        .nav-links {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 1;
          justify-content: center;
        }
        .nav-link {
          color: white;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          padding: 10px 18px;
          border-radius: 8px;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }
        .hero {
          text-align: center;
          padding: 40px 20px;
          margin-bottom: 40px;
        }
        .hero-header {
          display: flex;
          justify-content: center;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto 12px auto;
        }
        .hero h1 {
          font-size: 36px;
          font-weight: 700;
          background: linear-gradient(135deg, #FF5722 0%, #6B7C93 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        .hero p {
          font-size: 16px;
          color: #6c757d;
          margin: 0;
        }
        .loading {
          text-align: center;
          padding: 60px 20px;
          font-size: 18px;
          color: #6c757d;
        }
        .content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px 40px;
        }
        .filter-section {
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .filter-section label {
          font-weight: 600;
          color: #333;
        }
        .category-filter {
          padding: 10px 15px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          transition: border-color 0.3s ease;
        }
        .category-filter:focus {
          outline: none;
          border-color: #FF5722;
        }
        .exercises-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 30px;
        }
        .exercise-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(0,0,0,0.04);
        }
        .exercise-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.12);
        }
        .exercise-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .exercise-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
          flex: 1;
          margin-right: 10px;
        }
        .category-badge {
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .base-score {
          margin-bottom: 15px;
          font-size: 16px;
          color: #333;
        }
        .base-score strong {
          color: #FF5722;
        }
        .modifiers {
          color: #666;
        }
        .modifiers strong {
          color: #6B7C93;
        }
        .modifiers ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }
        .modifiers li {
          font-size: 14px;
          margin-bottom: 4px;
        }
        .no-exercises {
          text-align: center;
          padding: 60px 20px;
          color: #666;
          font-size: 18px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        @media (max-width: 768px) {
          .navbar {
            padding: 12px 4%;
          }
          .nav-links {
            display: none;
          }
          .logo-image {
            width: 36px;
            height: 36px;
          }
          .logo-text {
            font-size: 20px;
          }
          .hero h1 {
            font-size: 32px;
          }
          .hero p {
            font-size: 14px;
          }
          .hero-header {
            flex-direction: column;
            gap: 20px;
          }
          .exercises-grid {
            grid-template-columns: 1fr;
            padding: 0 20px;
          }
          .filter-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
        @media (max-width: 480px) {
          .navbar {
            padding: 10px 3%;
          }
          .logo-image {
            width: 32px;
            height: 32px;
          }
          .logo-text {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}

export default PublicExercises;
