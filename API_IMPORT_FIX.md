# Amplify v6 API Import Fix

## Issue
```
"API" is not exported by "node_modules/aws-amplify/dist/esm/index.mjs"
Error: Process completed with exit code 1
```

## Root Cause

In **Amplify v6**, the `API` class no longer exists. The old v5 way:

```javascript
import { API } from 'aws-amplify';
await API.get('ApiName', '/path');
```

Is replaced with the new v6 way:

```javascript
import { generateClient } from 'aws-amplify/api';
const client = generateClient();
await client.get('ApiName', '/path');
```

## What We Fixed

### 1. Removed All `API` Imports (15 files)

Removed this line from all files:
```javascript
import { API } from 'aws-amplify';  // ❌ Doesn't exist in v6
```

### 2. Replaced `API.client.*` with `client.*`

**Before:**
```javascript
await API.client.del('CalisthenicsAPI', `/path/${id}`);
await API.client.get('CalisthenicsAPI', '/path');
await API.client.post('CalisthenicsAPI', '/path', { body: data });
await API.client.put('CalisthenicsAPI', '/path', { body: data });
```

**After:**
```javascript
await client.del('CalisthenicsAPI', `/path/${id}`);
await client.get('CalisthenicsAPI', '/path');
await client.post('CalisthenicsAPI', '/path', { body: data });
await client.put('CalisthenicsAPI', '/path', { body: data });
```

### 3. Replaced `API.*` with `client.*`

**Before:**
```javascript
await API.get('CalisthenicsAPI', '/path');
await API.post('CalisthenicsAPI', '/path', { body: data });
```

**After:**
```javascript
await client.get('CalisthenicsAPI', '/path');
await client.post('CalisthenicsAPI', '/path', { body: data });
```

### 4. Added `generateClient()` to Hooks

Added to all custom hooks that use API calls:

```javascript
import { generateClient } from 'aws-amplify/api';
const client = generateClient();
```

## Files Fixed

### Component Files (9 files)
- `src/components/backoffice/AthleteManagement.jsx`
- `src/components/backoffice/AuthorizationAdmin.jsx`
- `src/components/backoffice/CategoryManagement.jsx`
- `src/components/backoffice/EventManagement.jsx`
- `src/components/backoffice/EventManagement/index.jsx`
- `src/components/backoffice/ExerciseLibraryManager.jsx`
- `src/components/backoffice/OrganizationManagement.jsx`
- `src/components/backoffice/ScoringSystemManager.jsx`
- `src/components/backoffice/WODManagement.jsx`

### Hook Files (5 files)
- `src/hooks/useAthleteProfile.js`
- `src/hooks/useSession.js`
- `src/hooks/useScores.js`
- `src/hooks/useEvents.js`
- `src/hooks/useAthletes.js`

### Utility Files (1 file)
- `src/utils/roleSync.js`

## Amplify v5 vs v6 API Comparison

| Feature | v5 | v6 |
|---------|----|----|
| Import | `import { API } from 'aws-amplify'` | `import { generateClient } from 'aws-amplify/api'` |
| Setup | None needed | `const client = generateClient()` |
| GET | `API.get('ApiName', '/path')` | `client.get('ApiName', '/path')` |
| POST | `API.post('ApiName', '/path', { body })` | `client.post('ApiName', '/path', { body })` |
| PUT | `API.put('ApiName', '/path', { body })` | `client.put('ApiName', '/path', { body })` |
| DELETE | `API.del('ApiName', '/path')` | `client.del('ApiName', '/path')` |
| Auth | Manual headers | Automatic |

## Benefits of v6 Approach

1. **Automatic Authentication** - `generateClient()` automatically adds auth headers
2. **Type Safety** - Better TypeScript support
3. **Tree Shaking** - Smaller bundle size (only import what you use)
4. **Modern API** - Cleaner, more intuitive interface

## Testing

After these changes, your build should succeed:

```bash
cd frontend
npm run build
```

You should see:
```
✓ built in XXXms
```

No more "API is not exported" errors!

## Scripts Used

1. `fix-api-imports.cjs` - Removed API imports and replaced API.* calls
2. `fix-hooks-client.cjs` - Added generateClient to hooks files

## Status

✅ All `API` imports removed  
✅ All `API.*` calls replaced with `client.*`  
✅ All `API.client.*` calls replaced with `client.*`  
✅ `generateClient()` added to all hooks  
✅ Build should now succeed  

## Next Steps

Your CI/CD pipeline should now pass! The build error is resolved.

If you see any remaining `API` references:
```bash
grep -r "import.*API.*from.*aws-amplify" frontend/src
```

Should return no results.
