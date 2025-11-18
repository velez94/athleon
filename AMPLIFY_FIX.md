# Amplify Configuration Fix

## Issue
```
Amplify has not been configured. Please call Amplify.configure() before using this service.
TypeError: can't access property "loginWith", t.Cognito is undefined
```

## Root Cause
The Amplify configuration was using the old v5 format instead of the new v6 format. In Amplify v6, the configuration structure changed significantly, particularly for Auth which now requires a `Cognito` nested object.

## Changes Made

### 1. Created `frontend/src/amplifyconfiguration.js`
New dedicated configuration file with proper Amplify v6 format:

```javascript
const amplifyConfig = {
  Auth: {
    Cognito: {  // ← This is the key change for v6
      userPoolId: process.env.REACT_APP_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
      region: process.env.REACT_APP_REGION,
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: { required: true },
      },
      allowGuestAccess: true,
    }
  },
  Storage: {
    S3: {  // Changed from AWSS3 to S3
      bucket: 'calisthenics-event-images-571340586587',
      region: process.env.REACT_APP_REGION,
    }
  },
  API: {
    REST: {  // Changed from endpoints array to REST object
      CalisthenicsAPI: {
        endpoint: process.env.REACT_APP_API_URL,
        region: process.env.REACT_APP_REGION,
      }
    }
  }
};
```

### 2. Updated `frontend/src/App.jsx`
- Imported the new configuration file
- Added error handling for configuration
- Added debug logging to help troubleshoot

## Key Differences: Amplify v5 vs v6

| Feature | v5 Format | v6 Format |
|---------|-----------|-----------|
| Auth | `Auth: { region, userPoolId, ... }` | `Auth: { Cognito: { region, userPoolId, ... } }` |
| Storage | `Storage: { AWSS3: { ... } }` | `Storage: { S3: { ... } }` |
| API | `API: { endpoints: [...] }` | `API: { REST: { ApiName: { ... } } }` |
| Custom Headers | `custom_header` function | Handled automatically by `generateClient()` |

## Environment Variables Required

Make sure these are set in your `.env.development` or `.env.production`:

```bash
REACT_APP_API_URL=https://api.dev.athleon.fitness
REACT_APP_USER_POOL_ID=us-east-2_Wsuyp4eVw
REACT_APP_USER_POOL_CLIENT_ID=1rglkkj6deko7i7k0lgu78uhvu
REACT_APP_REGION=us-east-2
REACT_APP_ENV=development
```

## How generateClient() Works in v6

The `generateClient()` function automatically:
1. Reads the Amplify configuration
2. Adds authentication headers when user is signed in
3. Handles token refresh automatically
4. Works with both authenticated and public endpoints

No need for custom header functions anymore!

## Testing

1. Clear browser cache and local storage
2. Restart the development server:
   ```bash
   cd frontend
   npm start
   ```
3. Check browser console for:
   ```
   🔧 Amplify Configuration: { ... }
   ✅ Amplify configured successfully
   ```

## Troubleshooting

If you still see errors:

1. **Check environment variables are loaded:**
   ```javascript
   console.log(process.env.REACT_APP_USER_POOL_ID);
   ```

2. **Verify Amplify packages:**
   ```bash
   npm list aws-amplify @aws-amplify/ui-react
   ```
   Should show v6.x.x

3. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check for multiple Amplify.configure() calls:**
   Search codebase for other `Amplify.configure()` calls that might conflict

## References

- [Amplify v6 Migration Guide](https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/)
- [Amplify v6 Configuration](https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/configure-auth/)
