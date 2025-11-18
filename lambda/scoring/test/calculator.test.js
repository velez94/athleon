const { calculateScore } = require('../calculator');

describe('Score Calculator', () => {
  describe('Classic Mode', () => {
    it('should calculate rank-based score', () => {
      const scoringSystem = {
        type: 'classic',
        config: { baseScore: 100, decrement: 1 }
      };
      const rawData = { rank: 3 };
      
      const result = calculateScore(rawData, scoringSystem);
      expect(result.calculatedScore).toBe(98); // 100 - (3-1)*1
      expect(result.breakdown.formula).toBeDefined();
    });
  });

  describe('Advanced Mode', () => {
    it('should calculate EDS × EQS score', () => {
      const scoringSystem = {
        type: 'advanced',
        config: {
          exercises: [{
            exerciseId: 'ex-1',
            name: 'Test Exercise',
            baseScore: 5,
            modifiers: []
          }],
          timeBonuses: { '1': 10 }
        }
      };
      const rawData = {
        exercises: [{ exerciseId: 'ex-1', reps: 5, eqs: 4 }],
        rank: 1
      };
      
      const result = calculateScore(rawData, scoringSystem);
      expect(result.calculatedScore).toBe(110); // (5*5)*4 + 10
      expect(result.breakdown.totalEDS).toBe(100);
      expect(result.breakdown.timeBonus).toBe(10);
    });
  });

  describe('Time-Based Mode', () => {
    it('should calculate score for fully completed WOD', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: true, reps: 100 }
        ],
        completionTime: '08:45'
      };
      const wodTimeCap = '10:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.calculatedScore).toBe('08:45');
      expect(result.breakdown.allCompleted).toBe(true);
      expect(result.breakdown.completedExercises).toBe(2);
      expect(result.breakdown.totalExercises).toBe(2);
      expect(result.breakdown.completionTime).toBe('08:45');
      expect(result.breakdown.exercises).toHaveLength(2);
    });

    it('should calculate score for incomplete WOD with mixed completion status', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ],
        completionTime: '10:00'
      };
      const wodTimeCap = '10:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.calculatedScore).toBe(125); // 50 + 75
      expect(result.breakdown.allCompleted).toBe(false);
      expect(result.breakdown.totalReps).toBe(125);
      expect(result.breakdown.completedExercises).toBe(1);
      expect(result.breakdown.completionTime).toBe('10:00');
    });

    it('should handle zero maxReps for incomplete exercise', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: false, reps: 50, maxReps: 0 }
        ],
        completionTime: '10:00'
      };
      const wodTimeCap = '10:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.calculatedScore).toBe(0);
      expect(result.breakdown.allCompleted).toBe(false);
      expect(result.breakdown.totalReps).toBe(0);
      expect(result.breakdown.completedExercises).toBe(0);
    });

    it('should handle all exercises incomplete', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: false, reps: 50, maxReps: 30 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 60 },
          { exerciseId: 'ex-3', exerciseName: 'Squats', completed: false, reps: 75, maxReps: 40 }
        ],
        completionTime: '10:00'
      };
      const wodTimeCap = '10:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.calculatedScore).toBe(130); // 30 + 60 + 40
      expect(result.breakdown.allCompleted).toBe(false);
      expect(result.breakdown.totalReps).toBe(130);
      expect(result.breakdown.completedExercises).toBe(0);
      expect(result.breakdown.totalExercises).toBe(3);
    });

    it('should handle single exercise WOD', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Burpees', completed: true, reps: 100 }
        ],
        completionTime: '04:30'
      };
      const wodTimeCap = '05:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.calculatedScore).toBe('04:30');
      expect(result.breakdown.allCompleted).toBe(true);
      expect(result.breakdown.completedExercises).toBe(1);
      expect(result.breakdown.totalExercises).toBe(1);
      expect(result.breakdown.totalReps).toBe(100);
    });

    it('should handle missing maxReps as zero for incomplete exercise', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100 }
          // maxReps is missing
        ],
        completionTime: '10:00'
      };
      const wodTimeCap = '10:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.calculatedScore).toBe(50); // 50 + 0 (missing maxReps treated as 0)
      expect(result.breakdown.allCompleted).toBe(false);
      expect(result.breakdown.totalReps).toBe(50);
      expect(result.breakdown.completedExercises).toBe(1);
    });

    it('should include exercise breakdown with all details', () => {
      const scoringSystem = {
        type: 'time-based',
        config: {}
      };
      const rawData = {
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Pull Ups', completed: true, reps: 50 },
          { exerciseId: 'ex-2', exerciseName: 'Push Ups', completed: false, reps: 100, maxReps: 75 }
        ],
        completionTime: '10:00'
      };
      const wodTimeCap = '10:00';
      
      const result = calculateScore(rawData, scoringSystem, wodTimeCap);
      
      expect(result.breakdown.exercises).toHaveLength(2);
      expect(result.breakdown.exercises[0]).toEqual({
        exerciseId: 'ex-1',
        exerciseName: 'Pull Ups',
        completed: true,
        maxReps: undefined,
        reps: 50
      });
      expect(result.breakdown.exercises[1]).toEqual({
        exerciseId: 'ex-2',
        exerciseName: 'Push Ups',
        completed: false,
        maxReps: 75,
        reps: 100
      });
    });
  });
});
