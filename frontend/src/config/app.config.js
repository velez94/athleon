/**
 * Application Configuration
 * Centralized configuration for the application
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const appConfig = {
  // Environment
  isDevelopment,
  isProduction,
  
  // Debug mode - only enabled in development
  debug: {
    enabled: isDevelopment,
    showApiCalls: isDevelopment,
    showStateChanges: isDevelopment,
    showPerformanceMetrics: isDevelopment
  },
  
  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },
  
  // Cache Configuration
  cache: {
    enabled: true,
    duration: 5 * 60 * 1000, // 5 minutes
    maxSize: 100 // Maximum number of cached items
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  },
  
  // Notifications
  notifications: {
    duration: 5000, // 5 seconds
    maxVisible: 3
  },
  
  // File Upload
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  
  // Form Validation
  validation: {
    debounceDelay: 300, // ms
    showErrorsOnBlur: true,
    showErrorsOnSubmit: true
  },
  
  // Feature Flags
  features: {
    enableAnalytics: isProduction,
    enableErrorTracking: isProduction,
    enablePerformanceMonitoring: isProduction
  }
};

/**
 * Debug logger - only logs in development
 */
export const debugLog = (...args) => {
  if (appConfig.debug.enabled) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * API call logger
 */
export const logApiCall = (method, endpoint, data) => {
  if (appConfig.debug.showApiCalls) {
    console.log(`[API ${method}]`, endpoint, data);
  }
};

/**
 * Performance logger
 */
export const logPerformance = (label, duration) => {
  if (appConfig.debug.showPerformanceMetrics) {
    console.log(`[PERFORMANCE] ${label}: ${duration}ms`);
  }
};

export default appConfig;
