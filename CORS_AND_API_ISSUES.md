# CORS and API Issues - Backend Configuration Needed

## Issues Identified

### 1. ✅ Manifest.json - FIXED
**Issue:** Missing `manifest.json` file  
**Status:** Created `frontend/public/manifest.json`  
**Result:** Manifest error should be resolved

### 2. ❌ CORS Error - BACKEND ISSUE
**Issue:** 
```
Access to fetch at 'https://api.dev.athleon.fitness/public/events' from origin 
'https://dev.athleon.fitness' has been blocked by CORS policy: No 
'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Status:** Requires backend/infrastructure changes  
**Error Code:** 502 Bad Gateway

## What is CORS?

CORS (Cross-Origin Resource Sharing) is a security feature that prevents websites from making requests to different domains unless explicitly allowed.

**Your Setup:**
- Frontend: `https://dev.athleon.fitness`
- API: `https://api.dev.athleon.fitness`

These are different origins, so CORS headers are required.

## Root Causes

### 1. API Server is Down (502 Bad Gateway)
The 502 error indicates the API server is not responding. This could be:
- Lambda function not deployed
- API Gateway misconfigured
- Backend service crashed
- DNS/routing issues

### 2. Missing CORS Headers
Even if the API was up, it needs to return these headers:
```
Access-Control-Allow-Origin: https://dev.athleon.fitness
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## Solutions

### Backend Fixes Required

#### Option 1: API Gateway CORS Configuration (AWS)

If using AWS API Gateway, add CORS configuration:

```javascript
// In your API Gateway configuration
const api = new apigateway.RestApi(this, 'CalisthenicsAPI', {
  defaultCorsPreflightOptions: {
    allowOrigins: [
      'https://dev.athleon.fitness',
      'https://athleon.fitness',
      'http://localhost:3000' // for local development
    ],
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token'
    ],
    allowCredentials: true
  }
});
```

#### Option 2: Lambda Function CORS Headers

Add CORS headers to your Lambda responses:

```javascript
// In your Lambda handler
exports.handler = async (event) => {
  // Your logic here
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://dev.athleon.fitness',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  };
};
```

#### Option 3: CloudFront Distribution

If using CloudFront, add CORS headers in the behavior:

```javascript
// CloudFront custom headers
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: apiOrigin,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'CorsPolicy', {
      corsBehavior: {
        accessControlAllowOrigins: ['https://dev.athleon.fitness'],
        accessControlAllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        accessControlAllowHeaders: ['*'],
        accessControlAllowCredentials: true,
        originOverride: true
      }
    })
  }
});
```

### Frontend Workarounds (Temporary)

#### Option 1: Use Amplify Client (Recommended)

Instead of `fetch()`, use the Amplify client which handles auth and CORS better:

```javascript
// Instead of this:
const response = await fetch(`${apiUrl}/public/events`);

// Use this:
import { generateClient } from 'aws-amplify/api';
const client = generateClient();
const response = await client.get('CalisthenicsAPI', '/public/events');
```

#### Option 2: Development Proxy (Local Only)

Add a proxy to `vite.config.js` for local development:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.dev.athleon.fitness',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

Then use relative URLs:
```javascript
const response = await fetch('/api/public/events');
```

**Note:** This only works in development, not production.

## Immediate Actions

### 1. Check API Status
```bash
curl -I https://api.dev.athleon.fitness/public/events
```

Expected: 200 OK with CORS headers  
Current: 502 Bad Gateway

### 2. Check Backend Logs
- AWS CloudWatch logs for Lambda functions
- API Gateway logs
- Check if the API is deployed

### 3. Verify DNS/Routing
```bash
nslookup api.dev.athleon.fitness
```

### 4. Test with Postman/curl
```bash
curl -X GET https://api.dev.athleon.fitness/public/events \
  -H "Origin: https://dev.athleon.fitness" \
  -v
```

Look for `Access-Control-Allow-Origin` in the response headers.

## Updated PublicEvents.jsx (Using Amplify Client)

I recommend updating to use the Amplify client instead of fetch:

```javascript
import { generateClient } from 'aws-amplify/api';
const client = generateClient();

const fetchPublishedEvents = async () => {
  try {
    // Use Amplify client instead of fetch
    const data = await client.get('CalisthenicsAPI', '/public/events');
    console.log('Published events:', data);
    setEvents(data);
  } catch (error) {
    console.error('Error fetching events:', error);
  } finally {
    setLoading(false);
  }
};
```

This approach:
- ✅ Handles CORS automatically
- ✅ Adds authentication headers when needed
- ✅ Works with your Amplify configuration
- ✅ Better error handling

## Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| manifest.json | ✅ Fixed | None - file created |
| API 502 Error | ❌ Backend | Deploy/fix API backend |
| CORS Headers | ❌ Backend | Add CORS configuration |
| Frontend Code | ⚠️ Can Improve | Use Amplify client instead of fetch |

## Next Steps

1. **Check if API is deployed** - The 502 suggests it's not running
2. **Add CORS headers** - Configure API Gateway or Lambda
3. **Update frontend** - Use Amplify client for better integration
4. **Test locally** - Ensure API works before deploying frontend

The frontend code is correct - this is a backend/infrastructure issue that needs to be resolved on the API side.
