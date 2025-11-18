#!/usr/bin/env node

const { 
  CognitoIdentityProviderClient, 
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand 
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });

const USER_POOL_ID = 'us-east-2_hVzMW4EYB';
const SUPER_ADMIN_EMAIL = 'admin@athleon.fitness';

async function verifyAdminUser() {
  console.log('🔍 Verifying super admin user attributes...\n');

  try {
    // Get user details
    console.log(`📧 Fetching user: ${SUPER_ADMIN_EMAIL}`);
    const getUserResponse = await client.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: SUPER_ADMIN_EMAIL
    }));

    console.log('\n✅ User found!');
    console.log('📋 Current attributes:');
    
    const attributes = {};
    getUserResponse.UserAttributes.forEach(attr => {
      attributes[attr.Name] = attr.Value;
      console.log(`   ${attr.Name}: ${attr.Value}`);
    });

    // Check if custom:role is set correctly
    const currentRole = attributes['custom:role'];
    
    if (currentRole !== 'super_admin') {
      console.log('\n⚠️  custom:role is not set to "super_admin"');
      console.log(`   Current value: ${currentRole || '(not set)'}`);
      console.log('\n🔧 Updating custom:role to "super_admin"...');
      
      await client.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: SUPER_ADMIN_EMAIL,
        UserAttributes: [
          { Name: 'custom:role', Value: 'super_admin' }
        ]
      }));
      
      console.log('✅ Updated custom:role to "super_admin"');
    } else {
      console.log('\n✅ custom:role is correctly set to "super_admin"');
    }

    // Verify email is set
    if (!attributes['email']) {
      console.log('\n⚠️  Email attribute is missing');
      console.log('🔧 Setting email attribute...');
      
      await client.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: SUPER_ADMIN_EMAIL,
        UserAttributes: [
          { Name: 'email', Value: SUPER_ADMIN_EMAIL },
          { Name: 'email_verified', Value: 'true' }
        ]
      }));
      
      console.log('✅ Email attribute set');
    }

    console.log('\n✨ Verification complete!');
    console.log('🌐 You can now login at: https://dbtrhlzryzh8h.cloudfront.net');
    console.log(`📧 Email: ${SUPER_ADMIN_EMAIL}`);
    console.log('🔑 Password: SuperAdmin123!');

  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.log('❌ Super admin user not found');
      console.log('💡 Run: node scripts/create-super-admin-user.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

verifyAdminUser();
