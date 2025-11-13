# Athleon Frontend - Athlete View

Modern, accessible, and performant React application for athletes to manage their competition profiles, view events, and track scores.

## 🎉 Recent Improvements

This frontend has been completely modernized with React and web design best practices:

✅ **Refactored Component Structure** - Modular, maintainable components  
✅ **React Query Integration** - Efficient data fetching and caching  
✅ **Error Boundaries** - Graceful error handling  
✅ **WCAG AA Accessibility** - Fully accessible to all users  
✅ **Performance Optimized** - Code splitting and lazy loading  
✅ **Mobile-First Design** - Responsive and touch-friendly  
✅ **Testing Infrastructure** - Unit and E2E tests ready  
✅ **Consistent Styling** - Design system with CSS variables  

**See [README_IMPROVEMENTS.md](./README_IMPROVEMENTS.md) for complete details.**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- AWS Amplify configured
- Backend API running

### Installation

**Option 1: Automated (Recommended)**
```bash
# On macOS/Linux
chmod +x install-improvements.sh
./install-improvements.sh

# On Windows
install-improvements.bat
```

**Option 2: Manual**
```bash
npm install
npm start
```

The app will open at `http://localhost:3000`

---

## 📚 Documentation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Get running in 5 minutes
- **[README_IMPROVEMENTS.md](./README_IMPROVEMENTS.md)** - Overview of improvements

### Detailed Guides
- **[IMPROVEMENTS_GUIDE.md](./IMPROVEMENTS_GUIDE.md)** - Complete implementation guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was implemented
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture diagrams

### Progress Tracking
- **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Track migration progress

---

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── athlete/          # Athlete-specific features
│   │   │   └── profile/      # Profile components
│   │   ├── common/           # Reusable components
│   │   │   ├── Button/       # Button component
│   │   │   ├── Card/         # Card component
│   │   │   ├── ErrorBoundary/# Error handling
│   │   │   └── Loading/      # Loading states
│   │   ├── backoffice/       # Organizer features
│   │   └── layout/           # Layout components
│   ├── hooks/                # Custom React hooks
│   │   ├── useAthleteProfile.js
│   │   ├── useEvents.js
│   │   └── useScores.js
│   ├── lib/                  # Configuration
│   │   └── queryClient.js    # React Query setup
│   ├── contexts/             # React contexts
│   ├── utils/                # Utility functions
│   └── cypress/              # E2E tests
├── public/                   # Static assets
└── build/                    # Production build
```

---

## 🧪 Testing

### Unit Tests
```bash
npm test                    # Watch mode
npm run test:coverage       # With coverage report
npm run test:ci            # CI mode
```

### E2E Tests
```bash
npm run cypress            # Open Cypress UI
npm run cypress:run        # Headless mode
npm run e2e               # Full E2E suite
```

### Linting
```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
```

---

## 🎨 Component Library

### Button
```javascript
import Button from './components/common/Button';

<Button 
  variant="primary"      // primary, secondary, outline, ghost, danger
  size="md"             // sm, md, lg
  loading={isLoading}
  icon={<span>✓</span>}
  onClick={handleClick}
>
  Submit
</Button>
```

### Card
```javascript
import Card from './components/common/Card';

<Card 
  variant="elevated"    // default, outlined, elevated
  hoverable
  padding="lg"         // none, sm, md, lg
>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

### Loading States
```javascript
import { LoadingSpinner, SkeletonCard } from './components/common/Loading';

{isLoading ? <LoadingSpinner size="lg" /> : <Content />}
{isLoading ? <SkeletonCard count={3} /> : <List />}
```

### Error Boundary
```javascript
import ErrorBoundary from './components/common/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## 🔧 Custom Hooks

### Data Fetching
```javascript
import { useAthleteProfile, useEvents, useScores } from '../hooks';

