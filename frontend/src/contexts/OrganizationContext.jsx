import { createContext, useState, useEffect, useContext } from 'react';
import { get, post } from '../lib/api';
import { getCurrentUser } from 'aws-amplify/auth';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
    fetchOrganizations();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const user = await getCurrentUser();
      const email = user?.attributes?.email || user?.email;
      setIsSuperAdmin(email === 'admin@athleon.fitness');
    } catch (error) {
      console.error('Error checking super admin:', error);
      setIsSuperAdmin(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      // Ensure user is authenticated before making API calls
      const user = await getCurrentUser();
      if (!user) {
        console.log('User not authenticated, skipping organizations fetch');
        return;
      }

      const response = await get('/organizations');
      
      // Ensure orgs is an array
      const orgs = Array.isArray(response) ? response : [];
      
      // Add "All Organizations" option for super admin
      const currentUser = await getCurrentUser();
      const email = currentUser?.attributes?.email || currentUser?.email;
      
      if (email === 'admin@athleon.fitness') {
        const allOrgsOption = {
          organizationId: 'all',
          name: 'All Organizations',
          role: 'super_admin'
        };
        setOrganizations([allOrgsOption, ...orgs]);
        
        const savedOrgId = localStorage.getItem('selectedOrganizationId');
        const defaultOrg = savedOrgId 
          ? [allOrgsOption, ...orgs].find(o => o.organizationId === savedOrgId)
          : allOrgsOption;
        
        setSelectedOrganization(defaultOrg);
      } else {
        setOrganizations(orgs);
        
        const savedOrgId = localStorage.getItem('selectedOrganizationId');
        const defaultOrg = savedOrgId 
          ? orgs.find(o => o.organizationId === savedOrgId) 
          : orgs[0];
        
        if (defaultOrg) {
          setSelectedOrganization(defaultOrg);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = (org) => {
    setSelectedOrganization(org);
    localStorage.setItem('selectedOrganizationId', org.organizationId);
  };

  const createOrganization = async (name, description) => {
    const newOrg = await post('/organizations', { name, description });
    await fetchOrganizations();
    return newOrg;
  };

  const value = {
    organizations,
    selectedOrganization,
    selectOrganization,
    createOrganization,
    refreshOrganizations: fetchOrganizations,
    loading,
    isSuperAdmin
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
