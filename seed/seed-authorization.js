const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const ROLES_TABLE = 'Athleon-development-AuthorizationRolesTable118AC625-EUPOAS730QV';
const PERMISSIONS_TABLE = 'Athleon-development-AuthorizationPermissionsTable79EDEB0E-A6561ZHEJ93R';
const USER_ROLES_TABLE = 'Athleon-development-AuthorizationUserRolesTable77A8EE09-1D6YJNRHPJMU0';

async function seedRoles() {
  const roles = [
    {
      roleId: 'super_admin',
      name: 'Super Administrator',
      description: 'Full system access'
    },
    {
      roleId: 'org_owner',
      name: 'Organization Owner',
      description: 'Full organization control'
    },
    {
      roleId: 'org_admin',
      name: 'Organization Admin',
      description: 'Manage members and events'
    },
    {
      roleId: 'org_member',
      name: 'Organization Member',
      description: 'Create and edit events'
    },
    {
      roleId: 'athlete',
      name: 'Athlete',
      description: 'Register for events and submit scores'
    }
  ];

  for (const role of roles) {
    await ddb.send(new PutCommand({
      TableName: ROLES_TABLE,
      Item: role
    }));
    console.log(`Created role: ${role.name}`);
  }
}

async function seedPermissions() {
  const permissions = [
    // Super Admin - all permissions
    { roleId: 'super_admin', resource: '*', actions: ['*'] },
    { roleId: 'super_admin', resource: 'transversal_categories', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'super_admin', resource: 'global_categories', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'super_admin', resource: 'system_wods', actions: ['create', 'read', 'update', 'delete'] },
    
    // Organization Owner
    { roleId: 'org_owner', resource: 'organizations', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_owner', resource: 'events', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_owner', resource: 'wods', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_owner', resource: 'categories', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_owner', resource: 'members', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_owner', resource: 'transversal_categories', actions: ['read'] },
    
    // Organization Admin
    { roleId: 'org_admin', resource: 'events', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_admin', resource: 'wods', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_admin', resource: 'categories', actions: ['create', 'read', 'update', 'delete'] },
    { roleId: 'org_admin', resource: 'members', actions: ['create', 'read', 'update'] },
    { roleId: 'org_admin', resource: 'transversal_categories', actions: ['read'] },
    
    // Organization Member
    { roleId: 'org_member', resource: 'events', actions: ['create', 'read', 'update'] },
    { roleId: 'org_member', resource: 'wods', actions: ['read'] },
    { roleId: 'org_member', resource: 'categories', actions: ['read'] },
    { roleId: 'org_member', resource: 'transversal_categories', actions: ['read'] },
    
    // Athlete
    { roleId: 'athlete', resource: 'events', actions: ['read'] },
    { roleId: 'athlete', resource: 'registrations', actions: ['create', 'read', 'update'] },
    { roleId: 'athlete', resource: 'scores', actions: ['create', 'read'] },
    { roleId: 'athlete', resource: 'profile', actions: ['read', 'update'] },
    { roleId: 'athlete', resource: 'transversal_categories', actions: ['read'] }
  ];

  for (const perm of permissions) {
    await ddb.send(new PutCommand({
      TableName: PERMISSIONS_TABLE,
      Item: perm
    }));
    console.log(`Created permission: ${perm.roleId} -> ${perm.resource}`);
  }
}

async function seedUserRoles() {
  const userRoles = [
    {
      userId: 'admin@athleon.fitness',
      contextId: 'global',
      roleId: 'super_admin',
      assignedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    },
    {
      userId: 'admin@athleon.fitness',
      contextId: 'transversal_categories',
      roleId: 'super_admin',
      assignedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    }
  ];

  for (const userRole of userRoles) {
    await ddb.send(new PutCommand({
      TableName: USER_ROLES_TABLE,
      Item: userRole
    }));
    console.log(`Assigned role: ${userRole.roleId} to ${userRole.userId}`);
  }
}

async function main() {
  try {
    console.log('Seeding authorization system...');
    await seedRoles();
    await seedPermissions();
    await seedUserRoles();
    console.log('Authorization system seeded successfully!');
  } catch (error) {
    console.error('Error seeding authorization system:', error);
  }
}

main();
