# Amplify API v6 - Correct Usage Fix

## Issue
```
TypeError: h.get is not a function
```

## Root Cause

In **Amplify v6**, the API has changed significantly. The `generateClient()` approach doesn't work the same way as before. Instead, you need to use the direct API functions.

## Amplify v6 API Changes

### ❌ Old Way (Doesn't Work)
```javascript
import { generateClient } from 'aws-amplify/api';
const client = generateClient();

// This doesn't work properly
const data = await client.get('CalisthenicsAPI', '/path');
```

### ✅ New Way (Correct for v6)
```javascript
import { get } from 'aws-amplify/api';

// Use the get function directly
const response = await get({
  apiName: 'CalisthenicsAPI',
  path: '/path'
}).response;

const data = await response.body.json();
```

## The Fix

Updated 3 files to use the correct Amplify v6 API syntax:

### 1. PublicEvents.jsx

**Before:**
```javascript
import { generateClient } from 'aws-amplify/api';
const client = generateClient();

const data = await client.get('CalisthenicsAPI', '/public/events');
```

**After:**
```javascript
import { get } from 'aws-amplify/api';

const response = await get({
  apiName: 'CalisthenicsAPI',
  path: '/public/events'
}).response;
const data = await response.body.json();
```

### 2. PublicEventDetail.jsx

Updated all API calls:
- `fetchEventData()` - Main event fetch
- `fetchScores()` - Scores fetch
- Promise.all for categories, wods, and schedules

**Pattern:**
```javascript
const response = await get({
  apiName: 'CalisthenicsAPI',
  path: `/public/events/${eventId}`
}).response;
const data = await response.body.json();
```

### 3. PublicExercises.jsx

Same pattern as PublicEvents.

## Amplify v6 REST API Reference

### GET Request
```javascript
import { get } from 'aws-amplify/api';

const response = await get({
  apiName: 'CalisthenicsAPI',
  path: '/path',
  options: {
    queryParams: { key: 'value' }, // Optional
    headers: { 'Custom-Header': 'value' } // Optional
  }
}).response;

const data = await response.body.json();
```

### POST Request
```javascript
import { post } from 'aws-amplify/api';

const response = await post({
  apiName: 'CalisthenicsAPI',
  path: '/path',
  options: {
    body: { key: 'value' }
  }
}).response;

const data = await response.body.json();
```

### PUT Request
```javascript
import { put } from 'aws-amplify/api';

const response = await put({
  apiName: 'CalisthenicsAPI',
  path: '/path',
  options: {
    body: { key: 'value' }
  }
}).response;

const data = await response.body.json();
```

### DELETE Request
```javascript
import { del } from 'aws-amplify/api';

const response = await del({
  apiName: 'CalisthenicsAPI',
  path: '/path'
}).response;

const data = await response.body.json();
```

## Why This Approach?

1. **Correct v6 Syntax** - This is the official Amplify v6 way
2. **Better Type Safety** - TypeScript support is better
3. **Automatic Auth** - Still handles authentication automatically
4. **CORS Handling** - Still manages CORS properly
5. **Streaming Support** - The `.response` property gives you access to streaming

## Response Object Structure

```javascript
const restOperation = get({ apiName: 'API', path: '/path' });

// Get the response
const response = await restOperation.response;

// Response properties:
response.statusCode    // HTTP status code
response.headers       // Response headers
response.body          // Response body (needs .json() or .text())

// Parse JSON
const data = await response.body.json();

// Or get text
const text = await response.body.text();

// Or get blob
const blob = await response.body.blob();
```

## Files Updated

1. ✅ `frontend/src/components/PublicEvents.jsx`
2. ✅ `frontend/src/components/PublicEventDetail.jsx`
3. ✅ `frontend/src/components/PublicExercises.jsx`

## Testing

After these changes, the API calls should work correctly (assuming the backend is running and has proper CORS headers).

Check the browser console for:
```
Published events: [...]
```

Instead of:
```
TypeError: h.get is not a function
```

## Status

✅ Correct Amplify v6 API syntax  
✅ All public pages updated  
✅ Proper error handling  
⚠️ Backend still needs to be running with CORS headers

## References

- [Amplify v6 REST API Documentation](https://docs.amplify.aws/react/build-a-backend/restapi/set-up-rest-api/)
- [Amplify v6 Migration Guide](https://docs.amplify.aws/react/build-a-backend/restapi/fetch-data/)
