import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { get } from 'aws-amplify/api';
import { useTranslation } from 'react-i18next';
import CategorySelection from './CategorySelection';
import AthleteProfile from './AthleteProfile';
import AthleteEventDetails from './athlete/AthleteEventDetails';
import LanguageSwitcher from './common/LanguageSwitcher';

function UserSetup({ user, signOut }) {
  const { t } = useTranslation();
  const [needsSetup, setNeedsSetup] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [age, setAge] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkUserSetup = async () => {
    try {
      // Check if user already has a profile with category
      const apiResponse = await get({
        apiName: 'CalisthenicsAPI',
        path: '/athletes'
      }).response;
      const response = await apiResponse.body.json();
      const userAthlete = response.find(athlete => 
        athlete.email === user?.attributes?.email
      );
      
      if (userAthlete && userAthlete.categoryId) {
        setNeedsSetup(false);
      } else {
        // Pre-fill alias and age from sign-up if available
        const userAlias = user?.attributes?.['custom:alias'];
        const userAge = user?.attributes?.['custom:age'];
        
        if (userAlias) {
          setAlias(userAlias);
        }
        if (userAge) {
          setAge(userAge);
        }
      }
    } catch (error) {
      console.error('Error checking user setup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(categoryId);
  };

  const handleCompleteSetup = async () => {
    if (!selectedCategoryId) {
      alert(t('auth.profileSetup.errors.categoryRequired'));
      return;
    }
    if (!age || age < 1 || age > 100) {
      alert(t('auth.profileSetup.errors.ageInvalid'));
      return;
    }
    if (!alias.trim()) {
      alert(t('auth.profileSetup.errors.aliasRequired'));
      return;
    }

    try {
      const athleteData = {
        athleteId: user?.attributes?.sub,
        firstName: user?.attributes?.given_name || '',
        lastName: user?.attributes?.family_name || '',
        email: user?.attributes?.email || '',
        alias: alias.trim(),
        categoryId: selectedCategoryId,
        age: parseInt(age),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Saving athlete data:', athleteData);
      await client.post('CalisthenicsAPI', '/athletes', { body: athleteData });
      setNeedsSetup(false);
    } catch (error) {
      console.error('Error completing setup:', error);
      alert(t('auth.profileSetup.errors.saveFailed'));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>{t('common.loading')}</h2>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="user-setup">
        <div className="setup-container">
          <div className="setup-header">
            <div className="header-content">
              <h1>{t('auth.profileSetup.title')}</h1>
              <p>{t('auth.profileSetup.subtitle')}</p>
            </div>
            <LanguageSwitcher />
          </div>
          
          <div className="profile-form">
            <div className="form-group">
              <label>{t('auth.profileSetup.age')} {age && <span className="prefilled">{t('auth.profileSetup.prefilled')}</span>}</label>
              <input 
                type="number" 
                value={age} 
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('auth.profileSetup.agePlaceholder')}
                min="1" 
                max="100"
              />
              {!age && <small className="hint">{t('auth.profileSetup.ageHint')}</small>}
            </div>
            <div className="form-group">
              <label>{t('auth.profileSetup.alias')} {alias && <span className="prefilled">{t('auth.profileSetup.prefilled')}</span>}</label>
              <input 
                type="text" 
                value={alias} 
                onChange={(e) => setAlias(e.target.value)}
                placeholder={t('auth.profileSetup.aliasPlaceholder')}
                maxLength="50"
              />
              {!alias && <small className="hint">{t('auth.profileSetup.aliasHint')}</small>}
            </div>
          </div>
          
          <CategorySelection 
            onCategorySelect={handleCategorySelect}
            selectedCategoryId={selectedCategoryId}
          />
          
          <div className="setup-actions">
            <button 
              onClick={handleCompleteSetup}
              disabled={!selectedCategoryId || !age || !alias.trim()}
              className="complete-setup-btn"
            >
              {t('auth.profileSetup.completeSetup')}
            </button>
          </div>
        </div>

        <style>{`
          .user-setup {
            min-height: 100vh;
            background: linear-gradient(135deg, #B87333 0%, #FF5722 100%);
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .setup-container {
            max-width: 900px;
            width: 100%;
          }
          .setup-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            color: white;
            margin-bottom: 40px;
            gap: 20px;
          }
          .header-content {
            flex: 1;
          }
          .setup-header h1 {
            font-size: 2.5rem;
            margin-bottom: 15px;
            font-weight: 700;
            color: white;
          }
          .setup-header p {
            font-size: 1.2rem;
            opacity: 0.9;
          }
          .profile-form {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          .form-group {
            margin-bottom: 20px;
          }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 16px;
          }
          .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
          }
          .form-group input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
          }
          .prefilled {
            color: #28a745;
            font-size: 14px;
            font-weight: 500;
            margin-left: 8px;
          }
          .hint {
            display: block;
            margin-top: 6px;
            color: #6c757d;
            font-size: 14px;
          }
          .setup-actions {
            text-align: center;
            margin-top: 40px;
          }
          .complete-setup-btn {
            background: #28a745;
            color: white;
            padding: 16px 40px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(40,167,69,0.3);
          }
          .complete-setup-btn:hover:not(:disabled) {
            background: #218838;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(40,167,69,0.4);
          }
          .complete-setup-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          @media (max-width: 768px) {
            .setup-header h1 {
              font-size: 2rem;
            }
            .profile-form {
              padding: 20px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/athlete/events/:eventId" element={<AthleteEventDetails />} />
      <Route path="/events/:eventId" element={<AthleteEventDetails />} />
      <Route path="/*" element={<AthleteProfile user={user} signOut={signOut} />} />
    </Routes>
  );
}

export default UserSetup;
