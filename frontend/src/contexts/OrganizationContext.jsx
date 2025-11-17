import { createContext, useState, useEffect, useContext } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();
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
      const orgs = await client.get({
        apiName: 'CalisthenicsAPI',
        path: '/organizations'
      });
      
      // Add "All Organizations" option for super admin
      const user = await getCurrentUser();
      const email = user?.attributes?.email || user?.email;
      
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
    const newOrg = await client.post({
      apiName: 'CalisthenicsAPI',
      path: '/organizations',
      options: {
        body: { name, description }
      }
    });
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
