# Quick Start: Running Time-Based Scoring E2E Tests

## Prerequisites

1. **Environment Setup**
   ```bash
   cd e2e-tests
   npm install
   npm run install  # Install Playwright browsers
   ```

2. **Configure Test Credentials**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   ```bash
   BASE_URL=http://localhost:3000
   TEST_ORGANIZER_EMAIL=your-organizer@test.com
   TEST_ORGANIZER_PASSWORD=your-password
   TEST_ATHLETE_EMAIL=your-athlete@test.com
   TEST_ATHLETE_PASSWORD=your-password
   API_BASE_URL=https://your-api.amazonaws.com/dev
   ```

3. **Ensure Services are Running**
   - Frontend: `cd frontend && npm run dev`
   - Backend: Deployed to AWS

## Run Tests

### Run All Time-Based Scoring Tests
```bash
npm test tests/time-based-scoring.spec.js
```

### Run in Headed Mode (See Browser)
```bash
npm run test:headed tests/time-based-scoring.spec.js
```

### Run Specific Test
```bash
# Main workflow test
npm test tests/time-based-scoring.spec.js -g "complete time-based scoring workflow"

# Validation tests
npm test tests/time-based-scoring.spec.js -g "validate time cap"
npm test tests/time-based-scoring.spec.js -g "validate max reps"
```

### Debug Mode
```bash
npm run test:debug tests/time-based-scoring.spec.js
```

### Interactive UI Mode
```bash
npm run test:ui tests/time-based-scoring.spec.js
```

## View Test Results

### HTML Report
```bash
npm run report
```

### JSON Results
```bash
cat test-results.json
```

## Expected Output

```
Running 4 tests using 1 worker

  ✓ complete time-based scoring workflow (45s)
    Phase 1: Creating time-based scoring system...
    ✓ Time-based scoring system created successfully
    Phase 2: Creating WOD with time cap...
    ✓ Category created
    ✓ WOD created with time cap
    ✓ Event published
    Phase 3: Submitting completed score...
    ✓ Completed score submitted (8:45)
    Phase 4: Submitting incomplete score...
    ✓ Incomplete score submitted (2/3 exercises, 250/300 reps on last)
    Phase 5: Viewing score details...
    ✓ Score details displayed correctly
    Phase 6: Viewing leaderboard...
    Phase 7: Verifying ranking order...
    ✓ Ranking order correct: completed athletes ranked before incomplete
    ✓ Leaderboard displays correctly with proper ranking
    Phase 8: Verifying leaderboard entry details...
    ✓ Leaderboard entry details accessible
    
    ========================================
    ✅ All time-based scoring workflow tests passed!
    ========================================

  ✓ should validate time cap requirement for time-based WODs (12s)
    ✓ Time cap validation working correctly

  ✓ should validate max reps requirement for incomplete exercises (10s)
    ✓ Max reps validation working correctly

  ✓ should validate completion time does not exceed time cap (10s)
    ✓ Time cap validation working correctly

4 passed (77s)
```

## Troubleshooting

### Tests Fail at Login
- Verify credentials in `.env` are correct
- Check test users exist in Cognito
- Ensure BASE_URL is accessible

### Tests Fail at Element Selection
- Verify frontend uses expected `data-testid` attributes
- Check frontend is running at BASE_URL
- Look for JavaScript errors in browser console

### Tests Fail at Score Submission
- Verify backend API is deployed
- Check API_BASE_URL in `.env`
- Verify DynamoDB tables exist

### Cleanup Fails
- Check test user has delete permissions
- Verify event IDs are captured correctly
- Check browser console for errors

## Test Coverage

The test suite validates:
- ✅ Scoring system creation (time-based type)
- ✅ WOD time cap configuration
- ✅ Score submission (completed & incomplete)
- ✅ Score details display
- ✅ Leaderboard ranking algorithm
- ✅ Validation logic (time cap, max reps)

## Documentation

- **Full Documentation**: `tests/time-based-scoring.README.md`
- **Implementation Summary**: `tests/TIME_BASED_SCORING_TEST_SUMMARY.md`
- **Test File**: `tests/time-based-scoring.spec.js`

## CI/CD Integration

To run in CI/CD pipeline:
```bash
# Set environment variables in CI
export BASE_URL=https://your-staging-url.com
export TEST_ORGANIZER_EMAIL=ci-organizer@test.com
export TEST_ORGANIZER_PASSWORD=$CI_ORGANIZER_PASSWORD
export TEST_ATHLETE_EMAIL=ci-athlete@test.com
export TEST_ATHLETE_PASSWORD=$CI_ATHLETE_PASSWORD

# Run tests
cd e2e-tests
npm install
npm run install
npm test tests/time-based-scoring.spec.js
```

## Next Steps

After tests pass:
1. Review HTML report for detailed results
2. Check screenshots/videos for any failures
3. Integrate into CI/CD pipeline
4. Monitor test execution times
5. Add more test cases as needed
