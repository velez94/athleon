// Organizer Role System
export const ORGANIZER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  EVENT_ADMIN: 'event_admin',
  AUXILIARY_ADMIN: 'auxiliary_admin'
};

export const ROLE_LABELS = {
  [ORGANIZER_ROLES.SUPER_ADMIN]: 'Platform Super Admin',
  [ORGANIZER_ROLES.EVENT_ADMIN]: 'Event Administrator',
  [ORGANIZER_ROLES.AUXILIARY_ADMIN]: 'Auxiliary Administrator'
};

export const PERMISSIONS = {
  // Super Admin - Full platform access
  MANAGE_ALL_COMPETITIONS: 'manage_all_competitions',
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_DATA: 'view_all_data',
  
  // Event Admin - Competition owner
  CREATE_COMPETITION: 'create_competition',
  MANAGE_OWN_COMPETITIONS: 'manage_own_competitions',
  MANAGE_EVENTS: 'manage_events',
  MANAGE_CATEGORIES: 'manage_categories',
  MANAGE_WODS: 'manage_wods',
  ASSIGN_AUXILIARY_ADMINS: 'assign_auxiliary_admins',
  
  // Auxiliary Admin - Limited access
  ENTER_SCORES: 'enter_scores',
  MANAGE_ATHLETES: 'manage_athletes',
  VIEW_LEADERBOARDS: 'view_leaderboards',
  MANAGE_ATHLETE_INFO: 'manage_athlete_info'
};

const ROLE_PERMISSIONS = {
  [ORGANIZER_ROLES.SUPER_ADMIN]: [
    PERMISSIONS.MANAGE_ALL_COMPETITIONS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_DATA,
    PERMISSIONS.CREATE_COMPETITION,
    PERMISSIONS.MANAGE_OWN_COMPETITIONS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_WODS,
    PERMISSIONS.ASSIGN_AUXILIARY_ADMINS,
    PERMISSIONS.ENTER_SCORES,
    PERMISSIONS.MANAGE_ATHLETES,
    PERMISSIONS.VIEW_LEADERBOARDS,
    PERMISSIONS.MANAGE_ATHLETE_INFO
  ],
  [ORGANIZER_ROLES.EVENT_ADMIN]: [
    PERMISSIONS.CREATE_COMPETITION,
    PERMISSIONS.MANAGE_OWN_COMPETITIONS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_WODS,
    PERMISSIONS.ASSIGN_AUXILIARY_ADMINS,
    PERMISSIONS.ENTER_SCORES,
    PERMISSIONS.MANAGE_ATHLETES,
    PERMISSIONS.VIEW_LEADERBOARDS,
    PERMISSIONS.MANAGE_ATHLETE_INFO
  ],
  [ORGANIZER_ROLES.AUXILIARY_ADMIN]: [
    PERMISSIONS.ENTER_SCORES,
    PERMISSIONS.MANAGE_ATHLETES,
    PERMISSIONS.VIEW_LEADERBOARDS,
    PERMISSIONS.MANAGE_ATHLETE_INFO
  ]
};

export const hasPermission = (userRole, permission) => {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

export const getOrganizerRole = (user) => {
  console.log('🔍 getOrganizerRole - checking user:', {
    email: user?.attributes?.email,
    customRole: user?.attributes?.['custom:role'],
    organizerRole: user?.attributes?.['custom:organizerRole']
  });
  
  // Check for super admin by custom:role attribute
  if (user?.attributes?.['custom:role'] === 'super_admin') {
    console.log('✅ User is SUPER_ADMIN (by custom:role)');
    return ORGANIZER_ROLES.SUPER_ADMIN;
  }
  
  // Check for organizerRole attribute (for fine-grained organizer permissions)
  const organizerRole = user?.attributes?.['custom:organizerRole'];
  if (organizerRole && Object.values(ORGANIZER_ROLES).includes(organizerRole)) {
    console.log('✅ User has organizerRole:', organizerRole);
    return organizerRole;
  }
  
  // Check if role is 'organizer' - default to event_admin
  if (user?.attributes?.['custom:role'] === 'organizer') {
    console.log('✅ User is EVENT_ADMIN (organizer role)');
    return ORGANIZER_ROLES.EVENT_ADMIN;
  }
  
  console.log('❌ User has no organizer role');
  return null;
};

export const canAccessBackoffice = (user) => {
  const role = getOrganizerRole(user);
  return role !== null;
};
