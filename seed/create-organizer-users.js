#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });

const USER_POOL_ID = 'us-east-2_Wsuyp4eVw';
const PASSWORD = 'SuperAdmin123!';

const organizers = [
  'admin@athleon.fitness',
  'organizer1@test.com',
  'organizer2@test.com',
  'athlete1@test.com'
];

async function createOrganizers() {
  console.log('👥 Creating organizer test users...\n');

  for (const email of organizers) {
    try {
      console.log(`📧 Creating user: ${email}`);
      
      await client.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' }
        ],
        TemporaryPassword: 'TempPass123!',
        MessageAction: 'SUPPRESS'
      }));

      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: PASSWORD,
        Permanent: true
      }));

      console.log(`✅ Created: ${email}`);

    } catch (error) {
      if (error.name === 'UsernameExistsException') {
        console.log(`⚠️  User already exists: ${email}`);
      } else {
        console.error(`❌ Error creating ${email}:`, error.message);
      }
    }
  }

  console.log('\n✨ Organizer users ready!');
  console.log(`🔑 Password for all: ${PASSWORD}`);
}

createOrganizers();
