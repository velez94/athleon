import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { del } from '../../lib/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useEvents } from '../../../hooks/useEvents';
import { useNotification } from '../../common/NotificationProvider';
import { safeAsync } from '../../../utils/errorHandler';
import EventList from './EventList';
import EventForm from './EventForm';
import OrganizationSelector from '../OrganizationSelector';
import ConfirmDialog from '../../common/ConfirmDialog';
import './EventManagement.css';

/**
 * EventManagement Component (Refactored)
 * Main component for managing events - now much smaller and cleaner!
 */
function EventManagement() {
  // const navigate = useNavigate();
  const { selectedOrganization } = useOrganization();
  const { showNotification } = useNotification();
  
  // Use custom hook with caching and batch API calls
  const { events, loading, error, refresh } = useEvents(selectedOrganization?.organizationId);
  
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, eventId: null });

  const handleCreate = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = (eventId) => {
    setDeleteConfirm({ isOpen: true, eventId });
  };

  const confirmDelete = async () => {
    const eventId = deleteConfirm.eventId;
    setDeleteConfirm({ isOpen: false, eventId: null });
    
    await safeAsync(
      () => del(`/competitions/${eventId}`),
      {
        showNotification,
        successMessage: 'Event deleted successfully',
        errorMessage: 'Failed to delete event',
        onSuccess: refresh
      }
    );
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEvent(null);
    refresh();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  // Show form view
  if (showForm) {
    return (
      <div className="event-management">
        <div className="page-header">
          <button onClick={handleFormCancel} className="btn-back">
            ← Back to Events
          </button>
          <h1>{editingEvent ? 'Edit Event' : 'Create New Event'}</h1>
        </div>

        <EventForm
          event={editingEvent}
          organizationId={selectedOrganization?.organizationId}
          onCancel={handleFormCancel}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  }

  // Show list view
  return (
    <div className="event-management">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Event Management</h1>
            <p className="subtitle">Manage your competition events</p>
          </div>
          <OrganizationSelector />
        </div>
        <button 
          onClick={handleCreate} 
          className="btn-create"
          disabled={!selectedOrganization}
          aria-label="Create new event"
        >
          <span aria-hidden="true">+</span> Create Event
        </button>
      </div>

      {!selectedOrganization && (
        <div className="info-banner" role="alert">
          <span className="info-icon" aria-hidden="true">ℹ️</span>
          <p>Please select an organization to view and manage events</p>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <p>{error}</p>
          <button onClick={refresh} className="btn-retry">
            Try Again
          </button>
        </div>
      )}

      <EventList 
        events={events}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, eventId: null })}
        onConfirm={confirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete Event"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default EventManagement;
