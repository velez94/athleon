// Load AWS configuration from build-time injected config or environment variables
let config = {
  region: import.meta.env.VITE_REGION || 'us-east-2',
  apiUrl: import.meta.env.VITE_API_URL,
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
};

// Try to load from build-time config file
try {
  const buildConfig = await import('./aws-config.json');
  config = { ...config, ...buildConfig.default };
} catch {
  // Config file doesn't exist, use environment variables
}

const awsConfig = {
  Auth: {
    region: config.region,
    userPoolId: config.userPoolId,
    userPoolWebClientId: config.userPoolClientId,
  },
  API: {
    endpoints: [
      {
        name: 'CalisthenicsAPI',
        endpoint: config.apiUrl,
      },
    ],
  },
};

export default awsConfig;
