import { useState } from 'react';
import { signUp } from 'aws-amplify/auth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './common/LanguageSwitcher';

function CustomSignUp({ onSuccess: _onSuccess, onSwitchToSignIn }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    given_name: '',
    family_name: '',
    phone_number: '',
    alias: '',
    age: '',
    role: 'athlete'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.given_name || !formData.family_name) {
      setError(t('auth.signUp.errors.nameRequired'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.signUp.errors.passwordMismatch'));
      return;
    }

    // Validate phone number format
    if (formData.phone_number && !formData.phone_number.startsWith('+')) {
      setError(t('auth.signUp.errors.phoneFormat'));
      return;
    }

    setLoading(true);

    try {
      const signUpParams = {
        username: formData.email,
        password: formData.password,
        attributes: {
          email: formData.email,
          given_name: formData.given_name,
          family_name: formData.family_name,
          'custom:role': formData.role
        }
      };

      // Add optional fields if provided
      if (formData.phone_number) {
        signUpParams.attributes.phone_number = formData.phone_number;
      }
      
      // Store alias and age in custom attributes for athletes
      if (formData.role === 'athlete') {
        if (formData.alias) {
          signUpParams.attributes['custom:alias'] = formData.alias;
        }
        if (formData.age) {
          signUpParams.attributes['custom:age'] = formData.age;
        }
      }

      await signUp(signUpParams);

      alert(t('auth.signUp.success'));
      onSwitchToSignIn();
    } catch (err) {
      setError(err.message || t('auth.signUp.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-signup">
      <div className="signup-container">
        <div className="header-with-language">
          <div>
            <h2>{t('auth.signUp.title')}</h2>
            <p className="subtitle">{t('auth.signUp.subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.signUp.role')} {t('auth.signUp.roleRequired')}</label>
            <div className="role-selector">
              <label className={`role-option ${formData.role === 'athlete' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="athlete"
                  checked={formData.role === 'athlete'}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                />
                <div className="role-content">
                  <span className="role-icon">🏃</span>
                  <div>
                    <strong>{t('auth.signUp.athlete')}</strong>
                    <p>{t('auth.signUp.athleteDescription')}</p>
                  </div>
                </div>
              </label>

              <label className={`role-option ${formData.role === 'organizer' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="organizer"
                  checked={formData.role === 'organizer'}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                />
                <div className="role-content">
                  <span className="role-icon">📋</span>
                  <div>
                    <strong>{t('auth.signUp.organizer')}</strong>
                    <p>{t('auth.signUp.organizerDescription')}</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('auth.signUp.firstName')} {t('auth.signUp.required')}</label>
              <input
                type="text"
                value={formData.given_name}
                onChange={(e) => setFormData({...formData, given_name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('auth.signUp.lastName')} {t('auth.signUp.required')}</label>
              <input
                type="text"
                value={formData.family_name}
                onChange={(e) => setFormData({...formData, family_name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('auth.signUp.email')} {t('auth.signUp.required')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('auth.signUp.phoneOptional')}</label>
            <input
              type="tel"
              placeholder="+1234567890"
              value={formData.phone_number}
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
            />
            <small>{t('auth.signUp.phoneHint')}</small>
          </div>

          {formData.role === 'athlete' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('auth.signUp.aliasOptional')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.signUp.aliasPlaceholder')}
                    value={formData.alias}
                    onChange={(e) => setFormData({...formData, alias: e.target.value})}
                    maxLength="50"
                  />
                  <small>{t('auth.signUp.aliasHint')}</small>
                </div>

                <div className="form-group">
                  <label>{t('auth.signUp.ageOptional')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.signUp.agePlaceholder')}
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    min="1"
                    max="120"
                  />
                  <small>{t('auth.signUp.ageHint')}</small>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>{t('auth.signUp.password')} {t('auth.signUp.required')}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              minLength={8}
            />
            <small>{t('auth.signUp.passwordHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('auth.signUp.confirmPassword')} {t('auth.signUp.required')}</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? t('auth.signUp.creatingAccount') : t('auth.signUp.createAccount')}
          </button>
        </form>

        <p className="switch-auth">
          {t('auth.signUp.alreadyHaveAccount')} <button onClick={onSwitchToSignIn}>{t('auth.signUp.signIn')}</button>
        </p>
      </div>

      <style>{`
        .custom-signup {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          padding: 20px;
        }

        .signup-container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 500px;
          width: 100%;
        }

        .header-with-language {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 20px;
        }

        h2 {
          margin: 0 0 10px 0;
          color: #2d3748;
          font-size: 28px;
        }

        .subtitle {
          margin: 0 0 10px 0;
          color: #4a5568;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2d3748;
        }

        input[type="text"],
        input[type="email"],
        input[type="tel"],
        input[type="password"] {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        input:focus {
          outline: none;
          border-color: #FF5722;
        }

        small {
          display: block;
          margin-top: 5px;
          color: #718096;
          font-size: 13px;
        }

        .role-selector {
          display: grid;
          gap: 15px;
        }

        .role-option {
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s;
          display: block;
        }

        .role-option:hover {
          border-color: #FF5722;
          background: #f7fafc;
        }

        .role-option.selected {
          border-color: #FF5722;
          background: #ffe8e0;
        }

        .role-option input[type="radio"] {
          display: none;
        }

        .role-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .role-icon {
          font-size: 32px;
        }

        .role-content strong {
          display: block;
          font-size: 16px;
          color: #2d3748;
          margin-bottom: 4px;
        }

        .role-content p {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        .btn-submit {
          width: 100%;
          background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
          color: white;
          border: none;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .switch-auth {
          text-align: center;
          margin-top: 20px;
          color: #4a5568;
        }

        .switch-auth button {
          background: none;
          border: none;
          color: #FF5722;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .signup-container {
            padding: 30px 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CustomSignUp;