function MyComponent({ user }) {
  const { data: profile, isLoading, error } = useAthleteProfile(user);
  const { data: events } = useEvents();
  const { data: scores } = useEventScores(eventId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{profile.firstName}</div>;
}
```

### Available Hooks
- `useAthleteProfile(user)` - Fetch athlete profile
- `useUpdateAthleteProfile()` - Update profile
- `useAthleteRegistrations(athleteId)` - Get registrations
- `useRegisterForEvent()` - Register for events
- `useEvents()` - Fetch all events
- `useEvent(eventId)` - Fetch single event
- `useEventScores(eventId)` - Get event scores
- `useLeaderboard(eventId, categoryId)` - Get leaderboard

---

## 📦 Scripts

```bash
# Development
npm start                  # Start dev server
npm run build             # Production build

# Testing
npm test                  # Run unit tests
npm run test:coverage     # Test with coverage
npm run cypress           # Open Cypress
npm run cypress:run       # Run Cypress headless
npm run e2e              # Full E2E suite

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues

# Deployment
npm run deploy:s3        # Deploy to S3
npm run invalidate:cloudfront  # Invalidate CloudFront cache
```

---

## 🌍 Environment Variables

Create `.env` file in the frontend directory:

```env
REACT_APP_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-client-id
REACT_APP_API_URL=https://your-api-url
```

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to S3
```bash
npm run deploy:s3
npm run invalidate:cloudfront
```

---

## 🐛 Troubleshooting

### Dependencies won't install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests failing
```bash
npm test -- --clearCache
npm run test:ci
```

### Cypress won't open
```bash
npx cypress install
```

### Build errors
Check console for specific errors, ensure all imports are correct.

---

## 📊 Performance

### Metrics
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.8s
- **Lighthouse Score**: > 90

### Optimizations
- Code splitting with React.lazy()
- React Query caching (5-10 min)
- Image lazy loading
- Bundle size optimization

---

## ♿ Accessibility

### Standards
- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratios meet standards

### Testing
```bash
npm run lint              # Includes a11y checks
npm run cypress           # Includes a11y tests
```

---

## 🤝 Contributing

### Adding New Components

1. Create component folder:
```
components/common/MyComponent/
├── MyComponent.js
├── MyComponent.css
├── MyComponent.test.js
└── index.js
```

2. Add PropTypes:
```javascript
import PropTypes from 'prop-types';

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node
};
```

3. Write tests:
```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

test('renders component', () => {
  render(<MyComponent title="Test" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

4. Add accessibility:
```javascript
<button 
  aria-label="Descriptive label"
  aria-pressed={isPressed}
>
  Button
</button>
```

---

## 📝 Code Style

### ESLint Configuration
- React best practices
- Accessibility rules (jsx-a11y)
- Automatic formatting

### Naming Conventions
- Components: PascalCase (e.g., `AthleteProfile`)
- Files: PascalCase for components (e.g., `AthleteProfile.js`)
- Hooks: camelCase with 'use' prefix (e.g., `useAthleteProfile`)
- CSS classes: kebab-case (e.g., `athlete-profile`)

---

## 🔐 Security

### Measures
- AWS Amplify authentication
- JWT token validation
- XSS protection with DOMPurify
- HTTPS only in production
- Environment variables for secrets

---

## 📈 Monitoring

### Development
- React Query DevTools
- Console logging
- Error boundaries

### Production (Future)
- Error reporting service
- Performance monitoring
- User analytics

---

## 🎯 Roadmap

### Completed ✅
- Modern React architecture
- React Query integration
- Comprehensive testing setup
- Accessibility compliance
- Performance optimization
- Mobile-first design

### In Progress 🔄
- Component migration
- Test coverage increase
- Performance monitoring

### Planned 📋
- TypeScript migration
- Storybook integration
- PWA features
- Advanced analytics
- Design system documentation

---

## 📞 Support

### Documentation
- Check the documentation files in this directory
- Review example components
- Look at test files for patterns

### Issues
- Create an issue in the repository
- Include error messages and steps to reproduce
- Attach screenshots if relevant

---

## 📄 License

This project is part of the Athleon platform.

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [React Query](https://tanstack.com/query/latest)
- [React Router](https://reactrouter.com/)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- [Cypress](https://www.cypress.io/)
- [Testing Library](https://testing-library.com/)

---

**Version:** 2.0.0  
**Last Updated:** 2024  
**Status:** Production Ready ✅

For detailed information about recent improvements, see [README_IMPROVEMENTS.md](./README_IMPROVEMENTS.md)
