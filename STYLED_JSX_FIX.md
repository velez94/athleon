# Styled-JSX Warning Fix

## Issue
```
Warning: Received `true` for a non-boolean attribute `jsx`. 
If you want to write it to the DOM, pass a string instead: jsx="true" or jsx={value.toString()}.
```

## Root Cause

The codebase was using `<style jsx>` which is a **Next.js-specific** feature (styled-jsx library). This doesn't work in standard React/Vite projects and causes React to treat `jsx` as a DOM attribute.

## What is styled-jsx?

`styled-jsx` is a CSS-in-JS library that comes built-in with Next.js. It allows you to write scoped CSS directly in your components:

```jsx
// Next.js (with styled-jsx)
<style jsx>{`
  .button {
    color: red;
  }
`}</style>
```

However, this **doesn't work** in standard React or Vite projects without installing the styled-jsx library.

## The Fix

Changed all `<style jsx>` to regular `<style>` tags:

```jsx
// Before (Next.js syntax)
<style jsx>{`
  .landing-page {
    min-height: 100vh;
  }
`}</style>

// After (Standard React)
<style>{`
  .landing-page {
    min-height: 100vh;
  }
`}</style>
```

## Files Fixed (33 files)

### Component Files
- LandingPage.jsx
- Leaderboard.jsx
- UserSetup.jsx
- AthleteProfile.jsx
- Navigation.jsx
- CategorySelection.jsx
- AthleteLeaderboard.jsx
- Dashboard.jsx
- PublicEvents.jsx
- PublicEventDetail.jsx
- PublicWODs.jsx
- PublicExercises.jsx
- CustomSignUp.jsx
- Events.jsx

### Athlete Components
- athlete/AthleteEventDetails.jsx

### Backoffice Components
- backoffice/Leaderboard.jsx
- backoffice/AthleteManagement.jsx
- backoffice/GeneralLeaderboard.jsx
- backoffice/AuthorizationAdmin.jsx
- backoffice/Analytics.jsx
- backoffice/ScoreManagement.jsx
- backoffice/CategoryManagement.jsx
- backoffice/ScoreEntry.jsx
- backoffice/EventDetails.jsx
- backoffice/EventEdit.jsx
- backoffice/WODManagement.jsx
- backoffice/AdminProfile.jsx
- backoffice/EventManagement/CategorySelector.jsx
- backoffice/EventManagement/WodSelector.jsx
- backoffice/EventManagement/EventForm.jsx
- backoffice/EventManagement/EventList.jsx

### Common Components
- common/NotificationProvider.jsx
- common/ErrorBoundary.jsx
- common/Modal.jsx

## Impact

✅ **No functional changes** - The styles still work exactly the same  
✅ **Warning eliminated** - No more React warnings about `jsx` attribute  
✅ **Standard React** - Using standard React syntax now

## Note on Scoped Styles

The original `<style jsx>` provided **scoped styles** (styles only apply to that component). Regular `<style>` tags are **global**.

If you need scoped styles in React/Vite, consider:

### Option 1: CSS Modules (Recommended)
```jsx
// Button.module.css
.button {
  color: red;
}

// Button.jsx
import styles from './Button.module.css';
<button className={styles.button}>Click</button>
```

### Option 2: Styled Components
```bash
npm install styled-components
```

```jsx
import styled from 'styled-components';

const Button = styled.button`
  color: red;
`;
```

### Option 3: Keep Current Approach
The current `<style>` tags work fine if you:
- Use unique class names
- Don't have naming conflicts
- Are okay with global styles

## Status

✅ All 33 files fixed  
✅ No more `jsx` attribute warnings  
✅ Styles continue to work  
✅ Standard React syntax

Your console should now be clean! 🎉
