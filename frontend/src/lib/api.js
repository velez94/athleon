// Helper functions for authenticated API calls with Amplify v6
import { get as amplifyGet, post as amplifyPost, put as amplifyPut, del as amplifyDel } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_NAME = 'CalisthenicsAPI';
const API_ENDPOINT = 'https://api.dev.athleon.fitness';

// Get auth token for API requests
const getAuthHeaders = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      return {
        Authorization: `Bearer ${token}`
      };
    }
  } catch (error) {
    console.warn('No auth session available:', error);
  }
  return {};
};

// Public GET request without authentication
export const publicGet = async (path) => {
  const response = await fetch(`${API_ENDPOINT}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

export const get = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyGet({
    apiName: API_NAME,
    path,
    options: {
      headers: {
        ...headers,
        ...options.headers
      },
      queryParams: options.queryStringParameters || options.queryParams
    }
  });
  const { body } = await restOperation.response;
  // Parse the ReadableStream body as JSON
  const data = await body.json();
  return data;
};

export const post = async (path, data, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyPost({
    apiName: API_NAME,
    path,
    options: {
      body: data,
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  const { body } = await restOperation.response;
  // Parse the ReadableStream body as JSON
  const responseData = await body.json();
  return responseData;
};

export const put = async (path, data, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyPut({
    apiName: API_NAME,
    path,
    options: {
      body: data,
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  const { body } = await restOperation.response;
  // Parse the ReadableStream body as JSON
  const responseData = await body.json();
  return responseData;
};

export const del = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const restOperation = amplifyDel({
    apiName: API_NAME,
    path,
    options: {
      headers: {
        ...headers,
        ...options.headers
      }
    }
  });
  await restOperation.response;
};

// Default advanced scoring system configuration
const DEFAULT_SCORING_SYSTEM = {
  scoringSystemId: 'default-advanced',
  name: 'Default Advanced Scoring',
  type: 'advanced',
  config: {
    exercises: [],
    timeBonuses: { 1: 10, 2: 7, 3: 5 }
  }
};

/**
 * Get scoring system configuration for a WOD
 * Implements comprehensive error handling with fallback to default advanced scoring
 * 
 * @param {string} wodId - The WOD ID
 * @param {string} eventId - The event ID
 * @param {Object} options - Optional configuration
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 2)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Object>} Scoring system configuration
 * @throws {Error} Only throws for malformed configurations (prevents score submission)
 */
export const getScoringSystem = async (wodId, eventId, options = {}) => {
  const { maxRetries = 2, retryDelay = 1000 } = options;
  
  // First, get the WOD to check if it has a scoring system configured
  let wod;
  try {
    wod = await get(`/wods/${wodId}`, { queryParams: { eventId } });
  } catch (error) {
    console.error('Failed to fetch WOD:', error);
    // If we can't get the WOD, we can't determine the scoring system
    // Fall back to default with warning
    console.warn(`WOD ${wodId} not found. Using default advanced scoring system.`);
    return {
      ...DEFAULT_SCORING_SYSTEM,
      _fallback: true,
      _fallbackReason: 'wod_not_found'
    };
  }
  
  // Check if WOD has a scoring system configured
  if (!wod.scoringSystemId) {
    console.warn(`WOD ${wodId} has no scoring system configured. Using default advanced scoring system.`);
    return {
      ...DEFAULT_SCORING_SYSTEM,
      _fallback: true,
      _fallbackReason: 'no_scoring_system_configured'
    };
  }
  
  // Attempt to fetch the scoring system with retry logic
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const scoringSystem = await get(
        `/scoring-systems/${wod.scoringSystemId}`,
        { queryParams: { eventId } }
      );
      
      // Validate the scoring system configuration
      if (!scoringSystem || typeof scoringSystem !== 'object') {
        throw new Error('Scoring system response is invalid');
      }
      
      // Validate required fields
      if (!scoringSystem.type) {
        throw new Error('Scoring system is missing required field: type');
      }
      
      if (!scoringSystem.config || typeof scoringSystem.config !== 'object') {
        throw new Error('Scoring system is missing required field: config');
      }
      
      // Validate type-specific configuration
      if (scoringSystem.type === 'classic') {
        if (typeof scoringSystem.config.baseScore !== 'number') {
          throw new Error('Classic scoring system config is missing baseScore');
        }
        if (typeof scoringSystem.config.decrement !== 'number') {
          throw new Error('Classic scoring system config is missing decrement');
        }
      } else if (scoringSystem.type === 'advanced') {
        if (!Array.isArray(scoringSystem.config.exercises)) {
          throw new Error('Advanced scoring system config is missing exercises array');
        }
      } else if (scoringSystem.type === 'time-based') {
        // Time-based scoring uses WOD configuration, no additional validation needed
      } else {
        // Unknown scoring system type
        console.error(`Unknown scoring system type: ${scoringSystem.type}. Falling back to advanced scoring.`);
        return {
          ...DEFAULT_SCORING_SYSTEM,
          _fallback: true,
          _fallbackReason: 'unknown_type',
          _originalType: scoringSystem.type
        };
      }
      
      // Successfully retrieved and validated scoring system
      return scoringSystem;
      
    } catch (error) {
      lastError = error;
      
      // Check if this is a malformed configuration error (validation error)
      if (error.message && error.message.includes('missing required field')) {
        // Malformed configuration - throw error to prevent score submission
        console.error('Malformed scoring system configuration:', error);
        throw new Error(`Scoring system configuration is invalid: ${error.message}. Please contact an administrator.`);
      }
      
      // Check if this is a 404 (non-existent scoring system)
      if (error.message && error.message.includes('404')) {
        console.warn(`Scoring system ${wod.scoringSystemId} not found. Using default advanced scoring system.`);
        return {
          ...DEFAULT_SCORING_SYSTEM,
          _fallback: true,
          _fallbackReason: 'scoring_system_not_found',
          _originalScoringSystemId: wod.scoringSystemId
        };
      }
      
      // For network errors, retry if we haven't exceeded max retries
      if (attempt < maxRetries) {
        console.warn(`Failed to fetch scoring system (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      // Max retries exceeded - fall back to default
      console.error('Failed to fetch scoring system after retries:', lastError);
      console.warn('API unavailable. Using default advanced scoring system.');
      return {
        ...DEFAULT_SCORING_SYSTEM,
        _fallback: true,
        _fallbackReason: 'api_unavailable',
        _error: lastError.message
      };
    }
  }
  
  // Should never reach here, but just in case
  return {
    ...DEFAULT_SCORING_SYSTEM,
    _fallback: true,
    _fallbackReason: 'unknown_error'
  };
};
