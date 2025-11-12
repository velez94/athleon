import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './common/LanguageSwitcher';
import EventManagement from './backoffice/EventManagement';
import EventDetails from './backoffice/EventDetails';
import EventEdit from './backoffice/EventEdit';
import AthleteManagement from './backoffice/AthleteManagement';
import CategoryManagement from './backoffice/CategoryManagement';
import WODManagement from './backoffice/WODManagement';
import ScoreEntry from './backoffice/ScoreEntry';
import Leaderboard from './backoffice/Leaderboard';
import Analytics from './backoffice/Analytics';
import AdminProfile from './backoffice/AdminProfile';
import OrganizationManagement from './backoffice/OrganizationManagement';
import ExerciseLibraryManager from './backoffice/ExerciseLibraryManager';
import AuthorizationAdmin from './backoffice/AuthorizationAdmin';
import { getOrganizerRole, ROLE_LABELS, hasPermission, PERMISSIONS } from '../utils/organizerRoles';
import './BackofficeLayout.css';

function BackofficeLayout({ user, signOut }) {
  const location = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 767;
      setIsMobile(mobile);
      // Auto-hide sidebar on mobile by default
      if (mobile && sidebarVisible) {
        setSidebarVisible(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Prevent flash of unstyled content
    const timer = setTimeout(() => setIsLoading(false), 100);
    
    // Set initial mobile state
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);
  
  const organizerRole = getOrganizerRole(user);
  const roleLabel = ROLE_LABELS[organizerRole] || 'Organizer';
  
  // Show loading screen to prevent flash
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#ecf0f1'
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  const isActive = (path) => location.pathname === path;
  
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };
  
  const handleOverlayClick = () => {
    if (isMobile) {
      setSidebarVisible(false);
    }
  };
  
  const handleLinkClick = () => {
    // Auto-close sidebar on mobile after clicking a link
    if (isMobile) {
      setSidebarVisible(false);
    }
  };

  return (
    <div className="backoffice-layout">
      {/* Mobile overlay */}
      {sidebarVisible && isMobile && (
        <div className="mobile-overlay" onClick={handleOverlayClick}></div>
      )}
      
      {/* Sidebar */}
      <div className={`sidebar-container ${sidebarVisible ? '' : 'hidden'}`}>
        <nav className="backoffice-nav">
          <div className="nav-header" onClick={() => window.location.href = '/backoffice/admin-profile'}>
            <div className="admin-info">
              <span className="admin-icon" aria-label="User profile">👤</span>
              <div className="admin-text">
                <h2>Athleon</h2>
                <div className="user-info">
                  <span>{user?.attributes?.given_name || user?.username}</span>
                  <span className="role-badge">{roleLabel}</span>
                  <LanguageSwitcher className="mb-2" />
                  <div 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      signOut(); 
                    }} 
                    className="logout-link"
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        signOut();
                      }
                    }}
                  >
                    {t('navigation.logout')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="nav-links">
            {(organizerRole === 'super_admin' || organizerRole === 'owner' || organizerRole === 'admin') && (
              <Link 
                to="/backoffice/organization" 
                className={isActive('/backoffice/organization') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">🏢</span>
                  <span className="nav-text">Organization</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.MANAGE_EVENTS) && (
              <Link 
                to="/backoffice/events" 
                className={isActive('/backoffice/events') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">📅</span>
                  <span className="nav-text">Events</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.MANAGE_ATHLETES) && (
              <Link 
                to="/backoffice/athletes" 
                className={isActive('/backoffice/athletes') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">👥</span>
                  <span className="nav-text">Athletes</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.MANAGE_CATEGORIES) && (
              <Link 
                to="/backoffice/categories" 
                className={isActive('/backoffice/categories') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">🏷️</span>
                  <span className="nav-text">Categories</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.MANAGE_WODS) && (
              <Link 
                to="/backoffice/wods" 
                className={isActive('/backoffice/wods') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">💪</span>
                  <span className="nav-text">WODs</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.MANAGE_WODS) && (
              <Link 
                to="/backoffice/exercises" 
                className={isActive('/backoffice/exercises') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">🏋️</span>
                  <span className="nav-text">Exercise Library</span>
                </div>
              </Link>
            )}
            {(user?.email === 'admin@athleon.fitness' || user?.attributes?.email === 'admin@athleon.fitness') && (
              <Link 
                to="/backoffice/authorization" 
                className={isActive('/backoffice/authorization') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">🔐</span>
                  <span className="nav-text">Authorization Admin</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.ENTER_SCORES) && (
              <Link 
                to="/backoffice/scores" 
                className={isActive('/backoffice/scores') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">📝</span>
                  <span className="nav-text">Score Entry</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.VIEW_LEADERBOARDS) && (
              <Link 
                to="/backoffice/leaderboard" 
                className={isActive('/backoffice/leaderboard') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">🏆</span>
                  <span className="nav-text">Leaderboard</span>
                </div>
              </Link>
            )}
            {hasPermission(organizerRole, PERMISSIONS.MANAGE_OWN_COMPETITIONS) && (
              <Link 
                to="/backoffice/analytics" 
                className={isActive('/backoffice/analytics') ? 'active' : ''}
                onClick={handleLinkClick}
              >
                <div className="nav-content">
                  <span className="nav-icon" aria-hidden="true">📊</span>
                  <span className="nav-text">Analytics</span>
                </div>
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Toggle Button */}
      <button 
        className={`sidebar-toggle ${sidebarVisible ? 'sidebar-open' : ''}`}
        onClick={toggleSidebar}
        aria-label={sidebarVisible ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={sidebarVisible}
      >
        {sidebarVisible ? '←' : '→'}
      </button>

      {/* Main Content */}
      <main className={`backoffice-content ${sidebarVisible ? 'sidebar-open' : ''}`}>
        <Routes>
          <Route path="events/:eventId/schedule/:scheduleId" element={<EventDetails />} />
          <Route path="events/:eventId/edit" element={<EventEdit />} />
          <Route path="events/:eventId" element={<EventDetails />} />
          <Route path="events" element={<EventManagement />} />
          <Route path="athletes" element={<AthleteManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="wods" element={<WODManagement />} />
          <Route path="exercises" element={<ExerciseLibraryManager />} />
          <Route path="authorization" element={<AuthorizationAdmin />} />
          <Route path="scores" element={<ScoreEntry />} />
          <Route path="scores/:eventId" element={<ScoreEntry />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="organization/:organizationId" element={<OrganizationManagement />} />
          <Route path="organization" element={<OrganizationManagement />} />
          <Route path="admin-profile" element={<AdminProfile user={user} signOut={signOut} />} />
          <Route path="/" element={<EventManagement />} />
          <Route path="*" element={<EventManagement />} />
        </Routes>
      </main>
    </div>
  );
}

export default BackofficeLayout;
