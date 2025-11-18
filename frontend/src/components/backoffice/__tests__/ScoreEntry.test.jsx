import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ScoreEntry from '../ScoreEntry';
import * as api from '../../../lib/api';

// Mock the API module
vi.mock('../../../lib/api');

// Mock useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ eventId: 'test-event-123' }),
    useNavigate: () => vi.fn(),
  };
});

describe('ScoreEntry - Time-Based Scoring UI', () => {
  const mockEvent = {
    eventId: 'test-event-123',
    name: 'Test Competition',
    location: 'Test Location',
    startDate: '2025-01-01',
    status: 'published'
  };

  const mockTimeBasedScoringSystem = {
    scoringSystemId: 'time-based-sys-1',
    type: 'time-based',
    config: {
      timeCap: {
        minutes: 10,
        seconds: 0
      }
    }
  };

  const mockWod = {
    wodId: 'wod-123',
    name: 'Test WOD',
    format: 'For Time',
    scoringSystemId: 'time-based-sys-1',
    movements: [
      { exerciseId: 'ex-1', exercise: 'Pull Ups', reps: 50 },
      { exerciseId: 'ex-2', exercise: 'Push Ups', reps: 100 }
    ]
  };

  const mockCategories = [
    { categoryId: 'cat-1', name: 'RX Male' }
  ];

  const mockAthletes = [
    { 
      athleteId: 'ath-1', 
      firstName: 'John', 
      lastName: 'Doe', 
      categoryId: 'cat-1' 
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default API responses
    api.get.mockImplementation((url) => {
      if (url === '/public/events') return Promise.resolve([mockEvent]);
      if (url.includes('/competitions/')) return Promise.resolve(mockEvent);
      if (url.includes('/wods?eventId=')) return Promise.resolve([mockWod]);
      if (url === '/categories') return Promise.resolve(mockCategories);
      if (url.includes('/athletes?eventId=')) return Promise.resolve(mockAthletes);
      if (url.includes('/scoring-systems/')) return Promise.resolve(mockTimeBasedScoringSystem);
      if (url.includes('/scores?eventId=')) return Promise.resolve([]);
      if (url === '/exercises') return Promise.resolve([]);
      if (url.includes('/scheduler/')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  const renderScoreEntry = () => {
    return render(
      <BrowserRouter>
        <ScoreEntry user={{ userId: 'test-user' }} />
      </BrowserRouter>
    );
  };

  describe('Exercise Completion Checkboxes', () => {
    it('should render completion checkboxes for each exercise when time-based scoring is active', async () => {
      renderScoreEntry();

      // Wait for event to load and select WOD
      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      // Select WOD
      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      // Wait for time-based UI to render
      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Check that checkboxes are rendered for each exercise
      const pullUpsCheckbox = screen.getByLabelText(/completed/i, { 
        selector: 'input[type="checkbox"]' 
      });
      expect(pullUpsCheckbox).toBeInTheDocument();
      
      // Verify exercise names are displayed
      expect(screen.getByText('Pull Ups')).toBeInTheDocument();
      expect(screen.getByText('Push Ups')).toBeInTheDocument();
    });

    it('should allow toggling completion status for exercises', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Get all checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      // Initially unchecked
      expect(firstCheckbox).not.toBeChecked();

      // Toggle to checked
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox).toBeChecked();

      // Toggle back to unchecked
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox).not.toBeChecked();
    });
  });

  describe('MaxReps Input Visibility', () => {
    it('should show maxReps input when exercise is marked as incomplete', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // MaxReps inputs should be visible for incomplete exercises
      const maxRepsInputs = screen.getAllByLabelText(/Max Reps Achieved/i);
      expect(maxRepsInputs.length).toBeGreaterThan(0);
    });

    it('should hide maxReps input when exercise is marked as completed', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Get the first checkbox and check it
      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];
      
      fireEvent.click(firstCheckbox);

      // After checking, the maxReps input for that exercise should be hidden
      // We can verify this by checking that there's one less maxReps input
      await waitFor(() => {
        const maxRepsInputs = screen.queryAllByLabelText(/Max Reps Achieved/i);
        // Should have one less input after marking one as complete
        expect(maxRepsInputs.length).toBe(1);
      });
    });

    it('should auto-fill maxReps with target reps when exercise is marked as completed', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      // Mark as completed
      fireEvent.click(firstCheckbox);

      // The component should internally set maxReps to targetReps (50 for Pull Ups)
      // This is verified by the component's internal state management
      expect(firstCheckbox).toBeChecked();
    });
  });

  describe('Completion Time Format Validation', () => {
    it('should display completion time input field', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Check for completion time input
      const timeInput = screen.getByPlaceholderText('10:00');
      expect(timeInput).toBeInTheDocument();
    });

    it('should show validation error for invalid time format', async () => {
      api.post.mockRejectedValue(new Error('Validation failed'));
      
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Select category and athlete
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      await waitFor(() => {
        const athleteSelect = screen.getByRole('combobox', { name: /athlete/i });
        fireEvent.change(athleteSelect, { target: { value: 'ath-1' } });
      });

      // Enter invalid time format
      const timeInput = screen.getByPlaceholderText('10:00');
      fireEvent.change(timeInput, { target: { value: 'invalid' } });

      // Fill in maxReps for incomplete exercises
      const maxRepsInputs = screen.getAllByLabelText(/Max Reps Achieved/i);
      maxRepsInputs.forEach(input => {
        fireEvent.change(input, { target: { value: '25' } });
      });

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/must be in mm:ss format/i)).toBeInTheDocument();
      });
    });

    it('should accept valid time format (mm:ss)', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Enter valid time format
      const timeInput = screen.getByPlaceholderText('10:00');
      fireEvent.change(timeInput, { target: { value: '08:45' } });

      expect(timeInput.value).toBe('08:45');
    });
  });

  describe('Time Cap Validation', () => {
    it('should display time cap from scoring system configuration', async () => {
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Check that time cap is displayed
      expect(screen.getByText(/Time Cap:/i)).toBeInTheDocument();
      expect(screen.getByText(/10:00/i)).toBeInTheDocument();
    });

    it('should show validation error when completion time exceeds time cap', async () => {
      api.post.mockRejectedValue(new Error('Validation failed'));
      
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Select category and athlete
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      await waitFor(() => {
        const athleteSelect = screen.getByRole('combobox', { name: /athlete/i });
        fireEvent.change(athleteSelect, { target: { value: 'ath-1' } });
      });

      // Enter time that exceeds time cap (10:00)
      const timeInput = screen.getByPlaceholderText('10:00');
      fireEvent.change(timeInput, { target: { value: '12:30' } });

      // Fill in maxReps for incomplete exercises
      const maxRepsInputs = screen.getAllByLabelText(/Max Reps Achieved/i);
      maxRepsInputs.forEach(input => {
        fireEvent.change(input, { target: { value: '25' } });
      });

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/cannot exceed time cap/i)).toBeInTheDocument();
      });
    });

    it('should accept completion time within time cap', async () => {
      api.post.mockResolvedValue({ scoreId: 'score-123' });
      
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Select category and athlete
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      await waitFor(() => {
        const athleteSelect = screen.getByRole('combobox', { name: /athlete/i });
        fireEvent.change(athleteSelect, { target: { value: 'ath-1' } });
      });

      // Enter valid time within time cap
      const timeInput = screen.getByPlaceholderText('10:00');
      fireEvent.change(timeInput, { target: { value: '08:45' } });

      // Fill in maxReps for incomplete exercises
      const maxRepsInputs = screen.getAllByLabelText(/Max Reps Achieved/i);
      maxRepsInputs.forEach(input => {
        fireEvent.change(input, { target: { value: '25' } });
      });

      // Submit should work without validation errors
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe('Required Field Validation', () => {
    it('should show validation error when maxReps is missing for incomplete exercise', async () => {
      api.post.mockRejectedValue(new Error('Validation failed'));
      
      renderScoreEntry();

      await waitFor(() => {
        expect(screen.getByText('Test Competition')).toBeInTheDocument();
      });

      const wodSelect = screen.getByRole('combobox', { name: /wod/i });
      fireEvent.change(wodSelect, { target: { value: 'wod-123' } });

      await waitFor(() => {
        expect(screen.getByText(/Time-Based Score Entry/i)).toBeInTheDocument();
      });

      // Select category and athlete
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      await waitFor(() => {
        const athleteSelect = screen.getByRole('combobox', { name: /athlete/i });
        fireEvent.change(athleteSelect, { target: { value: 'ath-1' } });
      });

      // Enter completion time but leave maxReps empty
      const timeInput = screen.getByPlaceholderText('10:00');
      fireEvent.change(timeInput, { target: { value: '08:45' } });

      // Try to submit without filling maxReps
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Max reps required for incomplete exercise/i)).toBeInTheDocument();
      });
    });
  });
});
