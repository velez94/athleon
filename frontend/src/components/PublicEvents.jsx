import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicGet } from '../lib/api';
import LanguageSwitcher from './common/LanguageSwitcher';

function PublicEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchPublishedEvents();
  }, []);

  const fetchPublishedEvents = async () => {
    try {
      const data = await publicGet('/public/events');
      console.log('Published events:', data);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      // Set empty array on error to prevent UI breaking
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="public-events">
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
          <h1>{t('events.title')}</h1>
        </div>
        <p>{t('events.published')}</p>
      </div>

      {events.length === 0 ? (
        <div className="no-events">
          <p>No published events at this time. Check back soon!</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <div 
              key={event.eventId} 
              className="event-cube"
              onClick={() => navigate(`/events/${event.eventId}`)}
            >
              <div className="event-image">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.name} />
                ) : (
                  <div className="placeholder-image">🏆</div>
                )}
              </div>
              <div className="event-content">
                <h3>{event.name}</h3>
                <p className="event-date">
                  📅 {new Date(event.startDate).toLocaleDateString()}
                </p>
                <p className="event-location">📍 {event.location}</p>
                <p className="event-description">{event.description}</p>
                <span className={`status-badge ${event.status}`}>
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .public-events {
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
        .loading, .no-events {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 30px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .event-cube {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.04);
        }
        .event-cube:hover {
          transform: translateY(-12px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
          border-color: rgba(255, 87, 34, 0.3);
        }
        .event-image {
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .event-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .placeholder-image {
          font-size: 80px;
        }
        .event-content {
          padding: 24px;
        }
        .event-content h3 {
          margin: 0 0 16px 0;
          color: #2c3e50;
          font-size: 24px;
          font-weight: 600;
        }
        .event-date, .event-location {
          margin: 8px 0;
          color: #6c757d;
          font-size: 14px;
        }
        .event-description {
          margin: 16px 0;
          color: #495057;
          font-size: 14px;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 12px;
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
          .events-grid {
            grid-template-columns: 1fr;
            padding: 0 20px;
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

export default PublicEvents;
