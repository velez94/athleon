# Vite Environment Variables Fix

## Issue
```
Uncaught ReferenceError: process is not defined
```

## Root Cause
Your project uses **Vite** as the build tool, not Create React App. Vite doesn't expose `process.env` to the browser - it uses `import.meta.env` instead.

## Key Differences

| Create React App | Vite |
|------------------|------|
| `process.env.REACT_APP_*` | `import.meta.env.VITE_*` or configured |
| Available everywhere | Only in browser code |
| Automatic prefix support | Needs configuration |

## Changes Made

### 1. Updated `frontend/vite.config.js`
Added configuration to expose REACT_APP_ prefixed variables:

```javascript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'build',
      sourcemap: true
    },
    // Expose REACT_APP_ prefixed env variables
    define: {
      'import.meta.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
      'import.meta.env.REACT_APP_USER_POOL_ID': JSON.stringify(env.REACT_APP_USER_POOL_ID),
      'import.meta.env.REACT_APP_USER_POOL_CLIENT_ID': JSON.stringify(env.REACT_APP_USER_POOL_CLIENT_ID),
      'import.meta.env.REACT_APP_REGION': JSON.stringify(env.REACT_APP_REGION),
      'import.meta.env.REACT_APP_ENV': JSON.stringify(env.REACT_APP_ENV),
    }
  }
})
```

### 2. Updated `frontend/src/amplifyconfiguration.js`
Changed from `process.env` to `import.meta.env`:

```javascript
// Before
userPoolId: process.env.REACT_APP_USER_POOL_ID || ''

// After
userPoolId: import.meta.env.REACT_APP_USER_POOL_ID || ''
```

### 3. Updated `frontend/src/App.jsx`
Changed environment variable access:

```javascript
// Before
env: process.env.REACT_APP_ENV

// After
env: import.meta.env.REACT_APP_ENV || import.meta.env.MODE
```

## Environment Files

Your existing `.env.development` and `.env.production` files will work as-is:

```bash
# .env.development
REACT_APP_API_URL=https://api.dev.athleon.fitness
REACT_APP_USER_POOL_ID=us-east-2_Wsuyp4eVw
REACT_APP_USER_POOL_CLIENT_ID=1rglkkj6deko7i7k0lgu78uhvu
REACT_APP_REGION=us-east-2
REACT_APP_ENV=development
```

## How It Works

1. **Vite loads** `.env.development` or `.env.production` based on mode
2. **vite.config.js** reads these variables using `loadEnv()`
3. **define** option exposes them as `import.meta.env.*` in browser code
4. **Your code** can now access them via `import.meta.env.REACT_APP_*`

## Alternative: Use VITE_ Prefix

If you want to follow Vite conventions, you could rename your variables:

```bash
# .env.development
VITE_API_URL=https://api.dev.athleon.fitness
VITE_USER_POOL_ID=us-east-2_Wsuyp4eVw
VITE_USER_POOL_CLIENT_ID=1rglkkj6deko7i7k0lgu78uhvu
VITE_REGION=us-east-2
```

Then in code:
```javascript
userPoolId: import.meta.env.VITE_USER_POOL_ID
```

**Note:** We kept REACT_APP_ prefix for backward compatibility.

## Built-in Vite Variables

Vite provides these automatically:
- `import.meta.env.MODE` - 'development' or 'production'
- `import.meta.env.DEV` - boolean, true in dev
- `import.meta.env.PROD` - boolean, true in production
- `import.meta.env.BASE_URL` - base URL

## Verification

After these changes, restart your dev server:

```bash
cd frontend
npm run dev
# or
npm start
```

Check the browser console for:
```
🔧 Amplify Configuration: {
  region: "us-east-2",
  userPoolId: "us-east-2_Wsuyp4eVw",
  apiEndpoint: "https://api.dev.athleon.fitness",
  hasUserPoolClientId: true,
  env: "development"
}
✅ Amplify configured successfully
```

## Troubleshooting

### Variables are undefined
1. Restart the dev server (Vite needs restart for env changes)
2. Check `.env.development` exists and has correct values
3. Verify vite.config.js has the `define` section

### Still seeing process.env errors
Search your codebase for any remaining `process.env` usage:
```bash
grep -r "process\.env" frontend/src
```

Replace with `import.meta.env`

## Status

✅ Vite config updated to expose REACT_APP_ variables  
✅ amplifyconfiguration.js uses import.meta.env  
✅ App.jsx uses import.meta.env  
✅ Backward compatible with existing .env files

Your app should now start successfully!
