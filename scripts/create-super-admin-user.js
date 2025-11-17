#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });

const USER_POOL_ID = 'us-east-2_hVzMW4EYB';
const SUPER_ADMIN_EMAIL = 'admin@athleon.fitness';
const TEMP_PASSWORD = 'TempPass123!';
const PERMANENT_PASSWORD = 'SuperAdmin123!';

async function createSuperAdmin() {
  console.log('👑 Creating super admin user...\n');

  try {
    // Create user
    console.log(`📧 Creating user: ${SUPER_ADMIN_EMAIL}`);
    await client.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: SUPER_ADMIN_EMAIL,
      UserAttributes: [
        { Name: 'email', Value: SUPER_ADMIN_EMAIL },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:role', Value: 'super_admin' }
      ],
      TemporaryPassword: TEMP_PASSWORD,
      MessageAction: 'SUPPRESS' // Don't send welcome email
    }));

    // Set permanent password
    console.log('🔑 Setting permanent password...');
    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: SUPER_ADMIN_EMAIL,
      Password: PERMANENT_PASSWORD,
      Permanent: true
    }));

    console.log('\n✨ Super admin created successfully!');
    console.log(`📧 Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${PERMANENT_PASSWORD}`);
    console.log('🌐 Login at: https://dbtrhlzryzh8h.cloudfront.net');

  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log('⚠️  Super admin user already exists');
    } else {
      console.error('❌ Error creating super admin:', error.message);
      process.exit(1);
    }
  }
}

createSuperAdmin();
