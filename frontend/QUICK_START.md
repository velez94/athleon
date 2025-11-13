# 🚀 Quick Start Guide - Frontend Improvements

## Installation (5 minutes)

```bash
# Navigate to frontend directory
cd frontend

# Install all dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

---

## ✅ Verify Installation

### 1. Check the app loads
- Open `http://localhost:3000`
- You should see the landing page
- No console errors

### 2. Test new components
```bash
# Run unit tests
npm test

# Press 'a' to run all tests
# You should see Button tests passing
```

### 3. Test E2E (optional)
```bash
# Open Cypress
npm run cypress

# Click on landing-page.cy.js to run tests
```

---

## 🎯 Using New Features

### 1. Error Boundaries

Wrap any component to catch errors:

```javascript
import ErrorBoundary from './components/common/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. Loading States

Show loading spinners or skeletons:

```javascript
import { LoadingSpinner, SkeletonCard } from './components/common/Loading';

// Spinner
{isLoading && <LoadingSpinner size="lg" message="Loading..." />}

// Skeleton
{isLoading ? <SkeletonCard count={3} /> : <DataList />}
```

### 3. Reusable Button

Use the new Button component:

```javascript
import Button from './components/common/Button';

<Button 
  variant="primary"
  size="md"
  loading={isSubmitting}
  onClick={handleSubmit}
  icon={<span>✓</span>}
>
  Submit
</Button>
```

### 4. Data Fetching with React Query

Use custom hooks for data:

```javascript
import { useAthleteProfile, useEvents } from '../hooks';

function MyComponent({ user }) {
  const { data: profile, isLoading, error } = useAthleteProfile(user);
  const { data: events } = useEvents();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{profile.firstName}</div>;
}
```

---

## 📁 New File Structure

```
frontend/src/
├── components/
│   ├── athlete/profile/      ← Athlete-specific components
│   └── common/               ← Reusable components
│       ├── Button/
│       ├── Card/
│       ├── ErrorBoundary/
│       └── Loading/
├── hooks/                    ← Custom React hooks
│   ├── useAthleteProfile.js
│   ├── useEvents.js
│   └── useScores.js
├── lib/                      ← Configuration
│   └── queryClient.js
└── cypress/                  ← E2E tests
    ├── e2e/
    └── support/
```

---

## 🧪 Testing

### Unit Tests
```bash
# Run tests in watch mode
npm test

# Run tests once with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### E2E Tests
```bash
# Open Cypress UI
npm run cypress

# Run Cypress headless
npm run cypress:run

# Run full E2E suite
npm run e2e
```

### Linting
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

---

## 🎨 Component Examples

### Button Variants

```javascript
// Primary button
<Button variant="primary">Primary</Button>

// Secondary button
<Button variant="secondary">Secondary</Button>

// Outline button
<Button variant="outline">Outline</Button>

// Ghost button
<Button variant="ghost">Ghost</Button>

// Danger button
<Button variant="danger">Delete</Button>

// With icon
<Button icon={<span>🔥</span>}>Hot</Button>

// Loading state
<Button loading>Submitting...</Button>

// Disabled
<Button disabled>Disabled</Button>

// Full width
<Button fullWidth>Full Width</Button>
```

### Card Variants

```javascript
// Default card
<Card>
  <h3>Title</h3>
  <p>Content</p>
</Card>

// Elevated card
<Card variant="elevated">
  <h3>Elevated</h3>
</Card>

// Outlined card
<Card variant="outlined">
  <h3>Outlined</h3>
</Card>

// Hoverable card
<Card hoverable>
  <h3>Hover me</h3>
</Card>

// Clickable card
<Card onClick={() => alert('Clicked!')}>
  <h3>Click me</h3>
</Card>

// Custom padding
<Card padding="lg">
  <h3>Large padding</h3>
</Card>
```

---

## 🔧 Common Tasks

### Add a new component

1. Create folder: `components/common/MyComponent/`
2. Create files:
   - `MyComponent.js` - Component code
   - `MyComponent.css` - Styles
   - `MyComponent.test.js` - Tests
   - `index.js` - Export

```javascript
// MyComponent.js
import PropTypes from 'prop-types';
import './MyComponent.css';

const MyComponent = ({ title, children }) => {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {children}
    </div>
  );
};

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node
};

export default MyComponent;
```

```javascript
// index.js
export { default } from './MyComponent';
```

### Add a new hook

1. Create file: `hooks/useMyData.js`
2. Use React Query:

```javascript
import { useQuery } from '@tanstack/react-query';
import { API } from 'aws-amplify';

export const useMyData = (id) => {
  return useQuery({
    queryKey: ['myData', id],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/my-endpoint/${id}`);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });
};
```

3. Export from `hooks/index.js`:

```javascript
export * from './useMyData';
```

### Add a new test

```javascript
// MyComponent.test.js
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <MyComponent title="Test">
        <p>Child content</p>
      </MyComponent>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
```

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Tests not running
```bash
# Clear Jest cache
npm test -- --clearCache
```

### Cypress not opening
```bash
# Install Cypress binary
npx cypress install
```

### Build fails
```bash
# Check for TypeScript errors
npm run build

# Check console output for specific errors
```

---

## 📚 Learn More

- **IMPROVEMENTS_GUIDE.md** - Detailed documentation
- **IMPLEMENTATION_SUMMARY.md** - What was implemented
- [React Query Docs](https://tanstack.com/query/latest)
- [Testing Library Docs](https://testing-library.com/react)
- [Cypress Docs](https://docs.cypress.io)

---

## ✨ Key Benefits

✅ **Better Performance** - Code splitting & caching
✅ **Easier Testing** - Comprehensive test setup
✅ **Improved Accessibility** - WCAG AA compliant
✅ **Better UX** - Loading states & error handling
✅ **Cleaner Code** - Modular components
✅ **Type Safety** - PropTypes validation
✅ **Mobile Friendly** - Responsive design

---

## 🎉 You're Ready!

The frontend is now set up with modern React best practices. Start building features with confidence!

**Next steps:**
1. Explore the new components in `components/common/`
2. Try using the custom hooks in `hooks/`
3. Write tests for your components
4. Check accessibility with the linter

**Need help?** Check the documentation files or create an issue.

Happy coding! 🚀
