const { rankTimeBasedScores } = require('../leaderboard-calculator');

describe('Leaderboard Calculator - Time-Based Ranking', () => {
  describe('rankTimeBasedScores', () => {
    it('should rank completed athletes by time in ascending order', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: true,
            completionTime: '09:30',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: true,
            completionTime: '08:45',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-3',
          breakdown: {
            allCompleted: true,
            completionTime: '10:00',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].athleteId).toBe('athlete-2'); // fastest at 08:45
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].athleteId).toBe('athlete-1'); // second at 09:30
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].athleteId).toBe('athlete-3'); // slowest at 10:00
      expect(ranked[2].rank).toBe(3);
    });

    it('should rank incomplete athletes by completed exercises then total reps', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 150,
            completedExercises: 2,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 175,
            completedExercises: 2,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-3',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 200,
            completedExercises: 1,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(3);
      // athlete-2 and athlete-1 both completed 2 exercises, but athlete-2 has more reps
      expect(ranked[0].athleteId).toBe('athlete-2');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].athleteId).toBe('athlete-1');
      expect(ranked[1].rank).toBe(2);
      // athlete-3 completed fewer exercises, so ranks last despite having most reps
      expect(ranked[2].athleteId).toBe('athlete-3');
      expect(ranked[2].rank).toBe(3);
    });

    it('should rank completed athletes before incomplete athletes', () => {
      const scores = [
        {
          athleteId: 'athlete-incomplete',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 200,
            completedExercises: 2,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-completed',
          breakdown: {
            allCompleted: true,
            completionTime: '09:59',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(2);
      // Completed athlete ranks first, even though incomplete athlete has more reps
      expect(ranked[0].athleteId).toBe('athlete-completed');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].athleteId).toBe('athlete-incomplete');
      expect(ranked[1].rank).toBe(2);
    });

    it('should handle mixed completed and incomplete athletes correctly', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 120,
            completedExercises: 2,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: true,
            completionTime: '09:30',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-3',
          breakdown: {
            allCompleted: true,
            completionTime: '08:45',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-4',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 180,
            completedExercises: 2,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-5',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 100,
            completedExercises: 1,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(5);
      
      // First two should be completed athletes, sorted by time
      expect(ranked[0].athleteId).toBe('athlete-3'); // completed, fastest
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].athleteId).toBe('athlete-2'); // completed, slower
      expect(ranked[1].rank).toBe(2);
      
      // Next should be incomplete athletes with 2 exercises, sorted by reps
      expect(ranked[2].athleteId).toBe('athlete-4'); // 2 exercises, 180 reps
      expect(ranked[2].rank).toBe(3);
      expect(ranked[3].athleteId).toBe('athlete-1'); // 2 exercises, 120 reps
      expect(ranked[3].rank).toBe(4);
      
      // Last should be incomplete athlete with only 1 exercise
      expect(ranked[4].athleteId).toBe('athlete-5'); // 1 exercise
      expect(ranked[4].rank).toBe(5);
    });

    it('should handle all athletes completed', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: true,
            completionTime: '10:00',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: true,
            completionTime: '09:00',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].athleteId).toBe('athlete-2');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].athleteId).toBe('athlete-1');
      expect(ranked[1].rank).toBe(2);
    });

    it('should handle all athletes incomplete', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 100,
            completedExercises: 1,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 150,
            completedExercises: 2,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].athleteId).toBe('athlete-2'); // more exercises completed
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].athleteId).toBe('athlete-1');
      expect(ranked[1].rank).toBe(2);
    });

    it('should handle single athlete', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: true,
            completionTime: '08:30',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(1);
      expect(ranked[0].athleteId).toBe('athlete-1');
      expect(ranked[0].rank).toBe(1);
    });

    it('should handle empty scores array', () => {
      const scores = [];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(0);
    });

    it('should preserve original score data while adding rank', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          scoreId: 'score-123',
          eventId: 'event-456',
          breakdown: {
            allCompleted: true,
            completionTime: '08:45',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked[0].athleteId).toBe('athlete-1');
      expect(ranked[0].scoreId).toBe('score-123');
      expect(ranked[0].eventId).toBe('event-456');
      expect(ranked[0].breakdown).toBeDefined();
      expect(ranked[0].rank).toBe(1);
    });

    it('should handle athletes with same completion time', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: true,
            completionTime: '09:00',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: true,
            completionTime: '09:00',
            totalReps: 150,
            completedExercises: 3,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(2);
      // Both should be ranked, order may vary but ranks should be sequential
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });

    it('should handle athletes with same exercises completed and same reps', () => {
      const scores = [
        {
          athleteId: 'athlete-1',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 150,
            completedExercises: 2,
            totalExercises: 3
          }
        },
        {
          athleteId: 'athlete-2',
          breakdown: {
            allCompleted: false,
            completionTime: '10:00',
            totalReps: 150,
            completedExercises: 2,
            totalExercises: 3
          }
        }
      ];

      const ranked = rankTimeBasedScores(scores);

      expect(ranked).toHaveLength(2);
      // Both should be ranked, order may vary but ranks should be sequential
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });
  });
});
