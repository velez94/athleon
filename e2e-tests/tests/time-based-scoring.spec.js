const { test, expect } = require('@playwright/test');
const { AuthHelper } = require('./utils/auth');
const { TestDataHelper } = require('./utils/testData');

test.describe('Time-Based Scoring - Complete Workflow', () => {
  let authHelper;
  let createdEventIds = [];
  let createdScoringSystemId;
  let createdWodId;
  let createdCategoryId;
  let testEventId;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created resources
    for (const eventId of createdEventIds) {
      try {
        await page.goto(`/backoffice/events/${eventId}`);
        const deleteButton = await page.locator('[data-testid="delete-event-button"]').count();
        if (deleteButton > 0) {
          await page.click('[data-testid="delete-event-button"]');
          await page.click('[data-testid="confirm-delete"]');
        }
      } catch (error) {
        console.warn(`Failed to cleanup event ${eventId}:`, error.message);
      }
    }
    createdEventIds = [];
    
    try {
      await authHelper.logout();
    } catch (error) {
      console.warn('Logout failed:', error.message);
    }
  });

  test('complete time-based scoring workflow', async ({ page }) => {
    test.skip(
      !process.env.TEST_ORGANIZER_EMAIL || !process.env.TEST_ATHLETE_EMAIL,
      'Organizer and athlete credentials required'
    );

    // ============================================================
    // PHASE 1: Organizer creates time-based scoring system
    // ============================================================
    console.log('Phase 1: Creating time-based scoring system...');
    
    await authHelper.loginAsOrganizer();
    
    // Create a test event first
    const testEvent = TestDataHelper.createTestEvent();
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"]');
    
    await page.fill('[data-testid="event-name"]', testEvent.name);
    await page.fill('[data-testid="event-description"]', testEvent.description);
    await page.fill('[data-testid="event-start-date"]', testEvent.startDate);
    await page.fill('[data-testid="event-end-date"]', testEvent.endDate);
    await page.fill('[data-testid="event-location"]', testEvent.location);
    
    await page.click('[data-testid="save-event-button"]');
    
    // Extract event ID
    const eventUrl = page.url();
    testEventId = eventUrl.split('/').pop();
    createdEventIds.push(testEventId);
    
    console.log(`Created test event: ${testEventId}`);
    
    // Navigate to scoring systems management
    await page.click('[data-testid="scoring-systems-tab"]');
    await page.click('[data-testid="create-scoring-system-button"]');
    
    // Create time-based scoring system
    const scoringSystemName = `Time-Based System ${TestDataHelper.generateUniqueId()}`;
    await page.fill('[data-testid="scoring-system-name"]', scoringSystemName);
    await page.selectOption('[data-testid="scoring-type-select"]', 'time-based');
    
    // Verify info message about time caps being configured per WOD
    await expect(page.locator('text=/time caps are configured per WOD/i')).toBeVisible();
    
    await page.click('[data-testid="save-scoring-system-button"]');
    
    // Verify scoring system appears in list with "Time-Based" badge
    await expect(page.locator('[data-testid="scoring-systems-list"]')).toContainText(scoringSystemName);
    await expect(page.locator('[data-testid="scoring-systems-list"]')).toContainText('Time-Based');
    
    console.log('✓ Time-based scoring system created successfully');
    
    // ============================================================
    // PHASE 2: Organizer assigns time-based scoring to WOD with time cap
    // ============================================================
    console.log('Phase 2: Creating WOD with time cap...');
    
    // Create a category first (required for WOD)
    await page.click('[data-testid="categories-tab"]');
    await page.click('[data-testid="add-category-button"]');
    
    const testCategory = TestDataHelper.createTestCategory();
    await page.fill('[data-testid="category-name"]', testCategory.name);
    await page.fill('[data-testid="category-description"]', testCategory.description);
    await page.fill('[data-testid="category-min-age"]', testCategory.minAge.toString());
    await page.fill('[data-testid="category-max-age"]', testCategory.maxAge.toString());
    await page.selectOption('[data-testid="category-gender"]', testCategory.gender);
    
    await page.click('[data-testid="save-category-button"]');
    
    console.log('✓ Category created');
    
    // Create WOD with time-based scoring
    await page.click('[data-testid="wods-tab"]');
    await page.click('[data-testid="create-wod-button"]');
    
    const testWod = {
      name: `Murph ${TestDataHelper.generateUniqueId()}`,
      description: 'For Time: 100 Pull-ups, 200 Push-ups, 300 Air Squats',
      movements: [
        { exercise: 'Pull-ups', reps: 100 },
        { exercise: 'Push-ups', reps: 200 },
        { exercise: 'Air Squats', reps: 300 }
      ]
    };
    
    await page.fill('[data-testid="wod-name"]', testWod.name);
    await page.fill('[data-testid="wod-description"]', testWod.description);
    
    // Select the time-based scoring system
    await page.selectOption('[data-testid="scoring-system-select"]', { label: new RegExp(scoringSystemName) });
    
    // Time cap fields should now be visible
    await expect(page.locator('[data-testid="time-cap-minutes"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-cap-seconds"]')).toBeVisible();
    
    // Set time cap to 10:00
    await page.fill('[data-testid="time-cap-minutes"]', '10');
    await page.fill('[data-testid="time-cap-seconds"]', '0');
    
    // Add movements
    for (let i = 0; i < testWod.movements.length; i++) {
      const movement = testWod.movements[i];
      await page.click('[data-testid="add-movement-button"]');
      await page.fill(`[data-testid="movement-${i}-exercise"]`, movement.exercise);
      await page.fill(`[data-testid="movement-${i}-reps"]`, movement.reps.toString());
    }
    
    await page.click('[data-testid="save-wod-button"]');
    
    // Verify WOD appears with time cap displayed
    await expect(page.locator('[data-testid="wods-list"]')).toContainText(testWod.name);
    await expect(page.locator('[data-testid="wods-list"]')).toContainText('10:00');
    
    console.log('✓ WOD created with time cap');
    
    // Publish the event so athletes can register
    await page.click('[data-testid="event-details-tab"]');
    await page.click('[data-testid="publish-event-button"]');
    await page.click('[data-testid="confirm-publish"]');
    
    await expect(page.locator('[data-testid="event-status"]')).toContainText('Published');
    
    console.log('✓ Event published');
    
    await authHelper.logout();
    
    // ============================================================
    // PHASE 3: Judge submits score with all exercises completed
    // ============================================================
    console.log('Phase 3: Submitting completed score...');
    
    await authHelper.loginAsOrganizer(); // Organizer acts as judge
    
    await page.goto(`/backoffice/events/${testEventId}`);
    await page.click('[data-testid="scores-tab"]');
    await page.click('[data-testid="enter-score-button"]');
    
    // Select athlete (assuming there's a test athlete)
    await page.selectOption('[data-testid="athlete-select"]', { index: 0 });
    
    // Select category
    await page.selectOption('[data-testid="category-select"]', { label: new RegExp(testCategory.name) });
    
    // Select WOD
    await page.selectOption('[data-testid="wod-select"]', { label: new RegExp(testWod.name) });
    
    // Time cap should be displayed
    await expect(page.locator('text=/Time Cap.*10:00/i')).toBeVisible();
    
    // Mark all exercises as completed
    const completionCheckboxes = await page.locator('[data-testid^="exercise-"][data-testid$="-completed"]').all();
    for (const checkbox of completionCheckboxes) {
      await checkbox.check();
    }
    
    // Verify max reps inputs are hidden for completed exercises
    const maxRepsInputs = await page.locator('[data-testid^="exercise-"][data-testid$="-max-reps"]').count();
    expect(maxRepsInputs).toBe(0);
    
    // Enter completion time (8:45)
    await page.fill('[data-testid="completion-time"]', '08:45');
    
    await page.click('[data-testid="submit-score-button"]');
    
    // Should show success message
    await expect(page.locator('text=/score.*submitted/i')).toBeVisible();
    
    console.log('✓ Completed score submitted (8:45)');
    
    // ============================================================
    // PHASE 4: Judge submits score with incomplete exercises
    // ============================================================
    console.log('Phase 4: Submitting incomplete score...');
    
    await page.click('[data-testid="enter-score-button"]');
    
    // Select different athlete
    await page.selectOption('[data-testid="athlete-select"]', { index: 1 });
    await page.selectOption('[data-testid="category-select"]', { label: new RegExp(testCategory.name) });
    await page.selectOption('[data-testid="wod-select"]', { label: new RegExp(testWod.name) });
    
    // Mark first two exercises as completed, third as incomplete
    const checkboxes = await page.locator('[data-testid^="exercise-"][data-testid$="-completed"]').all();
    await checkboxes[0].check(); // Pull-ups completed
    await checkboxes[1].check(); // Push-ups completed
    // Leave Air Squats unchecked
    
    // Max reps input should be visible for incomplete exercise
    await expect(page.locator('[data-testid="exercise-2-max-reps"]')).toBeVisible();
    
    // Enter max reps for incomplete exercise (250 out of 300)
    await page.fill('[data-testid="exercise-2-max-reps"]', '250');
    
    // Enter completion time (time cap reached)
    await page.fill('[data-testid="completion-time"]', '10:00');
    
    await page.click('[data-testid="submit-score-button"]');
    
    await expect(page.locator('text=/score.*submitted/i')).toBeVisible();
    
    console.log('✓ Incomplete score submitted (2/3 exercises, 250/300 reps on last)');
    
    // ============================================================
    // PHASE 5: Athlete views their time-based score details
    // ============================================================
    console.log('Phase 5: Viewing score details...');
    
    await authHelper.logout();
    await authHelper.loginAsAthlete();
    
    await page.goto('/profile');
    await page.click('[data-testid="my-scores-tab"]');
    
    // Find the score for our test event
    const scoreCard = page.locator(`[data-testid="score-card"]:has-text("${testWod.name}")`).first();
    await scoreCard.click();
    
    // Should see score details with completion status
    await expect(page.locator('[data-testid="score-details"]')).toBeVisible();
    
    // Should show completion time or time cap
    await expect(page.locator('[data-testid="completion-time"]')).toBeVisible();
    
    // Should show exercise breakdown
    await expect(page.locator('[data-testid="exercise-breakdown"]')).toBeVisible();
    
    // Should show completion status for each exercise
    const exerciseRows = await page.locator('[data-testid^="exercise-row-"]').count();
    expect(exerciseRows).toBe(3);
    
    // Should show max reps for incomplete exercises
    const incompleteExercises = await page.locator('[data-testid^="exercise-row-"]:has-text("✗")').count();
    if (incompleteExercises > 0) {
      await expect(page.locator('text=/\\d+\\/\\d+ reps/')).toBeVisible();
    }
    
    // Should show completion summary
    await expect(page.locator('[data-testid="exercises-completed"]')).toBeVisible();
    
    console.log('✓ Score details displayed correctly');
    
    await authHelper.logout();
    
    // ============================================================
    // PHASE 6: View leaderboard with mixed completed/incomplete scores
    // ============================================================
    console.log('Phase 6: Viewing leaderboard...');
    
    await authHelper.loginAsOrganizer();
    
    await page.goto(`/backoffice/events/${testEventId}`);
    await page.click('[data-testid="leaderboard-tab"]');
    
    // Select category
    await page.selectOption('[data-testid="category-filter"]', { label: new RegExp(testCategory.name) });
    
    // Select WOD
    await page.selectOption('[data-testid="wod-filter"]', { label: new RegExp(testWod.name) });
    
    // Should see leaderboard entries
    await expect(page.locator('[data-testid="leaderboard-table"]')).toBeVisible();
    
    const leaderboardRows = await page.locator('[data-testid^="leaderboard-row-"]').all();
    expect(leaderboardRows.length).toBeGreaterThanOrEqual(2);
    
    // ============================================================
    // PHASE 7: Verify ranking order
    // ============================================================
    console.log('Phase 7: Verifying ranking order...');
    
    // First entry should be completed athlete (8:45)
    const firstRow = leaderboardRows[0];
    await expect(firstRow).toContainText('1'); // Rank
    await expect(firstRow).toContainText('08:45'); // Completion time
    
    // Second entry should be incomplete athlete (with reps count)
    const secondRow = leaderboardRows[1];
    await expect(secondRow).toContainText('2'); // Rank
    // Should show total reps or exercises completed
    const hasRepsOrExercises = 
      (await secondRow.locator('text=/\\d+ reps/').count()) > 0 ||
      (await secondRow.locator('text=/\\d+\\/\\d+ exercises/').count()) > 0;
    expect(hasRepsOrExercises).toBe(true);
    
    // Verify completed athletes are ranked before incomplete
    const firstRowCompleted = (await firstRow.locator('text=/⏱️|Completed/').count()) > 0;
    const secondRowIncomplete = (await secondRow.locator('text=/reps|exercises/').count()) > 0;
    
    if (firstRowCompleted && secondRowIncomplete) {
      console.log('✓ Ranking order correct: completed athletes ranked before incomplete');
    }
    
    // Verify each row shows rank, athlete name, and score
    for (const row of leaderboardRows) {
      await expect(row.locator('[data-testid="rank"]')).toBeVisible();
      await expect(row.locator('[data-testid="athlete-name"]')).toBeVisible();
      await expect(row.locator('[data-testid="score-value"]')).toBeVisible();
    }
    
    console.log('✓ Leaderboard displays correctly with proper ranking');
    
    // ============================================================
    // PHASE 8: Verify leaderboard entry details
    // ============================================================
    console.log('Phase 8: Verifying leaderboard entry details...');
    
    // Click on first entry to view details
    await leaderboardRows[0].click();
    
    // Should show detailed breakdown
    await expect(page.locator('[data-testid="score-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="exercise-breakdown"]')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-details"]');
    
    console.log('✓ Leaderboard entry details accessible');
    
    console.log('\n========================================');
    console.log('✅ All time-based scoring workflow tests passed!');
    console.log('========================================\n');
  });

  test('should validate time cap requirement for time-based WODs', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials required');
    
    await authHelper.loginAsOrganizer();
    
    // Create event
    const testEvent = TestDataHelper.createTestEvent();
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"]');
    
    await page.fill('[data-testid="event-name"]', testEvent.name);
    await page.fill('[data-testid="event-description"]', testEvent.description);
    await page.fill('[data-testid="event-start-date"]', testEvent.startDate);
    await page.fill('[data-testid="event-end-date"]', testEvent.endDate);
    await page.fill('[data-testid="event-location"]', testEvent.location);
    
    await page.click('[data-testid="save-event-button"]');
    
    const eventUrl = page.url();
    testEventId = eventUrl.split('/').pop();
    createdEventIds.push(testEventId);
    
    // Create time-based scoring system
    await page.click('[data-testid="scoring-systems-tab"]');
    await page.click('[data-testid="create-scoring-system-button"]');
    
    const scoringSystemName = `Time-Based ${TestDataHelper.generateUniqueId()}`;
    await page.fill('[data-testid="scoring-system-name"]', scoringSystemName);
    await page.selectOption('[data-testid="scoring-type-select"]', 'time-based');
    await page.click('[data-testid="save-scoring-system-button"]');
    
    // Try to create WOD without time cap
    await page.click('[data-testid="wods-tab"]');
    await page.click('[data-testid="create-wod-button"]');
    
    await page.fill('[data-testid="wod-name"]', 'Test WOD');
    await page.selectOption('[data-testid="scoring-system-select"]', { label: new RegExp(scoringSystemName) });
    
    // Leave time cap empty
    await page.fill('[data-testid="time-cap-minutes"]', '');
    await page.fill('[data-testid="time-cap-seconds"]', '');
    
    await page.click('[data-testid="save-wod-button"]');
    
    // Should show validation error
    await expect(page.locator('text=/time cap.*required/i')).toBeVisible();
    
    console.log('✓ Time cap validation working correctly');
  });

  test('should validate max reps requirement for incomplete exercises', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials required');
    
    await authHelper.loginAsOrganizer();
    
    // Setup: Create event, scoring system, and WOD (abbreviated)
    const testEvent = TestDataHelper.createTestEvent();
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"]');
    
    await page.fill('[data-testid="event-name"]', testEvent.name);
    await page.fill('[data-testid="event-description"]', testEvent.description);
    await page.fill('[data-testid="event-start-date"]', testEvent.startDate);
    await page.fill('[data-testid="event-end-date"]', testEvent.endDate);
    await page.fill('[data-testid="event-location"]', testEvent.location);
    
    await page.click('[data-testid="save-event-button"]');
    
    const eventUrl = page.url();
    testEventId = eventUrl.split('/').pop();
    createdEventIds.push(testEventId);
    
    // Navigate to score entry
    await page.click('[data-testid="scores-tab"]');
    await page.click('[data-testid="enter-score-button"]');
    
    // Select athlete, category, WOD (assuming they exist)
    await page.selectOption('[data-testid="athlete-select"]', { index: 0 });
    await page.selectOption('[data-testid="category-select"]', { index: 0 });
    await page.selectOption('[data-testid="wod-select"]', { index: 0 });
    
    // Mark first exercise as incomplete
    const firstCheckbox = page.locator('[data-testid^="exercise-"][data-testid$="-completed"]').first();
    await firstCheckbox.uncheck();
    
    // Try to submit without entering max reps
    await page.fill('[data-testid="completion-time"]', '10:00');
    await page.click('[data-testid="submit-score-button"]');
    
    // Should show validation error
    await expect(page.locator('text=/max reps.*required/i')).toBeVisible();
    
    console.log('✓ Max reps validation working correctly');
  });

  test('should validate completion time does not exceed time cap', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials required');
    
    await authHelper.loginAsOrganizer();
    
    // Setup: Create event with time-based WOD (abbreviated)
    const testEvent = TestDataHelper.createTestEvent();
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"]');
    
    await page.fill('[data-testid="event-name"]', testEvent.name);
    await page.fill('[data-testid="event-description"]', testEvent.description);
    await page.fill('[data-testid="event-start-date"]', testEvent.startDate);
    await page.fill('[data-testid="event-end-date"]', testEvent.endDate);
    await page.fill('[data-testid="event-location"]', testEvent.location);
    
    await page.click('[data-testid="save-event-button"]');
    
    const eventUrl = page.url();
    testEventId = eventUrl.split('/').pop();
    createdEventIds.push(testEventId);
    
    // Navigate to score entry
    await page.click('[data-testid="scores-tab"]');
    await page.click('[data-testid="enter-score-button"]');
    
    // Select athlete, category, WOD
    await page.selectOption('[data-testid="athlete-select"]', { index: 0 });
    await page.selectOption('[data-testid="category-select"]', { index: 0 });
    await page.selectOption('[data-testid="wod-select"]', { index: 0 });
    
    // Mark all exercises as completed
    const checkboxes = await page.locator('[data-testid^="exercise-"][data-testid$="-completed"]').all();
    for (const checkbox of checkboxes) {
      await checkbox.check();
    }
    
    // Try to enter completion time that exceeds time cap (assuming 10:00 cap)
    await page.fill('[data-testid="completion-time"]', '12:30');
    await page.click('[data-testid="submit-score-button"]');
    
    // Should show validation error
    await expect(page.locator('text=/exceed.*time cap/i')).toBeVisible();
    
    console.log('✓ Time cap validation working correctly');
  });
});
