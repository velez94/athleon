/**
 * Time parsing and formatting utilities for time-based scoring
 * 
 * These utilities handle conversion between time string format (mm:ss)
 * and seconds for time-based WOD scoring calculations and validations.
 */

/**
 * Parse time string in mm:ss format to total seconds
 * 
 * @param {string} timeString - Time in format "mm:ss" (e.g., "10:30")
 * @returns {number} Total seconds (e.g., 630)
 * 
 * @example
 * parseTimeToSeconds("10:30") // returns 630
 * parseTimeToSeconds("05:00") // returns 300
 * parseTimeToSeconds("0:45")  // returns 45
 */
function parseTimeToSeconds(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }
  
  const parts = timeString.split(':');
  if (parts.length !== 2) {
    return 0;
  }
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  // Validate parsed values
  if (isNaN(minutes) || isNaN(seconds)) {
    return 0;
  }
  
  return minutes * 60 + seconds;
}

/**
 * Format seconds to time string in mm:ss format
 * 
 * @param {number} seconds - Total seconds (e.g., 630)
 * @returns {string} Time in format "mm:ss" (e.g., "10:30")
 * 
 * @example
 * formatSecondsToTime(630) // returns "10:30"
 * formatSecondsToTime(300) // returns "5:00"
 * formatSecondsToTime(45)  // returns "0:45"
 */
function formatSecondsToTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Compare two time strings
 * 
 * @param {string} time1 - First time in format "mm:ss"
 * @param {string} time2 - Second time in format "mm:ss"
 * @returns {number} Negative if time1 < time2, 0 if equal, positive if time1 > time2
 * 
 * @example
 * compareTime("10:30", "10:00") // returns 30 (time1 is 30 seconds later)
 * compareTime("05:00", "10:00") // returns -300 (time1 is 300 seconds earlier)
 * compareTime("08:45", "08:45") // returns 0 (equal)
 */
function compareTime(time1, time2) {
  const seconds1 = parseTimeToSeconds(time1);
  const seconds2 = parseTimeToSeconds(time2);
  
  return seconds1 - seconds2;
}

/**
 * Validate time string format
 * 
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if valid mm:ss format, false otherwise
 * 
 * @example
 * isValidTimeFormat("10:30") // returns true
 * isValidTimeFormat("5:00")  // returns true
 * isValidTimeFormat("10:5")  // returns false (seconds must be 2 digits)
 * isValidTimeFormat("invalid") // returns false
 */
function isValidTimeFormat(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return false;
  }
  
  const timePattern = /^[0-9]{1,2}:[0-9]{2}$/;
  return timePattern.test(timeString);
}

/**
 * Check if time1 exceeds time2 (for time cap validation)
 * 
 * @param {string} completionTime - Completion time in format "mm:ss"
 * @param {string} timeCap - Time cap in format "mm:ss"
 * @returns {boolean} True if completion time exceeds time cap
 * 
 * @example
 * exceedsTimeCap("10:30", "10:00") // returns true
 * exceedsTimeCap("09:30", "10:00") // returns false
 * exceedsTimeCap("10:00", "10:00") // returns false (equal is not exceeding)
 */
function exceedsTimeCap(completionTime, timeCap) {
  return compareTime(completionTime, timeCap) > 0;
}

module.exports = {
  parseTimeToSeconds,
  formatSecondsToTime,
  compareTime,
  isValidTimeFormat,
  exceedsTimeCap
};
