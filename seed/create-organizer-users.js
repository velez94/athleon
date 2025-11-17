#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });

const USER_POOL_ID = 'us-east-2_hVzMW4EYB';
const PASSWORD = 'SuperAdmin123!';

const organizers = [
  { email: 'admin@athleon.fitness', role: 'super_admin' },
  { email: 'organizer1@test.com', role: 'organizer' },
  { email: 'organizer2@test.com', role: 'organizer' },
  { email: 'athlete1@test.com', role: 'athlete' }
];

async function createOrganizers() {
  console.log('👥 Creating organizer test users...\n');

  for (const user of organizers) {
    try {
      console.log(`📧 Creating user: ${user.email}`);
      
      await client.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        UserAttributes: [
          { Name: 'email', Value: user.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: user.role }
        ],
        TemporaryPassword: 'TempPass123!',
        MessageAction: 'SUPPRESS'
      }));

      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        Password: PASSWORD,
        Permanent: true
      }));

      console.log(`✅ Created: ${user.email} (${user.role})`);

    } catch (error) {
      if (error.name === 'UsernameExistsException') {
        console.log(`⚠️  User already exists: ${user.email}`);
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      }
    }
  }

  console.log('\n✨ Organizer users ready!');
  console.log(`🔑 Password for all: ${PASSWORD}`);
}

createOrganizers();
