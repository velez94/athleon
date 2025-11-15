const { AppConfigDataClient, GetConfigurationCommand } = require('@aws-sdk/client-appconfigdata');

const client = new AppConfigDataClient({ region: process.env.AWS_REGION || 'us-east-2' });

let configToken = null;
let cachedConfig = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute

const getFeatureFlags = async () => {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && (now - lastFetch) < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const command = new GetConfigurationCommand({
      Application: process.env.APPCONFIG_APPLICATION_ID,
      Environment: process.env.APPCONFIG_ENVIRONMENT_ID,
      Configuration: process.env.APPCONFIG_CONFIGURATION_PROFILE_ID,
      ClientId: 'athleon-lambda',
      ClientConfigurationVersion: configToken,
    });

    const response = await client.send(command);
    
    if (response.Configuration) {
      cachedConfig = JSON.parse(response.Configuration.toString());
      configToken = response.NextPollConfigurationToken;
      lastFetch = now;
    }
    
    return cachedConfig;
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    // Return cached config or defaults
    return cachedConfig || { flags: {}, values: {} };
  }
};

const isFeatureEnabled = async (flagName) => {
  try {
    const config = await getFeatureFlags();
    return config.flags?.[flagName]?.enabled || false;
  } catch (error) {
    console.error(`Error checking feature flag ${flagName}:`, error);
    return false;
  }
};

const getFeatureValue = async (valueName, defaultValue = null) => {
  try {
    const config = await getFeatureFlags();
    return config.values?.[valueName]?.value || defaultValue;
  } catch (error) {
    console.error(`Error getting feature value ${valueName}:`, error);
    return defaultValue;
  }
};

module.exports = {
  isFeatureEnabled,
  getFeatureValue,
  getFeatureFlags
};
