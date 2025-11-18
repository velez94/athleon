# Implementation Plan

- [x] 1. Enhance backend score calculator with time-based scoring logic
  - Add `calculateTimeBasedScore()` function to `lambda/scoring/calculator.js`
  - Implement logic to determine if all exercises are completed
  - Calculate total reps for incomplete WODs (sum of completed reps + maxReps)
  - Generate breakdown object with exercise-level completion details
  - Integrate time-based calculation into main `calculateScore()` function
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 7.3_

- [x] 2. Add time-based score validation to score submission handler
  - Enhance `lambda/scoring/index.js` to validate time-based score submissions
  - Implement validation for exercise completion status (all exercises must have boolean completed field)
  - Validate incomplete exercises have maxReps value
  - Add time format validation helper function `parseTimeToSeconds()`
  - Validate completion time doesn't exceed configured time cap
  - Return appropriate error messages for validation failures
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5, 4.3_

- [x] 3. Implement time-based ranking algorithm for leaderboards
  - Add `rankTimeBasedScores()` function to `lambda/scoring/leaderboard-calculator.js`
  - Separate scores into completed vs incomplete groups
  - Sort completed scores by time in ascending order (faster is better)
  - Sort incomplete scores by completed exercises count (descending), then total reps (descending)
  - Assign ranks with completed athletes ranked before incomplete athletes
  - Integrate time-based ranking into existing `calculateEventLeaderboard()` function
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.4_

- [x] 4. Add helper utilities for time parsing and formatting
  - Create utility functions in `lambda/scoring/utils.js`
  - Implement `parseTimeToSeconds(timeString)` to convert "mm:ss" to seconds
  - Implement `formatSecondsToTime(seconds)` to convert seconds to "mm:ss"
  - Add time comparison helper for validation
  - Implement `isValidTimeFormat()` and `exceedsTimeCap()` helpers
  - _Requirements: 4.3, 6.1_

- [x] 5. Write backend unit tests for time-based scoring
  - Create test file `lambda/scoring/test/calculator.test.js`
  - Write tests for `calculateTimeBasedScore()` with fully completed WOD
  - Write tests for incomplete WOD with mixed completion status
  - Write tests for edge cases (zero maxReps, all incomplete, single exercise)
  - Create test file `lambda/scoring/test/leaderboard-calculator.test.js`
  - Write tests for `rankTimeBasedScores()` with completed athletes only
  - Write tests for incomplete athletes ranking by exercises then reps
  - Write tests for mixed completed and incomplete athletes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3, 7.4_

- [x] 6. Enhance WOD Lambda handler to support time cap configuration
  - Modify `lambda/wods/index.js` to accept timeCap field in WOD creation/update
  - Add validation logic to require timeCap when scoringSystemId references time-based system
  - Validate timeCap format (minutes >= 0, seconds 0-59, total > 0)
  - Store timeCap in WOD record when provided
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Update score submission to fetch and use WOD time cap
  - Modify `lambda/scoring/index.js` to fetch WOD record when processing time-based scores
  - Extract timeCap from WOD record and pass to calculator
  - Update validation to use WOD-specific time cap instead of scoring system config
  - _Requirements: 2.5, 5.3_

- [x] 7.1 Configure DDD bounded context cross-context read permissions





  - Update `infrastructure/scoring/scoring-stack.ts` to accept `wodsTable` prop
  - Add `WODS_TABLE` environment variable to Scoring Lambda
  - Grant read-only access: `props.wodsTable.grantReadData(this.scoresLambda)`
  - Update `infrastructure/wods/wods-stack.ts` to accept `scoringSystemsTable` prop
  - Add `SCORING_SYSTEMS_TABLE` environment variable to WOD Lambda
  - Grant read-only access: `props.scoringSystemsTable.grantReadData(this.wodsLambda)`
  - Update `infrastructure/main-stack.ts` to pass table references between stacks
  - Pass `wodsTable: wodsStack.wodsTable` to ScoringStack
  - Pass `scoringSystemsTable: scoringStack.scoringSystemsTable` to WodsStack
  - Verify IAM policies enforce read-only access (no write permissions across contexts)
  - _Requirements: 2.5, 5.3 (Infrastructure support for cross-context reads)_
  - _DDD Pattern: Read-only cross-context access with proper IAM enforcement_

