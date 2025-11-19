// Load configuration from JSON file
import awsConfigJson from './aws-config.json';

// Amplify v6 Configuration
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: awsConfigJson.userPoolId || import.meta.env.VITE_USER_POOL_ID || import.meta.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: awsConfigJson.userPoolClientId || import.meta.env.VITE_USER_POOL_CLIENT_ID || import.meta.env.REACT_APP_USER_POOL_CLIENT_ID || '',
      region: awsConfigJson.region || import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2',
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
      region: awsConfigJson.region || import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2',
    }
  },
  API: {
    REST: {
      CalisthenicsAPI: {
        endpoint: awsConfigJson.apiUrl || import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || '',
        region: awsConfigJson.region || import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2'
      }
    }
  }
};

export default amplifyConfig;
