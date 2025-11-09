import React from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import './OrganizationSelector.css';

function OrganizationSelector() {
  const { organizations, selectedOrganization, selectOrganization } = useOrganization();

  return (
    <div className="organization-selector">
      <select 
        value={selectedOrganization?.organizationId || ''} 
        onChange={(e) => {
          const org = organizations.find(o => o.organizationId === e.target.value);
          if (org) selectOrganization(org);
        }}
        className="org-dropdown"
      >
        {organizations.map(org => (
          <option key={org.organizationId} value={org.organizationId}>
            {org.name} ({org.role})
          </option>
        ))}
      </select>
    </div>
  );
}

export default OrganizationSelector;
