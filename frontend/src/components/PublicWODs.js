import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './common/LanguageSwitcher';

function PublicWODs() {
  const [wods, setWods] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchWods();
  }, []);

  const fetchWods = async () => {
    try {
      const response = await API.get('CalisthenicsAPI', '/public/wods');
      setWods(response || []);
    } catch (error) {
      console.error('Error fetching WODs:', error);
      // Use fallback data based on known WODs in database
      const fallbackWods = [
        {
          wodId: 'wod-1760830267755',
          name: 'persuit',
          description: 'Ladder format workout',
          format: 'Ladder',
          movements: [
            '12 One Arm Pull Up',
            '20 Bar Dips (Bodyweight)'
          ]
        },
        {
          wodId: 'wod-2',
          name: 'Grace',
          description: '30 Clean and Jerks for time',
          format: 'For Time',
          movements: [
            '15 Muscle Up (Weighted)',
            '40 Squats (Weighted)'
          ]
        },
        {
          wodId: 'wod-3',
          name: 'Murph',
          description: '1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run',
          format: 'Hero WOD',
          movements: [
            '1 Mile Run',
            '100 Pull-ups',
            '200 Push-ups', 
            '300 Squats',
            '1 Mile Run'
          ]
        },
        {
          wodId: 'baseline-men-elite',
          name: 'Baseline AMRAP - Men Elite',
          description: 'Complete as many rounds as possible in 12 minutes',
          format: 'AMRAP',
          timeCap: '12 minutes',
          movements: [
            '3 Muscle Up (Bodyweight)',
            '6 Handstand Push Up',
            '9 Pistol Squats (Bodyweight)'
          ]
        },
        {
          wodId: 'sample-chipper-1',
          name: 'The Gauntlet',
          description: 'Complete all movements for time',
          format: 'Chipper',
          timeCap: '20 minutes',
          movements: [
            '50 Burpees',
            '40 Pull-ups',
            '30 Push-ups',
            '20 Sit-ups',
            '10 Squats'
          ]
        }
      ];
      setWods(fallbackWods);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-wods">
        <div className="loading">Loading WODs...</div>
        <style jsx>{`
          .public-wods {
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 40px 20px;
          }
          .loading {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 12px;
            max-width: 600px;
            margin: 0 auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="public-wods">
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/')}>
          <img src="/athleon-white-crop.PNG" alt="Athleon" className="logo-image" />
          <span className="logo-text">Athleon</span>
        </div>
        <div className="nav-right">
          <LanguageSwitcher className="language-toggle-header" />
        </div>
      </nav>

      <div className="hero">
        <h1>WODs Library</h1>
        <p>Explore our collection of workout templates used in competitions</p>
      </div>

      {wods.length === 0 ? (
        <div className="no-wods">
          <p>No WODs available at the moment. Check back soon!</p>
        </div>
      ) : (
        <div className="wods-grid">
          {wods.map(wod => (
            <div key={wod.wodId} className="wod-cube">
              <div className="wod-image">
                <div className="placeholder-image">🏋️</div>
              </div>
              <div className="wod-content">
                <h3>{wod.name}</h3>
                {wod.description && (
                  <p className="wod-description">{wod.description}</p>
                )}
                
                {wod.movements && wod.movements.length > 0 && (
                  <div className="movements-section">
                    <strong>Movements:</strong>
                    <ul className="movements-list">
                      {wod.movements.map((movement, idx) => (
                        <li key={idx}>
                          {typeof movement === 'string' ? movement : 
                           `${movement.reps || ''} ${movement.exercise || movement.name || ''}${movement.weight ? ` (${movement.weight}kg)` : ''}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="wod-badges">
                  {wod.format && (
                    <span className="badge format-badge">{wod.format}</span>
                  )}
                  {wod.timeCap && (
                    <span className="badge time-badge">{wod.timeCap}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .public-wods {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 5%;
          background: linear-gradient(135deg, #FF5722 0%, #6B7C93 100%);
          position: sticky;
          top: 0;
          z-index: 100;
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
        .nav-links {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .hero {
          text-align: center;
          margin-bottom: 50px;
        }
        .hero h1 {
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 15px 0;
        }
        .hero p {
          font-size: 20px;
          color: #6c757d;
        }
        .no-wods {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .wods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 30px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .wod-cube {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .wod-cube:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }
        .wod-image {
          width: 100%;
          height: 200px;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .placeholder-image {
          font-size: 80px;
        }
        .wod-content {
          padding: 24px;
        }
        .wod-content h3 {
          margin: 0 0 16px 0;
          color: #2c3e50;
          font-size: 24px;
          font-weight: 600;
        }
        .wod-description {
          color: #6c757d;
          font-size: 16px;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .movements-section {
          margin-bottom: 20px;
        }
        .movements-section strong {
          color: #2c3e50;
          font-size: 16px;
          display: block;
          margin-bottom: 8px;
        }
        .movements-list {
          margin: 0;
          padding-left: 20px;
          color: #6c757d;
        }
        .movements-list li {
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .wod-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .format-badge {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
        }
        .time-badge {
          background: linear-gradient(135deg, #ff8a50 0%, #ff6b35 100%);
          color: white;
        }
      `}</style>
    </div>
  );
}

export default PublicWODs;
