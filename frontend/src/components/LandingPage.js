import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './common/LanguageSwitcher';

function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('organizers');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);
  
  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="hero">
        <nav className="navbar">
          <div className="logo">
            <img src="/athleon-white-crop.PNG" alt="Athleon" className="logo-image" />
            <span className="logo-text">Athleon</span>
          </div>
          
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
          
          <div className="nav-right">
            <LanguageSwitcher className="language-toggle-header" />
          </div>
          
          <nav 
            id="mobile-navigation"
            className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}
            aria-label="Main navigation"
          >
            <a 
              href="/events" 
              className="nav-link landing-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('navigation.events')}
            </a>
            <a 
              href="/wods" 
              className="nav-link landing-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              WODs Library
            </a>
            <a 
              href="/exercises" 
              className="nav-link landing-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Exercises Library
            </a>
            <button 
              className="auth-link" 
              onClick={() => {
                setMobileMenuOpen(false);
                handleGetStarted();
              }}
            >
              Sign In
            </button>
          </nav>
        </nav>

        <div className="hero-content">
          <h1 className="hero-title">
            {t('landing.title')}
          </h1>
          <p className="hero-subtitle">
            {t('landing.subtitle')}
          </p>
          <div className="hero-actions">
            <div className="cta-primary" onClick={handleGetStarted}>
              <span className="cta-text">{t('landing.getStarted')}</span>
              <span className="cta-arrow">→</span>
            </div>
            <div className="cta-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              {t('landing.learnMore')}
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">{t('landing.featuresTitle')}</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>{t('landing.features.multiCompetition.title')}</h3>
            <p>{t('landing.features.multiCompetition.description')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>{t('landing.features.realTimeScoring.title')}</h3>
            <p>{t('landing.features.realTimeScoring.description')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>{t('landing.features.athleteManagement.title')}</h3>
            <p>{t('landing.features.athleteManagement.description')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>{t('landing.features.analytics.title')}</h3>
            <p>{t('landing.features.analytics.description')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>{t('landing.features.multipleWods.title')}</h3>
            <p>{t('landing.features.multipleWods.description')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>{t('landing.features.roleBasedAccess.title')}</h3>
            <p>{t('landing.features.roleBasedAccess.description')}</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title">{t('landing.howItWorks.title')}</h2>
        
        {/* User Type Tabs */}
        <div className="user-tabs">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'organizers' ? 'active' : ''}`}
              onClick={() => setActiveTab('organizers')}
            >
              {t('landing.howItWorks.tabs.organizers')}
            </button>
            <button 
              className={`tab-button ${activeTab === 'athletes' ? 'active' : ''}`}
              onClick={() => setActiveTab('athletes')}
            >
              {t('landing.howItWorks.tabs.athletes')}
            </button>
          </div>
        </div>

        {/* Organizers Workflow */}
        {activeTab === 'organizers' && (
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>{t('landing.howItWorks.organizers.step1.title')}</h3>
              <p>{t('landing.howItWorks.organizers.step1.description')}</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>{t('landing.howItWorks.organizers.step2.title')}</h3>
              <p>{t('landing.howItWorks.organizers.step2.description')}</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>{t('landing.howItWorks.organizers.step3.title')}</h3>
              <p>{t('landing.howItWorks.organizers.step3.description')}</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>{t('landing.howItWorks.organizers.step4.title')}</h3>
              <p>{t('landing.howItWorks.organizers.step4.description')}</p>
            </div>
          </div>
        )}

        {/* Athletes Workflow */}
        {activeTab === 'athletes' && (
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>{t('landing.howItWorks.athletes.step1.title')}</h3>
              <p>{t('landing.howItWorks.athletes.step1.description')}</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>{t('landing.howItWorks.athletes.step2.title')}</h3>
              <p>{t('landing.howItWorks.athletes.step2.description')}</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>{t('landing.howItWorks.athletes.step3.title')}</h3>
              <p>{t('landing.howItWorks.athletes.step3.description')}</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>{t('landing.howItWorks.athletes.step4.title')}</h3>
              <p>{t('landing.howItWorks.athletes.step4.description')}</p>
            </div>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>{t('landing.cta.title')}</h2>
        <p>{t('landing.cta.subtitle')}</p>
        <div className="cta-card" onClick={handleGetStarted}>
          <div className="cta-content">
            <span className="cta-title">{t('landing.getStarted')}</span>
            <span className="cta-subtitle">Free forever</span>
          </div>
          <div className="cta-icon">✨</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/athleon-white-crop.PNG" alt="Athleon" className="logo-image" />
            <span>Athleon</span>
          </div>
          <p>© 2025 Athleon Forge. Where champions are forged.</p>
        </div>
      </footer>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          background: #ffffff;
        }

        /* Navbar */
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 5%;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          gap: 20px;
        }
        
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 24px;
          font-weight: 700;
          color: #6B7C93;
        }

        .logo-image {
          width: 40px;
          height: 40px;
        }

        .logo-icon {
          font-size: 32px;
        }

        .mobile-menu-toggle {
          display: none;
          flex-direction: column;
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
        }

        .mobile-menu-toggle span {
          width: 25px;
          height: 3px;
          background: #6B7C93;
          margin: 3px 0;
          transition: 0.3s;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-direction: row;
        }

        .landing-nav-link {
          color: #6B7C93 !important;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 8px;
          transition: all 0.3s ease;
          position: relative;
          white-space: nowrap;
        }

        .landing-nav-link:hover {
          color: #FF5722 !important;
          background: rgba(255, 87, 34, 0.08);
          transform: translateY(-1px);
          opacity: 1;
        }

        .auth-link {
          background: linear-gradient(135deg, #FF5722 0%, #FF8A65 100%);
          color: white;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(255, 87, 34, 0.25);
          white-space: nowrap;
        }

        .auth-link:hover {
          background: linear-gradient(135deg, #E64A19 0%, #FF7043 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 87, 34, 0.35);
        }

        /* Hero Section */
        .hero {
          background: linear-gradient(135deg, #B87333 0%, #FF5722 100%);
          color: white;
          padding-bottom: 100px;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 100px 20px;
          text-align: center;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          margin: 0 0 20px 0;
          line-height: 1.2;
          color: white;
        }

        .hero-subtitle {
          font-size: 20px;
          opacity: 0.95;
          margin: 0 0 40px 0;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* Buttons */
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 14px 30px;
          font-size: 16px;
          font-weight: 500;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }



        .cta-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #FF5722 0%, #6B7C93 100%);
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(255, 87, 34, 0.3);
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255, 87, 34, 0.4);
        }

        .cta-text {
          font-size: 16px;
          font-weight: 600;
        }

        .cta-arrow {
          font-size: 18px;
          transition: transform 0.3s ease;
        }

        .cta-primary:hover .cta-arrow {
          transform: translateX(4px);
        }

        .cta-secondary {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          font-weight: 500;
          padding: 16px 32px;
          border: 1px solid #6B7C93;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .cta-secondary:hover {
          background: rgba(107, 124, 147, 0.1);
          border-color: #6B7C93;
        }

        .cta-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          padding: 24px 32px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          margin: 0 auto;
        }

        .cta-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
        }

        .cta-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cta-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .cta-subtitle {
          font-size: 14px;
          color: #666;
        }

        .cta-icon {
          font-size: 24px;
        }

        /* Features Section */
        .features {
          padding: 100px 5%;
          background: #f8f9fa;
        }

        .section-title {
          text-align: center;
          font-size: 42px;
          font-weight: 700;
          margin: 0 0 60px 0;
          color: #2d3748;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.07);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .feature-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .feature-card h3 {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 15px 0;
          color: #2d3748;
        }

        .feature-card p {
          font-size: 16px;
          line-height: 1.6;
          color: #4a5568;
          margin: 0;
        }

        /* How It Works */
        .how-it-works {
          padding: 100px 5%;
          background: white;
        }

        .user-tabs {
          margin-bottom: 60px;
        }

        .tab-buttons {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 40px;
        }

        .tab-button {
          background: rgba(184, 115, 51, 0.1);
          color: #B87333;
          border: 2px solid rgba(184, 115, 51, 0.2);
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .tab-button:hover {
          background: rgba(184, 115, 51, 0.2);
          border-color: rgba(184, 115, 51, 0.4);
        }

        .tab-button.active {
          background: linear-gradient(135deg, #B87333 0%, #FF5722 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 15px rgba(184, 115, 51, 0.3);
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .step {
          text-align: center;
        }

        .step-number {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #B87333 0%, #FF5722 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          margin: 0 auto 20px;
        }

        .step h3 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 10px 0;
          color: #2d3748;
        }

        .step p {
          font-size: 16px;
          color: #4a5568;
          margin: 0;
        }

        /* CTA Section */
        .cta {
          padding: 100px 5%;
          background: linear-gradient(135deg, #B87333 0%, #FF5722 100%);
          color: white;
          text-align: center;
        }

        .cta h2 {
          font-size: 42px;
          font-weight: 700;
          margin: 0 0 15px 0;
        }

        .cta p {
          font-size: 20px;
          margin: 0 0 40px 0;
          opacity: 0.95;
        }

        /* Footer */
        .footer {
          padding: 40px 5%;
          background: #2d3748;
          color: white;
          text-align: center;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .footer p {
          margin: 0;
          opacity: 0.8;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .navbar {
            padding: 15px 20px;
            position: relative;
          }

          .mobile-menu-toggle {
            display: flex;
          }

          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transform: translateY(-100%);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            gap: 0;
          }

          .nav-links-open {
            transform: translateY(0);
            opacity: 1;
            visibility: visible;
          }

          .landing-nav-link {
            width: 100%;
            padding: 14px 20px;
            text-align: left;
            border-bottom: 1px solid rgba(107, 124, 147, 0.1);
            border-radius: 0;
          }
          
          .landing-nav-link:hover {
            background: rgba(255, 87, 34, 0.05);
            transform: none;
          }

          .auth-link {
            width: 100%;
            margin-top: 10px;
            padding: 14px 20px;
            border-radius: 8px;
            text-align: center;
          }

          .logo {
            font-size: 20px;
          }

          .logo-image {
            width: 32px;
            height: 32px;
          }

          .hero-content {
            padding: 60px 20px;
          }

          .hero-title {
            font-size: 36px;
          }

          .hero-subtitle {
            font-size: 18px;
          }

          .hero-actions {
            flex-direction: column;
            gap: 15px;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            padding: 14px 24px;
            font-size: 16px;
          }

          .section-title {
            font-size: 32px;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .steps {
            grid-template-columns: 1fr;
          }

          .tab-buttons {
            flex-direction: column;
            gap: 10px;
            align-items: center;
          }

          .tab-button {
            width: 200px;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .navbar {
            padding: 10px 15px;
          }

          .logo-text {
            display: none;
          }

          .nav-links {
            padding: 15px;
          }

          .hero-title {
            font-size: 28px;
          }

          .hero-subtitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