- [x] 8. Create time-based score display component
  - Create file `frontend/src/components/athlete/ScoreDetails.jsx`
  - Display completion status header (completed with time or time cap reached with reps)
  - Render exercise breakdown list with completion status indicators
  - Show maxReps for incomplete exercises in format "achieved/target reps"
  - Display completion summary with exercises completed count and total reps
  - Add CSS styling for completed vs incomplete status indicators
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 9. Enhance leaderboard display with time-based score formatting
  - Modify `frontend/src/components/backoffice/Leaderboard.jsx`
  - Add conditional rendering for time-based scores in leaderboard rows
  - Display completion time with clock icon for completed athletes
  - Display total reps and exercises completed for incomplete athletes
  - Update leaderboard sorting to respect time-based ranking (completed first, then by time/reps)
  - _Requirements: 5.4, 6.5_

- [ ] 10. Create scoring system management UI component




  - Create new file `frontend/src/components/backoffice/ScoringSystemManager.jsx`
  - Implement form for creating scoring systems with type selection dropdown
  - Add "Time-Based" option to scoring type dropdown
  - Display info message that time caps are configured per WOD (not globally)
  - Implement API calls to create, read, update, and delete scoring systems
  - Display existing scoring systems with "Time-Based" badge for time-based type
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
-

- [x] 11. Add WOD time cap configuration UI



  - Enhance `frontend/src/components/backoffice/WodManager.jsx` or equivalent WOD management component
  - Add time cap input fields (minutes and seconds) that appear when time-based scoring system is selected
  - Implement validation for time cap values (positive integers, seconds 0-59)
  - Display time cap configuration in WOD list/details view
  - Update WOD creation/edit API calls to include timeCap field
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 12. Complete score entry UI with time-based scoring mode




  - Enhance `frontend/src/components/backoffice/ScoreEntry.jsx` to fully support time-based scoring
  - Complete state management for exercise completion status array (partially implemented)
  - Ensure completion checkbox for each exercise renders correctly when time-based scoring is active
  - Verify show/hide maxReps input field based on exercise completion status
  - Complete completion time input field with mm:ss format validation
  - Display time cap from WOD configuration (not scoring system)
  - Complete client-side validation for all time-based fields
  - Update score submission payload to include time-based rawData structure
  - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Write frontend component tests for time-based UI

  - Test file `frontend/src/components/backoffice/__tests__/ScoreEntry.test.jsx` exists
  - Tests for rendering exercise completion checkboxes exist
  - Tests for showing/hiding maxReps input based on completion status exist
  - Test file `frontend/src/components/athlete/__tests__/ScoreDetails.test.jsx` exists
  - Tests for displaying completed vs incomplete score details exist
  - Tests for exercise breakdown rendering exist
  - _Requirements: 2.1, 2.2, 3.1, 3.3, 4.1, 5.1, 5.2, 5.3_
-

- [x] 14. Create integration tests for end-to-end time-based scoring flow





  - Create test file `lambda/scoring/test/integration.test.js` if it doesn't exist
  - Write test for creating time-based scoring system
  - Write test for submitting score with all exercises completed
  - Write test for submitting score with incomplete exercises
  - Write test for validation error when maxReps missing
  - Write test for validation error when completion time exceeds time cap
  - Verify EventBridge event emission with time-based score details
  - _Requirements: 1.1, 1.2, 1.3, 2.5, 3.5, 4.4, 7.1, 7.2_

- [x] 15. Add end-to-end tests for complete user workflow






  - Create test file `e2e-tests/tests/time-based-scoring.spec.js`
  - Write test for organizer creating time-based scoring system
  - Write test for assigning time-based scoring system to WOD with time cap
  - Write test for judge submitting score with all exercises completed
  - Write test for judge submitting score with incomplete exercises
  - Write test for athlete viewing their time-based score details
  - Write test for viewing leaderboard with mixed completed/incomplete scores
  - Verify ranking order (completed first, sorted by time, then incomplete sorted by reps)
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.5, 3.4, 4.4, 5.1, 5.4, 6.1, 6.2, 6.5_
