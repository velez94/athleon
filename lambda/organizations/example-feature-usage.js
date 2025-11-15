const { isFeatureEnabled, getFeatureValue } = require('/opt/nodejs/utils/featureFlags');

// Example: Using feature flags in organizations Lambda
const handleOrganizationAnalytics = async (organizationId) => {
  // Check if analytics feature is enabled
  const analyticsEnabled = await isFeatureEnabled('organizationAnalytics');
  
  if (!analyticsEnabled) {
    return { message: 'Analytics feature not available' };
  }

  // Get configuration values
  const maxUsers = await getFeatureValue('maxConcurrentUsers', 100);
  
  // Feature-specific logic
  return {
    organizationId,
    analytics: {
      enabled: true,
      maxUsers,
      // ... analytics data
    }
  };
};

// Example: Conditional API endpoint
const handleRequest = async (event) => {
  const path = event.pathParameters?.proxy || '';
  
  if (path === 'analytics') {
    const betaFeaturesEnabled = await isFeatureEnabled('betaFeatures');
    
    if (!betaFeaturesEnabled) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Feature not available' })
      };
    }
    
    // Handle analytics request
    return handleOrganizationAnalytics(event.pathParameters.organizationId);
  }
  
  // Handle other requests...
};

module.exports = {
  handleOrganizationAnalytics,
  handleRequest
};
