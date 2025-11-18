# Time-Based Scoring E2E Tests

## Overview

This test suite provides comprehensive end-to-end testing for the time-based scoring feature in the Athleon platform. It validates the complete user workflow from scoring system creation through leaderboard display.

## Test Coverage

### Main Workflow Test: `complete time-based scoring workflow`

This comprehensive test validates the entire time-based scoring feature across 8 phases:

#### Phase 1: Organizer Creates Time-Based Scoring System
- **Requirements Validated**: 1.1, 1.2, 1.4
- **Actions**:
  - Login as organizer
  - Create a test event
  - Navigate to scoring systems management
  - Create time-based scoring system
  - Verify "Time-Based" badge appears
  - Verify info message about per-WOD time cap configuration

#### Phase 2: Organizer Assigns Time-Based Scoring to WOD with Time Cap
- **Requirements Validated**: 1.5, 2.1, 2.2, 2.3, 2.4
- **Actions**:
  - Create a category for the event
  - Create a WOD with time-based scoring system
  - Configure time cap (10:00)
  - Add multiple movements (Pull-ups, Push-ups, Air Squats)
  - Verify time cap fields are visible when time-based scoring is selected
  - Verify time cap is displayed in WOD list
  - Publish the event

#### Phase 3: Judge Submits Score with All Exercises Completed
- **Requirements Validated**: 2.5, 3.1, 3.2, 3.4, 4.3, 5.2
- **Actions**:
  - Login as organizer (acting as judge)
  - Navigate to score entry
  - Select athlete, category, and WOD
  - Verify time cap is displayed
  - Mark all exercises as completed
  - Verify max reps inputs are hidden for completed exercises
  - Enter completion time (8:45)
  - Submit score
  - Verify success message

#### Phase 4: Judge Submits Score with Incomplete Exercises
- **Requirements Validated**: 3.3, 4.1, 4.2, 4.4
- **Actions**:
  - Enter score for different athlete
  - Mark first two exercises as completed
  - Leave third exercise incomplete
  - Verify max reps input is visible for incomplete exercise
  - Enter max reps for incomplete exercise (250/300)
  - Enter completion time at time cap (10:00)
  - Submit score
  - Verify success message

#### Phase 5: Athlete Views Their Time-Based Score Details
- **Requirements Validated**: 5.1, 6.1, 6.2, 6.3
- **Actions**:
  - Logout and login as athlete
  - Navigate to profile and scores tab
  - Find and click on score for test event
  - Verify score details are displayed
  - Verify completion time or time cap is shown
  - Verify exercise breakdown is displayed
  - Verify completion status for each exercise
  - Verify max reps shown for incomplete exercises
  - Verify completion summary is displayed

#### Phase 6: View Leaderboard with Mixed Completed/Incomplete Scores
- **Requirements Validated**: 5.4, 6.5
- **Actions**:
  - Logout and login as organizer
  - Navigate to event leaderboard
  - Select category and WOD filters
  - Verify leaderboard table is displayed
  - Verify at least 2 entries are shown

#### Phase 7: Verify Ranking Order
- **Requirements Validated**: 6.1, 6.2, 7.1, 7.2, 7.3, 7.4
- **Actions**:
  - Verify first entry is completed athlete with time (8:45)
  - Verify second entry is incomplete athlete with reps/exercises count
  - Verify completed athletes are ranked before incomplete
  - Verify each row shows rank, athlete name, and score
  - Verify proper ranking order is maintained

#### Phase 8: Verify Leaderboard Entry Details
- **Requirements Validated**: 6.5
- **Actions**:
  - Click on leaderboard entry
  - Verify detailed breakdown modal appears
  - Verify exercise breakdown is displayed
  - Close modal

### Validation Tests

#### Test: `should validate time cap requirement for time-based WODs`
- **Requirements Validated**: 2.2
- **Purpose**: Ensures time cap is required when creating WOD with time-based scoring
- **Actions**:
  - Create event and time-based scoring system
  - Attempt to create WOD without time cap
  - Verify validation error is displayed

#### Test: `should validate max reps requirement for incomplete exercises`
- **Requirements Validated**: 4.5
- **Purpose**: Ensures max reps is required for incomplete exercises
- **Actions**:
  - Navigate to score entry
  - Mark exercise as incomplete
  - Attempt to submit without entering max reps
  - Verify validation error is displayed

