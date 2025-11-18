# Requirements Document

## Introduction

This feature introduces a time-based scoring system for WODs (Workouts of the Day) that allows tracking exercise completion status and recording maximum repetitions achieved when exercises are not completed within the time cap. This scoring mode complements the existing Classic and Advanced scoring systems by focusing on time-based performance metrics commonly used in functional fitness competitions.

## Glossary

- **System**: The Athleon platform scoring module
- **WOD**: Workout of the Day - a structured exercise routine with specific movements and time constraints
- **Time Cap**: The maximum allowed time to complete a specific WOD, configured per WOD
- **Exercise**: A specific movement or activity within a WOD (e.g., pull-ups, push-ups)
- **Completion Status**: Boolean indicator of whether an exercise was fully completed within the time cap
- **Max Reps**: The maximum number of repetitions achieved for an incomplete exercise
- **Score Entry Interface**: The UI component where judges/organizers input athlete performance data
- **Time-Based Score**: A score calculated based on completion time or reps achieved within a WOD-specific time cap
- **Athlete**: A participant in a competition who performs WODs
- **Judge**: A person authorized to record athlete performance scores
- **Organizer**: An event administrator who manages competitions and scoring systems
- **Time-Based Scoring System**: A scoring system type that enables time-capped performance tracking without a global time cap configuration

## Requirements

### Requirement 1

**User Story:** As an event organizer, I want to create a time-based scoring system for my WODs, so that I can accurately track athlete performance in time-capped workouts.

#### Acceptance Criteria

1. WHEN an Organizer creates a new scoring system, THE System SHALL provide an option to select "Time-Based" as the scoring type
2. WHEN the Organizer selects "Time-Based" scoring, THE System SHALL create the scoring system without requiring a global time cap configuration
3. WHEN the Organizer saves a time-based scoring system, THE System SHALL store the scoring system with the Event and make the scoring system available for WOD assignment
4. WHERE a time-based scoring system exists, THE System SHALL display the scoring system in the scoring systems list with a distinct "Time-Based" badge
5. WHEN an Organizer assigns a time-based scoring system to a WOD, THE System SHALL associate the scoring system with that WOD

### Requirement 2

**User Story:** As an event organizer, I want to configure a time cap for each WOD that uses time-based scoring, so that each workout can have its own time limit.

#### Acceptance Criteria

1. WHERE a WOD is assigned a time-based scoring system, THE System SHALL allow the Organizer to configure a Time Cap for that WOD in minutes and seconds
2. WHEN an Organizer configures a Time Cap for a WOD, THE System SHALL validate that the Time Cap is a positive duration greater than zero
3. WHEN an Organizer saves a WOD with a time-based scoring system, THE System SHALL store the Time Cap configuration with the WOD
4. WHEN an Organizer views a WOD with time-based scoring, THE System SHALL display the configured Time Cap
5. WHEN a Judge enters a score for a time-based WOD, THE System SHALL display the WOD Time Cap as reference information

### Requirement 3

**User Story:** As a judge, I want to record whether an athlete completed each exercise in a WOD, so that I can accurately document their performance.

#### Acceptance Criteria

1. WHEN a Judge enters a score for a WOD with time-based scoring, THE System SHALL display a completion checkbox for each Exercise in the WOD
2. WHEN a Judge marks an Exercise as completed, THE System SHALL record the Completion Status as true for that Exercise
3. WHEN a Judge leaves an Exercise unmarked, THE System SHALL record the Completion Status as false for that Exercise
4. WHILE entering scores, THE System SHALL allow the Judge to toggle Completion Status for any Exercise at any time
5. WHEN the Judge submits the score, THE System SHALL store all Completion Status values with the score record

### Requirement 4

**User Story:** As a judge, I want to record the maximum reps achieved for incomplete exercises, so that partial performance is accurately captured.

#### Acceptance Criteria

1. WHEN a Judge marks an Exercise as incomplete, THE System SHALL display an input field for Max Reps achieved
2. WHEN a Judge enters a rep count for an incomplete Exercise, THE System SHALL validate that the value is a positive integer
3. WHEN a Judge marks an Exercise as complete, THE System SHALL hide the Max Reps input field for that Exercise
4. WHEN a Judge submits a score with incomplete Exercises, THE System SHALL store the Max Reps value for each incomplete Exercise
5. IF a Judge attempts to submit without entering Max Reps for an incomplete Exercise, THEN THE System SHALL display a validation error message

### Requirement 5

**User Story:** As a judge, I want to record the completion time for athletes who finish within the time cap, so that rankings can be determined by time.

#### Acceptance Criteria

1. WHEN a Judge enters a score for a time-based WOD, THE System SHALL display an input field for completion time in minutes and seconds format
2. WHERE an Athlete completes all Exercises within the Time Cap, THE System SHALL allow the Judge to enter the exact completion time
3. WHEN a Judge enters a completion time, THE System SHALL validate that the completion time does not exceed the WOD Time Cap
4. WHEN a Judge submits a score with completion time, THE System SHALL store the completion time value and Time Cap value with the score record
5. WHERE an Athlete does not complete all Exercises, THE System SHALL record the Time Cap as the completion time

### Requirement 6

**User Story:** As an athlete, I want to view my time-based score with completion details, so that I can understand my performance breakdown.

#### Acceptance Criteria

1. WHEN an Athlete views their score for a time-based WOD, THE System SHALL display the completion time or Time Cap
2. WHEN an Athlete views their score, THE System SHALL display a list of all Exercises with Completion Status indicators
3. WHERE an Exercise was not completed, THE System SHALL display the Max Reps achieved for that Exercise
4. WHEN an Athlete views the leaderboard, THE System SHALL display scores sorted by Completion Status first, then by time or total reps
5. WHEN an Athlete clicks on a time-based score, THE System SHALL expand the view to show the detailed breakdown of Exercise completion and reps

### Requirement 7

**User Story:** As an organizer, I want the system to automatically calculate rankings for time-based WODs, so that leaderboards are accurate and fair.

#### Acceptance Criteria

1. WHEN scores are submitted for a time-based WOD, THE System SHALL rank Athletes who completed all Exercises by their completion time in ascending order
2. WHEN scores are submitted for a time-based WOD, THE System SHALL rank Athletes who did not complete all Exercises by total reps achieved in descending order
3. WHEN comparing Athletes with incomplete WODs, THE System SHALL prioritize Athletes who completed more Exercises over those who completed fewer
4. WHEN Athletes have the same Completion Status and time or reps, THE System SHALL assign them the same rank
5. WHEN the leaderboard is displayed, THE System SHALL show rank, Athlete name, completion time or reps, and Completion Status for each entry

### Requirement 8

**User Story:** As a system administrator, I want time-based scores to integrate with the existing scoring infrastructure, so that all scoring modes work consistently.

#### Acceptance Criteria

1. WHEN a Time-Based Score is submitted, THE System SHALL emit a ScoreCalculated event to EventBridge with time-based score details
2. WHEN a Time-Based Score is stored, THE System SHALL include rawData containing Exercise Completion Status values and Max Reps
3. WHEN a Time-Based Score is calculated, THE System SHALL generate a breakdown object with Exercise-level details
4. WHEN the leaderboard calculator processes Time-Based Scores, THE System SHALL apply time-based ranking logic
5. WHEN Time-Based Scores are cached, THE System SHALL store them in the LeaderboardCacheTable with the same structure as other scoring types
