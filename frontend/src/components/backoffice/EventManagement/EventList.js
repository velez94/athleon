import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../common/Loading/LoadingSpinner';

/**
 * EventList Component
 * Displays a list of events with actions
 */
const EventList = ({ events, onEdit, onDelete, loading }) => {
  const navigate = useNavigate();

  const handleEventClick = (eventId) => {
    navigate(`/backoffice/events/${eventId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" message="Loading events..." variant="dots" />;
  }

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📅</div>
        <h3>No Events Yet</h3>
        <p>Create your first competition event to get started</p>
      </div>
    );
  }

  return (
    <div className="events-grid">
      {events.map(event => (
        <div 
          key={event.eventId} 
          className="event-card"
          onClick={() => handleEventClick(event.eventId)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleEventClick(event.eventId);
            }
          }}
          aria-label={`View details for ${event.name}`}
        >
          {event.imageUrl && (
            <div className="event-image">
              <img src={event.imageUrl} alt={event.name} />
            </div>
          )}
          
          <div className="event-content">
            <div className="event-header">
              <h3>{event.name}</h3>
              <span className={`status-badge ${event.status || 'active'}`}>
                {event.status || 'Active'}
              </span>
            </div>
            
            <div className="event-meta">
              <div className="meta-item">
                <span className="meta-icon" aria-hidden="true">📍</span>
                <span>{event.location || 'Location TBD'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon" aria-hidden="true">📅</span>
                <span>{formatDate(event.startDate)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon" aria-hidden="true">💪</span>
                <span>{event.wodCount || 0} WODs</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon" aria-hidden="true">👥</span>
                <span>{event.athleteCount || 0} Athletes</span>
              </div>
            </div>
            
            <p className="event-description">{event.description}</p>
            
            <div className="event-actions" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(event)}
                className="btn-edit"
                aria-label={`Edit ${event.name}`}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(event.eventId)}
                className="btn-delete"
                aria-label={`Delete ${event.name}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6c757d;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 2px dashed #dee2e6;
        }
        
        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        
        .empty-state h3 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }
        
        .empty-state p {
          margin: 0;
          color: #6c757d;
        }
        
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        
        .event-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }
        
        .event-card:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
        
        .event-image {
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: #f8f9fa;
        }
        
        .event-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .event-content {
          padding: 20px;
        }
        
        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 12px;
        }
        
        .event-header h3 {
          margin: 0;
          font-size: 20px;
          color: #2c3e50;
          flex: 1;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }
        
        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }
        
        .status-badge.upcoming {
          background: #fff3cd;
          color: #856404;
        }
        
        .status-badge.completed {
          background: #d1ecf1;
          color: #0c5460;
        }
        
        .event-meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6c757d;
        }
        
        .meta-icon {
          font-size: 16px;
        }
        
        .event-description {
          color: #6c757d;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 16px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .event-actions {
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #e9ecef;
        }
        
        .btn-edit, .btn-delete {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-edit {
          background: #007bff;
          color: white;
        }
        
        .btn-edit:hover {
          background: #0056b3;
        }
        
        .btn-edit:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
        
        .btn-delete {
          background: #dc3545;
          color: white;
        }
        
        .btn-delete:hover {
          background: #c82333;
        }
        
        .btn-delete:focus {
          outline: 2px solid #dc3545;
          outline-offset: 2px;
        }
        
        @media (max-width: 768px) {
          .events-grid {
            grid-template-columns: 1fr;
          }
          
          .event-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default EventList;
