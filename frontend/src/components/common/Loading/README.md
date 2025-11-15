# Loading Component Usage Guide

## Overview
Standardized loading component with professional animations using Athleon branding colors (#FF5722 Fire Orange and #B87333 Copper).

## Import
```javascript
import LoadingSpinner from './common/Loading/LoadingSpinner';
```

## Basic Usage

### Default Spinner
```javascript
<LoadingSpinner />
```

### With Message
```javascript
<LoadingSpinner message="Loading data..." />
```

### Different Sizes
```javascript
<LoadingSpinner size="sm" />  // Small (24px)
<LoadingSpinner size="md" />  // Medium (40px) - Default
<LoadingSpinner size="lg" />  // Large (60px)
```

## Animation Variants

### 1. Spinner (Default)
Classic rotating spinner with gradient colors
```javascript
<LoadingSpinner variant="spinner" size="md" message="Loading..." />
```

### 2. Dots
Three bouncing dots animation
```javascript
<LoadingSpinner variant="dots" size="md" message="Loading schedules..." />
```

### 3. Pulse
Pulsing circle animation
```javascript
<LoadingSpinner variant="pulse" size="lg" message="Loading event..." />
```

### 4. Bars
Three animated bars
```javascript
<LoadingSpinner variant="bars" size="md" message="Loading leaderboard..." />
```

## Full Screen Loading
For page-level loading states:
```javascript
<LoadingSpinner 
  size="lg" 
  message="Loading application..." 
  variant="spinner" 
  fullScreen 
/>
```

## Props

| Prop | Type | Default | Options | Description |
|------|------|---------|---------|-------------|
| `size` | string | `'md'` | `'sm'`, `'md'`, `'lg'` | Size of the loading animation |
| `message` | string | `undefined` | Any string | Optional message below animation |
| `className` | string | `''` | Any CSS class | Additional CSS classes |
| `variant` | string | `'spinner'` | `'spinner'`, `'dots'`, `'pulse'`, `'bars'` | Animation style |
| `fullScreen` | boolean | `false` | `true`, `false` | Full screen overlay mode |

## Examples by Use Case

### Page Loading
```javascript
if (loading) {
  return <LoadingSpinner size="lg" message="Loading page..." variant="spinner" />;
}
```

### Section Loading
```javascript
{loading ? (
  <LoadingSpinner size="md" message="Loading data..." variant="dots" />
) : (
  <YourContent />
)}
```

### Full Screen Loading
```javascript
if (isInitializing) {
  return <LoadingSpinner size="lg" message="Initializing..." variant="spinner" fullScreen />;
}
```

### Inline Loading
```javascript
<div className="loading-inline">
  <LoadingSpinner size="sm" variant="spinner" />
  <span>Processing...</span>
</div>
```

## Accessibility
- Includes `role="status"` for screen readers
- Contains `.sr-only` text "Loading..." for assistive technologies
- Uses `aria-live="polite"` for dynamic updates

## Best Practices

1. **Choose appropriate size**: Use `sm` for inline, `md` for sections, `lg` for pages
2. **Provide context**: Always include a descriptive message when possible
3. **Match variant to context**: 
   - `spinner` - General purpose, data fetching
   - `dots` - List/schedule loading
   - `pulse` - Content loading
   - `bars` - Analytics/charts loading
4. **Use fullScreen sparingly**: Only for critical page-level loading states
5. **Consistent usage**: Use the same variant for similar loading scenarios across the app

## Color Customization
The component automatically uses Athleon branding colors defined in CSS variables:
- Primary: `var(--color-primary)` (#FF5722)
- Secondary: `var(--color-secondary)` (#B87333)

No additional configuration needed!
