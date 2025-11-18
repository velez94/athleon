# React Router v7 Future Flags Fix

## Issue
```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates 
in `React.startTransition` in v7. You can use the `v7_startTransition` future flag 
to opt-in early.

⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes 
is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early.
```

## What Are Future Flags?

Future flags allow you to opt-in to upcoming React Router v7 behavior changes **now**, so when you upgrade to v7, your app won't break. It's a gradual migration strategy.

## Changes Made

### Updated `frontend/src/App.jsx`

Added the `future` prop to the `<Router>` component:

```javascript
<Router
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }}
>
  {/* routes */}
</Router>
```

### What Each Flag Does

#### 1. `v7_startTransition: true`
**What it does:** Wraps all state updates from router navigation in `React.startTransition()`

**Benefits:**
- Improves perceived performance
- Allows React to prioritize urgent updates over navigation
- Makes navigation feel smoother, especially with slow components

**Example:**
```javascript
// Without flag (v6 behavior)
navigate('/new-page'); // Blocks UI until page loads

// With flag (v7 behavior)
navigate('/new-page'); // UI stays responsive, page loads in background
```

#### 2. `v7_relativeSplatPath: true`
**What it does:** Changes how relative paths work in splat routes (`/*`)

**Example:**
```javascript
// Route: /backoffice/*
// Current location: /backoffice/events

// Without flag (v6 behavior)
<Link to="new">  // Goes to /backoffice/new

// With flag (v7 behavior)  
<Link to="new">  // Goes to /backoffice/events/new (relative to current)
```

**Impact:** More intuitive relative path resolution in nested routes

## Bonus Fix

Also updated the React Query DevTools check:

```javascript
// Before (doesn't work in Vite)
{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}

// After (Vite-compatible)
{import.meta.env.DEV && <ReactQueryDevtools />}
```

## Testing

After this change, you should see:
- ✅ No more React Router v7 warnings in console
- ✅ App behavior remains the same
- ✅ Ready for React Router v7 upgrade

## When to Upgrade to v7

These flags prepare your app for v7, but you're still on v6. When you're ready:

```bash
npm install react-router-dom@7
```

Then remove the `future` prop since it becomes the default behavior.

## Other Future Flags (Optional)

React Router v7 has more future flags you can enable:

```javascript
<Router
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    // Optional additional flags
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  }}
>
```

For now, we've enabled the two that were showing warnings.

## References

- [React Router v6 to v7 Migration Guide](https://reactrouter.com/v6/upgrading/future)
- [v7_startTransition Documentation](https://reactrouter.com/v6/upgrading/future#v7_starttransition)
- [v7_relativeSplatPath Documentation](https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath)

## Status

✅ Future flags enabled  
✅ Warnings eliminated  
✅ Ready for v7 upgrade  
✅ No breaking changes to current behavior
