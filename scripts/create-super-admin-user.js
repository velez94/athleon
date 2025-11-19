#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const SUPER_ADMIN_EMAIL = 'admin@athleon.fitness';

/**
 * Creates a super admin user in Cognito with the specified configuration.
 * 
 * @param {Object} config - Configuration object
 * @param {CognitoIdentityProviderClient} config.cognitoClient - Cognito client instance
 * @param {string} config.userPoolId - Cognito User Pool ID
 * @param {string} config.email - Super admin email (defaults to admin@athleon.fitness)
 * @param {string} config.password - Permanent password for the super admin
 * @param {boolean} config.forcePasswordChange - Whether to force password change on first login
 * @param {boolean} config.suppressOutput - Whether to suppress console output
 * @returns {Promise<Object>} Result object with success status and user details
 * 
 * Feature: cognito-role-based-onboarding
 * Validates: Requirements 2.2, 2.3, 2.5
 */
async function createSuperAdmin(config) {
  const {
    cognitoClient,
    userPoolId,
    email = SUPER_ADMIN_EMAIL,
    password,
    forcePasswordChange = false,
    suppressOutput = false
  } = config;

  const log = suppressOutput ? () => {} : console.log;
  const logError = suppressOutput ? () => {} : console.error;

  // Validate email matches required super admin email
  if (email !== SUPER_ADMIN_EMAIL) {
    throw new Error(`Super admin email must be ${SUPER_ADMIN_EMAIL}, got ${email}`);
  }

  log('👑 Creating super admin user...\n');

  try {
    // Create user with super_admin role
    log(`📧 Creating user: ${email}`);
    const createResult = await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:role', Value: 'super_admin' }
      ],
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS' // Don't send welcome email
    }));

    // Set permanent password if not forcing password change
    if (!forcePasswordChange) {
      log('🔑 Setting permanent password...');
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true
      }));
    }

    // Verify the user was created with correct attributes
    const getUserResult = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email
    }));

    const roleAttr = getUserResult.UserAttributes.find(attr => attr.Name === 'custom:role');
    const emailAttr = getUserResult.UserAttributes.find(attr => attr.Name === 'email');

    log('\n✨ Super admin created successfully!');
    log(`📧 Email: ${email}`);
    log(`🔑 Password: ${password}`);
    log(`🔄 Force password change: ${forcePasswordChange}`);

    return {
      success: true,
      email: emailAttr?.Value,
      role: roleAttr?.Value,
      forcePasswordChange,
      username: getUserResult.Username
    };

  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      log('⚠️  Super admin user already exists');
      
      // Verify existing user has correct role
      try {
        const getUserResult = await cognitoClient.send(new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: email
        }));

        const roleAttr = getUserResult.UserAttributes.find(attr => attr.Name === 'custom:role');
        const emailAttr = getUserResult.UserAttributes.find(attr => attr.Name === 'email');

        return {
          success: true,
          alreadyExists: true,
          email: emailAttr?.Value,
          role: roleAttr?.Value,
          username: getUserResult.Username
        };
      } catch (getError) {
        logError('❌ Error verifying existing super admin:', getError.message);
        throw getError;
      }
    } else {
      logError('❌ Error creating super admin:', error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });
  const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-2_hVzMW4EYB';
  const PERMANENT_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

  createSuperAdmin({
    cognitoClient: client,
    userPoolId: USER_POOL_ID,
    email: SUPER_ADMIN_EMAIL,
    password: PERMANENT_PASSWORD,
    forcePasswordChange: false,
    suppressOutput: false
  }).then(() => {
    console.log('🌐 Login at: https://dbtrhlzryzh8h.cloudfront.net');
    process.exit(0);
  }).catch((error) => {
    console.error('Failed to create super admin:', error);
    process.exit(1);
  });
}

module.exports = { createSuperAdmin, SUPER_ADMIN_EMAIL };
