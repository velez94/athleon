import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { NotificationProvider } from './components/common/NotificationProvider';
import { LoadingSpinner } from './components/common/Loading';
import { queryClient } from './lib/queryClient';
import amplifyConfig from './amplifyconfiguration';
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
const AthleteEventDetails = lazy(() => import('./components/athlete/AthleteEventDetails'));

// Configure Amplify with v6 format
// Log configuration for debugging
console.log('🔧 Amplify Configuration:', {
  region: amplifyConfig.Auth.Cognito.region,
  userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
  apiEndpoint: amplifyConfig.API.REST.CalisthenicsAPI.endpoint,
  hasUserPoolClientId: !!amplifyConfig.Auth.Cognito.userPoolClientId,
  env: import.meta.env.VITE_ENV || import.meta.env.REACT_APP_ENV || import.meta.env.MODE
});

try {
  Amplify.configure(amplifyConfig);
  console.log('✅ Amplify configured successfully');
} catch (error) {
  console.error('❌ Amplify configuration error:', error);
}

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

function AuthenticatedRoutes({ user, signOut }) {
  const [isReady, setIsReady] = useState(false);
  const [fullUser, setFullUser] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Fetch the full user data with all attributes from Cognito
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        
        console.log('🔍 getCurrentUser result:', {
          username: currentUser?.username,
          userId: currentUser?.userId,
          signInDetails: currentUser?.signInDetails
        });
        
        console.log('🔍 User from Authenticator:', {
          username: user?.username,
          email: user?.attributes?.email,
          role: user?.attributes?.['custom:role'],
          organizerRole: user?.attributes?.['custom:organizerRole'],
          isSuperAdmin: user?.attributes?.['custom:isSuperAdmin'],
          allAttributes: user?.attributes
        });
        
        console.log('🔍 Session info:', {
          hasAccessToken: !!session?.tokens?.accessToken,
          hasIdToken: !!session?.tokens?.idToken,
          userSub: session?.tokens?.idToken?.payload?.sub
        });
        
        // The Authenticator user object should have all attributes
        // If not, we need to extract them from the ID token
        let userWithAttributes = user;
        
        if (!user?.attributes?.email && session?.tokens?.idToken) {
          // Extract attributes from ID token if not in user object
          const idTokenPayload = session.tokens.idToken.payload;
          console.log('🔍 ID Token payload:', idTokenPayload);
          
          userWithAttributes = {
            ...user,
            attributes: {
              sub: idTokenPayload.sub,
              email: idTokenPayload.email,
              email_verified: idTokenPayload.email_verified,
              given_name: idTokenPayload.given_name,
              family_name: idTokenPayload.family_name,
              'custom:role': idTokenPayload['custom:role'] || idTokenPayload.role,
              'custom:organizerRole': idTokenPayload['custom:organizerRole'],
              'custom:isSuperAdmin': idTokenPayload['custom:isSuperAdmin']
            }
          };
          
          console.log('🔍 Reconstructed user with attributes:', userWithAttributes);
        }
        
        setFullUser(userWithAttributes);
        setIsReady(true);
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        // Fallback to user from Authenticator
        setFullUser(user);
        setIsReady(true);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  if (!isReady) {
    return <PageLoader />;
  }

  const isOrganizer = canAccessBackoffice(fullUser);
  console.log('🔍 Final check - Is organizer?', isOrganizer);
  console.log('🔍 Final check - User email:', fullUser?.attributes?.email);
  console.log('🔍 Final check - User role:', fullUser?.attributes?.['custom:role']);

  return (
    <Routes>
      {isOrganizer ? (
        <Route path="/*" element={
          <OrganizationProvider>
            <BackofficeLayout user={fullUser} signOut={signOut} />
          </OrganizationProvider>
        } />
      ) : (
        <Route path="/*" element={<UserSetup user={fullUser} signOut={signOut} />} />
      )}
    </Routes>
  );
}

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
                  <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      I am a <span style={{ color: '#e53e3e' }}>*</span>
                    </legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label 
                        htmlFor="role-athlete" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '15px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: '#fff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4299e1';
                          e.currentTarget.style.backgroundColor = '#ebf8ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }}
                      >
                        <input 
                          id="role-athlete"
                          type="radio" 
                          name="custom:role" 
                          value="athlete"
                          defaultChecked
                          required
                          style={{ 
                            marginRight: '10px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                          aria-label="Select athlete role"
                        />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '15px' }}>Athlete</div>
                          <div style={{ fontSize: '14px', color: '#718096' }}>Compete in events and view leaderboards</div>
                        </div>
                      </label>
                      <label 
                        htmlFor="role-organizer" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '15px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: '#fff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4299e1';
                          e.currentTarget.style.backgroundColor = '#ebf8ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }}
                      >
                        <input 
                          id="role-organizer"
                          type="radio" 
                          name="custom:role" 
                          value="organizer"
                          required
                          style={{ 
                            marginRight: '10px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                          aria-label="Select organizer role"
                        />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '15px' }}>Organizer</div>
                          <div style={{ fontSize: '14px', color: '#718096' }}>Create and manage competitions</div>
                        </div>
                      </label>
                    </div>
                    {validationErrors?.['custom:role'] && (
                      <div style={{ 
                        color: '#e53e3e', 
                        fontSize: '14px', 
                        marginTop: '8px' 
                      }}>
                        {validationErrors['custom:role']}
                      </div>
                    )}
                  </fieldset>
                </div>
              </>
            );
          }
        }
      }}
    >
      {({ signOut, user }) => {
        return <AuthenticatedRoutes user={user} signOut={signOut} />;
      }}
    </Authenticator>
  );
}

function AuthPageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check if user is already authenticated
    getCurrentUser()
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
      <NotificationProvider>
        <QueryClientProvider client={queryClient}>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/events" element={<PublicEvents />} />
                <Route path="/wods" element={<PublicWODs />} />
                <Route path="/exercises" element={<PublicExercises />} />
                <Route path="/events/:eventId" element={<PublicEventDetail />} />
                <Route path="/athlete/events/:eventId" element={<AthleteEventDetails />} />
                <Route path="/login" element={<AuthPageWrapper />} />
                <Route path="/athlete/:athleteId" element={<AuthPage />} />
                <Route path="/backoffice/*" element={<AuthPage />} />
                <Route path="/*" element={<AuthPage />} />
              </Routes>
            </Suspense>
          </Router>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
