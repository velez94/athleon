#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment variables
const TABLES = {
  ROLES: process.env.ROLES_TABLE,
  PERMISSIONS: process.env.PERMISSIONS_TABLE,
  USER_ROLES: process.env.USER_ROLES_TABLE
};

async function seedRoles() {
  if (!TABLES.ROLES) {
    console.log('❌ Roles table not found. Skipping RBAC setup.');
    return;
  }

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

  console.log('🔐 Creating roles...');
  for (const role of roles) {
    await ddb.send(new PutCommand({
      TableName: TABLES.ROLES,
      Item: role
    }));
  }
  console.log('✅ Created 5 roles');
}

async function seedPermissions() {
  if (!TABLES.PERMISSIONS) {
    console.log('❌ Permissions table not found. Skipping permissions setup.');
    return;
  }

  // Permissions are organized by roleId and resource (composite key)
  const permissions = [
    // Super Admin permissions
    { roleId: 'super_admin', resource: 'organizations', action: 'manage', name: 'Manage All Organizations' },
    { roleId: 'super_admin', resource: 'events', action: 'manage', name: 'Manage All Events' },
    { roleId: 'super_admin', resource: 'users', action: 'manage', name: 'Manage All Users' },
    
    // Organization Owner permissions
    { roleId: 'org_owner', resource: 'organizations', action: 'manage', name: 'Manage Organization' },
    { roleId: 'org_owner', resource: 'events', action: 'manage', name: 'Manage Events' },
    { roleId: 'org_owner', resource: 'members', action: 'manage', name: 'Manage Members' },
    
    // Organization Admin permissions
    { roleId: 'org_admin', resource: 'events', action: 'manage', name: 'Manage Events' },
    { roleId: 'org_admin', resource: 'members', action: 'manage', name: 'Manage Members' },
    
    // Organization Member permissions
    { roleId: 'org_member', resource: 'events', action: 'create', name: 'Create Events' },
    
    // Athlete permissions
    { roleId: 'athlete', resource: 'events', action: 'register', name: 'Register for Events' },
    { roleId: 'athlete', resource: 'scores', action: 'create', name: 'Submit Scores' }
  ];

  console.log('🔑 Creating permissions...');
  for (const permission of permissions) {
    await ddb.send(new PutCommand({
      TableName: TABLES.PERMISSIONS,
      Item: permission
    }));
  }
  console.log('✅ Created 11 permissions');
}

async function seedUserRoles() {
  if (!TABLES.USER_ROLES) {
    console.log('❌ User roles table not found. Skipping user role assignments.');
    return;
  }

  const userRoles = [
    { userId: 'admin@athleon.fitness', contextId: 'global', roleId: 'super_admin' },
    { userId: 'organizer1@test.com', contextId: 'global', roleId: 'org_owner' },
    { userId: 'organizer2@test.com', contextId: 'global', roleId: 'org_owner' },
    { userId: 'athlete1@test.com', contextId: 'global', roleId: 'athlete' }
  ];

  console.log('👥 Assigning user roles...');
  for (const userRole of userRoles) {
    await ddb.send(new PutCommand({
      TableName: TABLES.USER_ROLES,
      Item: userRole
    }));
  }
  console.log('✅ Assigned roles to 4 users');
}

async function seedAuthorization() {
  console.log('🔐 Seeding authorization system...\n');

  try {
    await seedRoles();
    await seedPermissions();
    await seedUserRoles();

    console.log('\n✨ Authorization system created successfully!');
  } catch (error) {
    console.error('❌ Error seeding authorization:', error.message);
    process.exit(1);
  }
}

seedAuthorization();
