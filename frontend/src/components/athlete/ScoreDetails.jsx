import './ScoreDetails.css';

function ScoreDetails({ score }) {
  // Handle non-time-based scores or missing breakdown
  if (!score.breakdown || !score.breakdown.exercises) {
    return (
      <div className="score-details-simple">
        <div className="score-value-simple">
          <span className="label">Score:</span>
          <span className="value">{score.score}</span>
        </div>
      </div>
    );
  }

  const { breakdown } = score;
  const isTimeBased = breakdown.allCompleted !== undefined;

  // If not time-based, return simple display
  if (!isTimeBased) {
    return (
      <div className="score-details-simple">
        <div className="score-value-simple">
          <span className="label">Score:</span>
          <span className="value">{score.score}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="time-based-score-details">
      {/* Completion Status Header */}
      <div className={`completion-header ${breakdown.allCompleted ? 'completed' : 'incomplete'}`}>
        {breakdown.allCompleted ? (
          <>
            <span className="status-icon">✅</span>
            <div className="status-text">
              <h3>Completed</h3>
              <p className="completion-time">Time: {breakdown.completionTime}</p>
            </div>
          </>
        ) : (
          <>
            <span className="status-icon">⏱️</span>
            <div className="status-text">
              <h3>Time Cap Reached</h3>
              <p className="total-reps">{breakdown.totalReps} reps completed</p>
            </div>
          </>
        )}
      </div>

      {/* Exercise Breakdown List */}
      <div className="exercise-breakdown">
        <h4>Exercise Breakdown</h4>
        <div className="exercise-list">
          {breakdown.exercises.map((exercise, idx) => (
            <div 
              key={idx} 
              className={`exercise-item ${exercise.completed ? 'completed' : 'incomplete'}`}
            >
              <div className="exercise-info">
                <span className="exercise-name">{exercise.exerciseName}</span>
                <span className={`completion-indicator ${exercise.completed ? 'completed' : 'incomplete'}`}>
                  {exercise.completed ? '✓' : '✗'}
                </span>
              </div>
              <div className="exercise-reps">
                {exercise.completed ? (
                  <span className="reps-completed">{exercise.reps} reps</span>
                ) : (
                  <span className="reps-partial">
                    {exercise.maxReps}/{exercise.reps} reps
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion Summary */}
      <div className="completion-summary">
        <div className="summary-stat">
          <span className="stat-label">Exercises Completed</span>
          <span className="stat-value">
            {breakdown.completedExercises}/{breakdown.totalExercises}
          </span>
        </div>
        {!breakdown.allCompleted && (
          <div className="summary-stat">
            <span className="stat-label">Total Reps</span>
            <span className="stat-value">{breakdown.totalReps}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoreDetails;