#### Test: `should validate completion time does not exceed time cap`
- **Requirements Validated**: 5.3
- **Purpose**: Ensures completion time cannot exceed WOD time cap
- **Actions**:
  - Navigate to score entry
  - Mark all exercises as completed
  - Enter completion time exceeding time cap (12:30 > 10:00)
  - Verify validation error is displayed

## Requirements Coverage

This test suite validates the following requirements from the design document:

- **Requirement 1**: Scoring system creation (1.1, 1.2, 1.4, 1.5)
- **Requirement 2**: Time cap configuration (2.1, 2.2, 2.3, 2.4, 2.5)
- **Requirement 3**: Exercise completion tracking (3.1, 3.2, 3.3, 3.4)
- **Requirement 4**: Max reps recording (4.1, 4.2, 4.3, 4.4, 4.5)
- **Requirement 5**: Completion time recording (5.1, 5.2, 5.3, 5.4)
- **Requirement 6**: Score display and leaderboard (6.1, 6.2, 6.3, 6.5)
- **Requirement 7**: Ranking algorithm (7.1, 7.2, 7.3, 7.4)

## Prerequisites

### Environment Variables

Create a `.env` file in the `e2e-tests` directory with the following variables:

```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Test user credentials
TEST_ORGANIZER_EMAIL=organizer@test.com
TEST_ORGANIZER_PASSWORD=your-password

TEST_ATHLETE_EMAIL=athlete@test.com
TEST_ATHLETE_PASSWORD=your-password

# API endpoints
API_BASE_URL=https://your-api-gateway-url.amazonaws.com/dev
```

### Test Data Requirements

The tests assume:
1. Test organizer account exists and has permissions to create events
2. Test athlete account exists and can register for events
3. At least 2 test athletes exist for scoring (to test leaderboard ranking)
4. Frontend application is running and accessible at BASE_URL
5. Backend API is deployed and accessible

## Running the Tests

### Run all time-based scoring tests:
```bash
cd e2e-tests
npm test tests/time-based-scoring.spec.js
```

### Run in headed mode (see browser):
```bash
npm run test:headed tests/time-based-scoring.spec.js
```

### Run in debug mode:
```bash
npm run test:debug tests/time-based-scoring.spec.js
```

### Run in UI mode (interactive):
```bash
npm run test:ui tests/time-based-scoring.spec.js
```

### Run specific test:
```bash
npm test tests/time-based-scoring.spec.js -g "complete time-based scoring workflow"
```

## Test Data Cleanup

The test suite includes automatic cleanup in the `afterEach` hook:
- All created events are deleted after each test
- User logout is performed after each test
- Cleanup failures are logged but don't fail the test

## Known Limitations

1. **Test Data Dependencies**: Tests assume certain UI elements exist with specific `data-testid` attributes. If the frontend implementation uses different test IDs, the tests will need to be updated.

2. **Timing**: Some operations may require additional wait time depending on API response times. The tests use Playwright's auto-waiting, but timeouts may need adjustment for slower environments.

3. **Test Isolation**: The main workflow test is not fully isolated - it creates multiple resources in sequence. If one phase fails, subsequent phases may also fail.

4. **Athlete Selection**: Tests assume at least 2 athletes exist in the system. If fewer athletes exist, some tests may fail.

## Troubleshooting

### Test fails at login
- Verify credentials in `.env` file are correct
- Check that test users exist in Cognito
- Verify BASE_URL is accessible

### Test fails at element selection
- Check that frontend uses expected `data-testid` attributes
- Verify frontend is running at BASE_URL
- Check browser console for JavaScript errors

### Test fails at score submission
- Verify backend API is deployed and accessible
- Check API_BASE_URL in `.env` file
- Verify DynamoDB tables exist and have correct permissions

### Cleanup fails
- Check that test user has permissions to delete events
- Verify event IDs are being captured correctly
- Check browser console for errors during cleanup

## Future Enhancements

1. **Property-Based Testing**: Add property-based tests for ranking algorithm
2. **Performance Testing**: Add tests for leaderboard calculation with large datasets
3. **Accessibility Testing**: Add tests for WCAG compliance
4. **Mobile Testing**: Expand mobile viewport testing
5. **API Testing**: Add direct API tests for backend validation
6. **Visual Regression**: Add screenshot comparison tests

## Related Documentation

- [Requirements Document](../../.kiro/specs/time-based-scoring-completion-tracking/requirements.md)
- [Design Document](../../.kiro/specs/time-based-scoring-completion-tracking/design.md)
- [Tasks Document](../../.kiro/specs/time-based-scoring-completion-tracking/tasks.md)
- [Playwright Documentation](https://playwright.dev/)
