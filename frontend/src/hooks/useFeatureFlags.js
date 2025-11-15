import { useState, useEffect, createContext, useContext } from 'react';
import { API } from 'aws-amplify';

const FeatureFlagContext = createContext();

// Feature flag provider component
export const FeatureFlagProvider = ({ children }) => {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      // Call backend endpoint to get feature flags
      const response = await API.get('CalisthenicsAPI', '/feature-flags');
      setFlags(response.flags || {});
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
      // Set default flags
      setFlags({
        newScoringSystem: false,
        advancedScheduler: false,
        realTimeLeaderboard: true,
        betaFeatures: false,
        organizationAnalytics: false,
        mobileApp: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, loading, refetch: fetchFeatureFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Hook to use feature flags
export const useFeatureFlag = (flagName) => {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider');
  }

  const { flags, loading } = context;
  return {
    isEnabled: flags[flagName] || false,
    loading
  };
};

// Hook to get all feature flags
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }

  return context;
};

// Component wrapper for conditional rendering
export const FeatureFlag = ({ flag, children, fallback = null }) => {
  const { isEnabled, loading } = useFeatureFlag(flag);
  
  if (loading) {
    return fallback;
  }
  
  return isEnabled ? children : fallback;
};
