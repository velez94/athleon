#!/usr/bin/env node

/**
 * Athleon - Cleanup Seed Data Script
 * 
 * Removes all seed data from DynamoDB tables and Cognito users.
 * Use this to reset the platform to a clean state.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const ddbClient = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-2' });

const USER_POOL_ID = 'us-east-2_0m42KBG3O';

// Table names (same as seed scripts)
const TABLES = {
  ORGANIZATIONS: 'Athleon-OrganizationsOrganizationsTableECC8F9CE-3MTY5XXIRLV0',
  ORGANIZATION_MEMBERS: 'Athleon-OrganizationsOrganizationMembersTable46313781-14LJLNYLY8PEZ',
  ORGANIZATION_EVENTS: 'Athleon-OrganizationsOrganizationEventsTable7597D5EB-KQ606XH74LLD',
  EVENTS: 'Athleon-CompetitionsEventsTable5FF68F4B-19W3OK2X2HX7D',
  ATHLETES: 'Athleon-AthletesAthletesTable83BA454D-1N1IH76W4RQ9P',
  CATEGORIES: 'Athleon-CategoriesCategoriesTable6441F570-U0RM4NSYM5YO',
  WODS: 'Athleon-WodsWodsTableC84CB78B-7UBMQVHUZ6WR',
  EXERCISES: 'Athleon-ScoringExerciseLibraryTable4BA87342-19F9WI8DI32SD',
  SCORES: 'Athleon-ScoringScoresTable8B8F0B91-1VXQVQXQVQXQV',
  SCHEDULES: 'Athleon-SchedulingSchedulesTable123456-ABCDEFGHIJK'
};

async function cleanupTable(tableName, description) {
  try {
    console.log(`🗑️  Cleaning ${description}...`);
    
    const { Items } = await ddb.send(new ScanCommand({
      TableName: tableName
    }));

    if (!Items || Items.length === 0) {
      console.log(`   ✓ ${description} already empty`);
      return;
    }

    for (const item of Items) {
      // Get primary key attributes
      const keys = {};
      if (item.organizationId) keys.organizationId = item.organizationId;
      if (item.eventId) keys.eventId = item.eventId;
      if (item.userId) keys.userId = item.userId;
      if (item.categoryId) keys.categoryId = item.categoryId;
      if (item.wodId) keys.wodId = item.wodId;
      if (item.exerciseId) keys.exerciseId = item.exerciseId;
      if (item.scoreId) keys.scoreId = item.scoreId;
      if (item.scheduleId) keys.scheduleId = item.scheduleId;

      await ddb.send(new DeleteCommand({
        TableName: tableName,
        Key: keys
      }));
    }

    console.log(`   ✓ Deleted ${Items.length} items from ${description}`);
  } catch (error) {
    console.log(`   ⚠️  ${description}: ${error.message}`);
  }
}

async function cleanupCognitoUsers() {
  try {
    console.log('👥 Cleaning Cognito users...');
    
    const { Users } = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    }));

    const seedUsers = Users.filter(user => {
      const email = user.Attributes.find(attr => attr.Name === 'email')?.Value;
      return email && (
        email.includes('@test.com') || 
        email === 'admin@athleon.fitness'
      );
    });

    for (const user of seedUsers) {
      const email = user.Attributes.find(attr => attr.Name === 'email')?.Value;
      
      await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.Username
      }));
      
      console.log(`   ✓ Deleted user: ${email}`);
    }

    console.log(`   ✓ Deleted ${seedUsers.length} seed users`);
  } catch (error) {
    console.log(`   ⚠️  Cognito cleanup: ${error.message}`);
  }
}

async function cleanup() {
  console.log('🧹 Athleon - Cleanup Seed Data');
  console.log('===============================\n');

  // Cleanup in reverse dependency order
  await cleanupTable(TABLES.SCORES, 'Scores');
  await cleanupTable(TABLES.SCHEDULES, 'Schedules');
  await cleanupTable(TABLES.ORGANIZATION_EVENTS, 'Organization Events');
  await cleanupTable(TABLES.ORGANIZATION_MEMBERS, 'Organization Members');
  await cleanupTable(TABLES.ATHLETES, 'Athletes');
  await cleanupTable(TABLES.WODS, 'WODs');
  await cleanupTable(TABLES.EXERCISES, 'Exercises');
  await cleanupTable(TABLES.CATEGORIES, 'Categories');
  await cleanupTable(TABLES.EVENTS, 'Events');
  await cleanupTable(TABLES.ORGANIZATIONS, 'Organizations');
  
  await cleanupCognitoUsers();

  console.log('\n✨ Cleanup completed!');
  console.log('🌱 Ready for fresh seed data');
}

cleanup().catch(console.error);
