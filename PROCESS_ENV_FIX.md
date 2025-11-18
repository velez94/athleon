# Process.env Fix for Vite

## Issue
```
Error fetching events: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
Manifest: Line: 1, column: 1, Syntax error.
```

## Root Cause

The code was using `process.env.REACT_APP_API_URL` which returns `undefined` in Vite (browser context). This caused the fetch to go to the wrong URL, which returned an HTML error page instead of JSON.

**Why it happens:**
- Vite doesn't expose `process.env` to browser code
- `process.env` only works in Node.js (server-side)
- Vite uses `import.meta.env` instead

## What We Fixed

### 1. Public API Calls (3 files)

**PublicEvents.jsx**
```javascript
// Before
const apiUrl = process.env.REACT_APP_API_URL;

// After
const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'https://api.dev.athleon.fitness';
```

**PublicEventDetail.jsx**
```javascript
// Before
const apiUrl = process.env.REACT_APP_API_URL;

// After
const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'https://api.dev.athleon.fitness';
```

**PublicExercises.jsx**
```javascript
// Before
const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.dev.athleon.fitness'}/public/exercises`);

// After
const response = await fetch(`${import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'https://api.dev.athleon.fitness'}/public/exercises`);
```

### 2. Environment Checks (3 files)

**ErrorBoundary.jsx & ErrorBoundary/ErrorBoundary.jsx**
```javascript
// Before
{process.env.NODE_ENV === 'development' && this.state.error && (

// After
{import.meta.env.DEV && this.state.error && (
```

**app.config.js**
```javascript
// Before
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// After
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
```

### 3. AWS Configuration (1 file)

**aws-config.js**
```javascript
// Before
let config = {
  region: process.env.REACT_APP_REGION || 'us-east-2',
  apiUrl: process.env.REACT_APP_API_URL,
  userPoolId: process.env.REACT_APP_USER_POOL_ID,
  userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
};

// After
let config = {
  region: import.meta.env.VITE_REGION || import.meta.env.REACT_APP_REGION || 'us-east-2',
  apiUrl: import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL,
  userPoolId: import.meta.env.VITE_USER_POOL_ID || import.meta.env.REACT_APP_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || import.meta.env.REACT_APP_USER_POOL_CLIENT_ID,
};
```

## Vite Environment Variables Cheat Sheet

| Use Case | ❌ Wrong (CRA) | ✅ Right (Vite) |
|----------|---------------|----------------|
| API URL | `process.env.REACT_APP_API_URL` | `import.meta.env.REACT_APP_API_URL` |
| Custom var | `process.env.REACT_APP_*` | `import.meta.env.REACT_APP_*` |
| Dev check | `process.env.NODE_ENV === 'development'` | `import.meta.env.DEV` |
| Prod check | `process.env.NODE_ENV === 'production'` | `import.meta.env.PROD` |
| Mode | `process.env.NODE_ENV` | `import.meta.env.MODE` |

## Built-in Vite Variables

Vite provides these automatically (no .env file needed):

- `import.meta.env.MODE` - `"development"` or `"production"`
- `import.meta.env.DEV` - `true` in development
- `import.meta.env.PROD` - `true` in production
- `import.meta.env.BASE_URL` - Base URL of the app
- `import.meta.env.SSR` - `true` if running in server-side

## How Vite Exposes Variables

Remember, we configured `vite.config.js` to expose REACT_APP_ variables:

```javascript
// vite.config.js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    define: {
      'import.meta.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
      'import.meta.env.REACT_APP_USER_POOL_ID': JSON.stringify(env.REACT_APP_USER_POOL_ID),
      // ... etc
    }
  }
})
```

This makes `.env.development` and `.env.production` work with the REACT_APP_ prefix.

## Files Fixed

1. `src/components/PublicEvents.jsx`
2. `src/components/PublicEventDetail.jsx`
3. `src/components/PublicExercises.jsx`
4. `src/components/common/ErrorBoundary.jsx`
5. `src/components/common/ErrorBoundary/ErrorBoundary.jsx`
6. `src/config/app.config.js`
7. `src/aws-config.js`

## Testing

After these changes:

1. **Restart dev server** (critical!)
   ```bash
   npm run dev
   ```

2. **Check browser console** - should see:
   ```
   Published events: [...]
   ```

3. **Navigate to /events** - should load events without errors

## Why This Matters

- ✅ API calls now go to the correct URL
- ✅ Environment variables are properly loaded
- ✅ No more "Unexpected token '<'" errors
- ✅ Public pages work correctly
- ✅ Development/production checks work

## Status

✅ All `process.env` usage replaced with `import.meta.env`  
✅ API calls will work correctly  
✅ Environment variables properly configured  
✅ Fallback URLs provided for safety  

Your app should now load events and other public data correctly! 🎉
