import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScoreDetails from '../ScoreDetails';

describe('ScoreDetails Component', () => {
  it('renders simple score display for non-time-based scores', () => {
    const score = {
      score: 150,
      breakdown: null
    };

    render(<ScoreDetails score={score} />);
    expect(screen.getByText('Score:')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('displays completed status for fully completed time-based WOD', () => {
    const score = {
      score: '08:45',
      breakdown: {
        allCompleted: true,
        completionTime: '08:45',
        completedExercises: 2,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: true, reps: 100 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Time: 08:45')).toBeInTheDocument();
    expect(screen.getByText('Pull Ups')).toBeInTheDocument();
    expect(screen.getByText('Push Ups')).toBeInTheDocument();
  });

  it('displays incomplete status for time-capped WOD', () => {
    const score = {
      score: 125,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 125,
        completedExercises: 1,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    expect(screen.getByText('Time Cap Reached')).toBeInTheDocument();
    expect(screen.getByText('125 reps completed')).toBeInTheDocument();
    expect(screen.getByText('75/100 reps')).toBeInTheDocument();
  });

  it('shows exercise breakdown with completion indicators', () => {
    const score = {
      score: 125,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 125,
        completedExercises: 1,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    
    const exerciseItems = screen.getAllByText(/Pull Ups|Push Ups/);
    expect(exerciseItems).toHaveLength(2);
    
    // Check for completion indicators
    const completedIndicators = document.querySelectorAll('.completion-indicator.completed');
    const incompleteIndicators = document.querySelectorAll('.completion-indicator.incomplete');
    expect(completedIndicators).toHaveLength(1);
    expect(incompleteIndicators).toHaveLength(1);
  });

  it('displays completion summary with correct stats', () => {
    const score = {
      score: 125,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 125,
        completedExercises: 1,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    expect(screen.getByText('Exercises Completed')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Total Reps')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('displays maxReps for incomplete exercises in correct format', () => {
    const score = {
      score: 125,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 125,
        completedExercises: 1,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    
    // Check that maxReps is displayed in "achieved/target" format
    expect(screen.getByText('75/100 reps')).toBeInTheDocument();
  });

  it('shows only completed reps for fully completed exercises', () => {
    const score = {
      score: '08:45',
      breakdown: {
        allCompleted: true,
        completionTime: '08:45',
        completedExercises: 2,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: true, reps: 100 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    
    // Check that completed exercises show only reps count
    expect(screen.getByText('50 reps')).toBeInTheDocument();
    expect(screen.getByText('100 reps')).toBeInTheDocument();
  });

  it('does not display total reps summary for fully completed WODs', () => {
    const score = {
      score: '08:45',
      breakdown: {
        allCompleted: true,
        completionTime: '08:45',
        completedExercises: 2,
        totalExercises: 2,
        totalReps: 150,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: true, reps: 100 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    
    // Total Reps should not be displayed for completed WODs
    expect(screen.queryByText('Total Reps')).not.toBeInTheDocument();
  });

  it('handles score with no exercises gracefully', () => {
    const score = {
      score: 0,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 0,
        completedExercises: 0,
        totalExercises: 0,
        exercises: []
      }
    };

    render(<ScoreDetails score={score} />);
    
    // Should still render the component without errors
    expect(screen.getByText('Time Cap Reached')).toBeInTheDocument();
    expect(screen.getByText('0 reps completed')).toBeInTheDocument();
  });

  it('displays correct completion indicators (checkmark and X)', () => {
    const score = {
      score: 125,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 125,
        completedExercises: 1,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    
    // Check for visual indicators
    const completedIndicators = document.querySelectorAll('.completion-indicator.completed');
    const incompleteIndicators = document.querySelectorAll('.completion-indicator.incomplete');
    
    expect(completedIndicators).toHaveLength(1);
    expect(incompleteIndicators).toHaveLength(1);
    
    // Check that the indicators contain the correct symbols
    expect(completedIndicators[0].textContent).toContain('✓');
    expect(incompleteIndicators[0].textContent).toContain('✗');
  });

  it('renders exercise breakdown section with proper heading', () => {
    const score = {
      score: 125,
      breakdown: {
        allCompleted: false,
        completionTime: '10:00',
        totalReps: 125,
        completedExercises: 1,
        totalExercises: 2,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ]
      }
    };

    render(<ScoreDetails score={score} />);
    
    expect(screen.getByText('Exercise Breakdown')).toBeInTheDocument();
  });
});
