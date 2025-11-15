const { getFeatureFlags } = require('/opt/nodejs/utils/featureFlags');
const logger = require('/opt/nodejs/utils/logger');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

exports.handler = async (event) => {
  logger.info('Feature flags API request', { path: event.path });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Get feature flags from AppConfig
    const config = await getFeatureFlags();
    
    // Return only the flags (not internal values)
    const response = {
      flags: config.flags || {},
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    logger.error('Error fetching feature flags', { error: error.message });
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Failed to fetch feature flags',
        flags: {} // Return empty flags as fallback
      })
    };
  }
};
