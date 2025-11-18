// Quick verification script for time utilities
const { 
  parseTimeToSeconds, 
  formatSecondsToTime, 
  compareTime, 
  isValidTimeFormat, 
  exceedsTimeCap 
} = require('./utils');

console.log('Testing time utilities...\n');

// Test parseTimeToSeconds
console.log('1. parseTimeToSeconds tests:');
console.log('   "10:30" =>', parseTimeToSeconds("10:30"), '(expected: 630)');
console.log('   "05:00" =>', parseTimeToSeconds("05:00"), '(expected: 300)');
console.log('   "0:45" =>', parseTimeToSeconds("0:45"), '(expected: 45)');
console.log('   "" =>', parseTimeToSeconds(""), '(expected: 0)');
console.log('   null =>', parseTimeToSeconds(null), '(expected: 0)');

// Test formatSecondsToTime
console.log('\n2. formatSecondsToTime tests:');
console.log('   630 =>', formatSecondsToTime(630), '(expected: "10:30")');
console.log('   300 =>', formatSecondsToTime(300), '(expected: "5:00")');
console.log('   45 =>', formatSecondsToTime(45), '(expected: "0:45")');
console.log('   0 =>', formatSecondsToTime(0), '(expected: "0:00")');

// Test compareTime
console.log('\n3. compareTime tests:');
console.log('   "10:30" vs "10:00" =>', compareTime("10:30", "10:00"), '(expected: 30)');
console.log('   "05:00" vs "10:00" =>', compareTime("05:00", "10:00"), '(expected: -300)');
console.log('   "08:45" vs "08:45" =>', compareTime("08:45", "08:45"), '(expected: 0)');

// Test isValidTimeFormat
console.log('\n4. isValidTimeFormat tests:');
console.log('   "10:30" =>', isValidTimeFormat("10:30"), '(expected: true)');
console.log('   "5:00" =>', isValidTimeFormat("5:00"), '(expected: true)');
console.log('   "10:5" =>', isValidTimeFormat("10:5"), '(expected: false)');
console.log('   "invalid" =>', isValidTimeFormat("invalid"), '(expected: false)');
console.log('   "" =>', isValidTimeFormat(""), '(expected: false)');

// Test exceedsTimeCap
console.log('\n5. exceedsTimeCap tests:');
console.log('   "10:30" exceeds "10:00" =>', exceedsTimeCap("10:30", "10:00"), '(expected: true)');
console.log('   "09:30" exceeds "10:00" =>', exceedsTimeCap("09:30", "10:00"), '(expected: false)');
console.log('   "10:00" exceeds "10:00" =>', exceedsTimeCap("10:00", "10:00"), '(expected: false)');

console.log('\n✅ All utility functions executed successfully!');
