import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Amplify, Auth } from 'aws-amplify';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/Loading';
import { queryClient } from './lib/queryClient';
import './i18n'; // Initialize i18n
import { canAccessBackoffice } from './utils/organizerRoles';

// Lazy load components for code splitting
const BackofficeLayout = lazy(() => import('./components/BackofficeLayout'));
const UserSetup = lazy(() => import('./components/UserSetup'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const PublicEvents = lazy(() => import('./components/PublicEvents'));
const PublicWODs = lazy(() => import('./components/PublicWODs'));
const PublicExercises = lazy(() => import('./components/PublicExercises'));
const PublicEventDetail = lazy(() => import('./components/PublicEventDetail'));

// Configuration from environment variables
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  },
  Storage: {
    AWSS3: {
      bucket: 'calisthenics-event-images-571340586587',
      region: process.env.REACT_APP_REGION,
    }
  },
  API: {
    endpoints: [
      {
        name: 'CalisthenicsAPI',
        endpoint: process.env.REACT_APP_API_URL,
        custom_header: async () => {
          try {
            const session = await Auth.currentSession();
            const token = session.getIdToken().getJwtToken();
            return { Authorization: token };
          } catch (error) {
            // Silently handle unauthenticated users - this is expected for public endpoints
            if (!error.message || !error.message.includes('No current user')) {
              console.error('Auth error:', error);
            }
            return {};
          }
        }
      }
    ]
  }
});

// Loading fallback component
const PageLoader = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }}>
    <LoadingSpinner size="lg" message="Loading..." />
  </div>
);

function AuthPage() {
  return (
    <Authenticator 
      initialState="signIn"
      loginMechanisms={['email']}
      signUpAttributes={['given_name', 'family_name', 'nickname']}
      formFields={{
        signUp: {
          given_name: {
            label: 'First Name',
            placeholder: 'Enter your first name',
            isRequired: true,
            order: 1
          },
          family_name: {
            label: 'Last Name',
            placeholder: 'Enter your last name',
            isRequired: true,
            order: 2
          },
          nickname: {
            label: 'Alias',
            placeholder: 'Enter your alias (e.g., pepito)',
            isRequired: false,
            order: 3
          },
          email: {
            label: 'Email',
            placeholder: 'Enter your email',
            isRequired: true,
            order: 4
          },
          password: {
            label: 'Password',
            placeholder: 'Enter your password',
            isRequired: true,
            order: 5
          },
          confirm_password: {
            label: 'Confirm Password',
            placeholder: 'Confirm your password',
            isRequired: true,
            order: 6
          }
        }
      }}
      components={{
        SignUp: {
          FormFields() {
            const { validationErrors } = useAuthenticator();
            return (
              <>
                <Authenticator.SignUp.FormFields />
                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                    I am a
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <input 
                        type="radio" 
                        name="custom:role" 
                        value="athlete"
                        defaultChecked
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>Athlete</div>
                        <div style={{ fontSize: '14px', color: '#718096' }}>Compete in events</div>
                      </div>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <input 
                        type="radio" 
                        name="custom:role" 
                        value="organizer"
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>Organizer</div>
                        <div style={{ fontSize: '14px', color: '#718096' }}>Create and manage competitions</div>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            );
          }
        }
      }}
    >
      {({ signOut, user }) => {
        const isOrganizer = canAccessBackoffice(user);
        
        return (
          <Routes>
            {isOrganizer ? (
              <Route path="/*" element={
                <OrganizationProvider>
                  <BackofficeLayout user={user} signOut={signOut} />
                </OrganizationProvider>
              } />
            ) : (
              <Route path="/*" element={<UserSetup user={user} signOut={signOut} />} />
            )}
          </Routes>
        );
      }}
    </Authenticator>
  );
}

function AuthPageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  React.useEffect(() => {
    // Check if user is already authenticated
    Auth.currentAuthenticatedUser()
      .then(user => {
        // User is authenticated, redirect away from login
        if (location.pathname === '/login') {
          const isOrganizer = canAccessBackoffice(user);
          if (isOrganizer) {
            navigate('/backoffice', { replace: true });
          } else {
            navigate(`/athlete/${user.username}`, { replace: true });
          }
        }
      })
      .catch(() => {
        // Not authenticated, stay on login page
      });
  }, [navigate, location]);
  
  return <AuthPage />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/events" element={<PublicEvents />} />
              <Route path="/wods" element={<PublicWODs />} />
              <Route path="/exercises" element={<PublicExercises />} />
              <Route path="/events/:eventId" element={<PublicEventDetail />} />
              <Route path="/login" element={<AuthPageWrapper />} />
              <Route path="/athlete/events/:eventId" element={<AuthPage />} />
              <Route path="/athlete/:athleteId" element={<AuthPage />} />
              <Route path="/backoffice/*" element={<AuthPage />} />
              <Route path="/*" element={<AuthPage />} />
            </Routes>
          </Suspense>
        </Router>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
