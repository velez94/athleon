import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { useNotification } from '../../common/NotificationProvider';
import { validateForm, validateRequired, validateDateRange } from '../../../utils/validation';
import { safeAsync } from '../../../utils/errorHandler';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';
import WodSelector from './WodSelector';
import CategorySelector from './CategorySelector';

/**
 * EventForm Component
 * Form for creating/editing events with validation
 */
const EventForm = ({ event, onCancel, onSuccess, organizationId }) => {
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: '',
    location: '',
    maxParticipants: 100,
    registrationDeadline: '',
    workouts: [],
    categories: [],
    imageUrl: '',
    published: false
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Keyboard shortcuts
  useKeyboardNavigation({
    onEscape: onCancel,
    onSave: handleSubmit
  });

  // Load event data if editing
  useEffect(() => {
    if (event) {
      // Normalize categories - handle both array of IDs and array of objects
      let normalizedCategories = event.categories || [];
      if (normalizedCategories.length > 0 && typeof normalizedCategories[0] === 'string') {
        // Already array of IDs, keep as is
      } else if (normalizedCategories.length > 0 && typeof normalizedCategories[0] === 'object') {
        // Array of objects, keep as is (CategorySelector will handle it)
      }
      
      setFormData({
        name: event.name || '',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        location: event.location || '',
        description: event.description || '',
        maxParticipants: event.maxParticipants || 100,
        registrationDeadline: event.registrationDeadline || '',
        workouts: event.workouts || event.wods || [],
        categories: normalizedCategories,
        imageUrl: event.imageUrl || '',
        published: event.published || false
      });
    }
  }, [event]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateFormData = () => {
    const { valid, errors: validationErrors } = validateForm(formData, {
      name: (value) => validateRequired(value, 'Event name'),
      startDate: (value) => validateRequired(value, 'Start date'),
      endDate: (value) => validateRequired(value, 'End date'),
      location: (value) => validateRequired(value, 'Location')
    });

    if (!valid) {
      setErrors(validationErrors);
      return false;
    }

    // Validate date range
    const dateRangeValidation = validateDateRange(formData.startDate, formData.endDate);
    if (!dateRangeValidation.valid) {
      setErrors({ endDate: dateRangeValidation.error });
      showNotification(dateRangeValidation.error, 'error');
      return false;
    }

    return true;
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;

    try {
      setUploading(true);
      const fileName = `events/${Date.now()}-${file.name}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      
      const response = await API.post('CalisthenicsAPI', '/upload-image', { body: formData });
      return response.imageUrl;
    } catch (error) {
      showNotification('Failed to upload image', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    
    if (submitting) return;

    // Validate form
    if (!validateFormData()) {
      return;
    }

    if (!organizationId) {
      showNotification('Please select an organization first', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl = formData.imageUrl;
      
      // Upload image if file is selected
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
        if (!imageUrl) {
          setSubmitting(false);
          return;
        }
      }

      const eventData = { 
        ...formData, 
        imageUrl,
        organizationId 
      };
      
      const { success } = await safeAsync(
        () => event 
          ? API.put('CalisthenicsAPI', `/competitions/${event.eventId}`, { body: eventData })
          : API.post('CalisthenicsAPI', '/competitions', { body: eventData }),
        {
          showNotification,
          successMessage: event ? 'Event updated successfully!' : 'Event created successfully!',
          errorMessage: event ? 'Failed to update event' : 'Failed to create event',
          onSuccess: (data) => {
            if (onSuccess) onSuccess(data);
          }
        }
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="event-form">
      {/* Basic Information */}
      <section className="form-section">
        <h3 className="section-title">📋 Basic Information</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="event-name">
              Event Name <span className="required">*</span>
            </label>
            <input
              id="event-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter event name"
              className={errors.name ? 'error' : ''}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              required
            />
            {errors.name && (
              <span id="name-error" className="error-message" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="event-location">
              Location <span className="required">*</span>
            </label>
            <input
              id="event-location"
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Event location"
              className={errors.location ? 'error' : ''}
              aria-invalid={!!errors.location}
              required
            />
            {errors.location && (
              <span className="error-message" role="alert">{errors.location}</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="event-description">Description</label>
          <textarea
            id="event-description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe your event..."
            rows="4"
          />
        </div>
      </section>

      {/* Dates & Registration */}
      <section className="form-section">
        <h3 className="section-title">📅 Dates & Registration</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start-date">
              Start Date <span className="required">*</span>
            </label>
            <input
              id="start-date"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={errors.startDate ? 'error' : ''}
              required
            />
            {errors.startDate && (
              <span className="error-message" role="alert">{errors.startDate}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="end-date">
              End Date <span className="required">*</span>
            </label>
            <input
              id="end-date"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className={errors.endDate ? 'error' : ''}
              required
            />
            {errors.endDate && (
              <span className="error-message" role="alert">{errors.endDate}</span>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="registration-deadline">Registration Deadline</label>
            <input
              id="registration-deadline"
              type="date"
              value={formData.registrationDeadline}
              onChange={(e) => handleChange('registrationDeadline', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="max-participants">Max Participants</label>
            <input
              id="max-participants"
              type="number"
              value={formData.maxParticipants}
              onChange={(e) => handleChange('maxParticipants', parseInt(e.target.value))}
              min="1"
              placeholder="100"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="form-section">
        <h3 className="section-title">🏆 Categories</h3>
        <CategorySelector
          selectedCategories={formData.categories}
          onChange={(categories) => handleChange('categories', categories)}
        />
      </section>

      {/* Workouts */}
      <section className="form-section">
        <h3 className="section-title">💪 Workouts (WODs)</h3>
        <WodSelector
          selectedWods={formData.workouts}
          onChange={(wods) => handleChange('workouts', wods)}
        />
      </section>

      {/* Event Image */}
      <section className="form-section">
        <h3 className="section-title">🖼️ Event Image</h3>
        <div className="form-group">
          <label htmlFor="event-image">Event Banner</label>
          <input
            id="event-image"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="file-input"
            aria-describedby="image-hint"
          />
          <small id="image-hint" className="field-hint">
            Upload a banner image for your event (optional)
          </small>
          {uploading && <p className="uploading-text">Uploading image...</p>}
        </div>
      </section>

      {/* Publication */}
      <section className="form-section">
        <h3 className="section-title">🌐 Publication</h3>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(e) => handleChange('published', e.target.checked)}
            />
            <span>Publish event (visible to public)</span>
          </label>
          <small className="field-hint">
            Published events are visible to athletes and allow registrations
          </small>
        </div>
      </section>

      {/* Form Actions */}
      <div className="form-actions">
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={submitting || uploading}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner-small"></span>
              Saving...
            </>
          ) : (
            event ? 'Update Event' : 'Create Event'
          )}
        </button>
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>

      <style jsx>{`
        .event-form {
          max-width: 900px;
          margin: 0 auto;
        }
        
        .form-section {
          background: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .section-title {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 12px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #495057;
        }
        
        .required {
          color: #dc3545;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
        
        .form-group input.error,
        .form-group textarea.error,
        .form-group select.error {
          border-color: #dc3545;
        }
        
        .error-message {
          display: block;
          color: #dc3545;
          font-size: 12px;
          margin-top: 4px;
        }
        
        .field-hint {
          display: block;
          color: #6c757d;
          font-size: 12px;
          margin-top: 4px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        
        .checkbox-label input[type="checkbox"] {
          width: auto;
          cursor: pointer;
        }
        
        .uploading-text {
          color: #007bff;
          font-size: 14px;
          margin-top: 8px;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 24px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }
        
        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column-reverse;
          }
          
          .btn-primary,
          .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </form>
  );
};

export default EventForm;
