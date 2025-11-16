// Amplify v6 Configuration
// Vite uses import.meta.env instead of process.env
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || import.meta.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || import.meta.env.REACT_APP_USER_POOL_CLIENT_ID || '',
      region: import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    }
  },
  Storage: {
    S3: {
      bucket: 'calisthenics-event-images-571340586587',
      region: import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2',
    }
  },
  API: {
    REST: {
      CalisthenicsAPI: {
        endpoint: import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || '',
        region: import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2',
      }
    }
  }
};

export default amplifyConfig;
