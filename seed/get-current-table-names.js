#!/usr/bin/env node

const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { CognitoIdentityProviderClient, ListUserPoolsCommand } = require('@aws-sdk/client-cognito-identity-provider');

const ddbClient = new DynamoDBClient({ region: 'us-east-2' });
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-2' });

async function getCurrentTableNames() {
  try {
    // Get DynamoDB tables
    const { TableNames } = await ddbClient.send(new ListTablesCommand({}));
    const athleonTables = TableNames.filter(name => name.includes('Athleon-development'));
    
    // Get Cognito User Pool
    const { UserPools } = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 10 }));
    const userPool = UserPools.find(pool => pool.Name === 'athleon-development');
    
    const tableMap = {};
    
    // Map table names
    athleonTables.forEach(tableName => {
      if (tableName.includes('OrganizationsTable')) tableMap.ORGANIZATIONS = tableName;
      else if (tableName.includes('OrganizationMembersTable')) tableMap.ORGANIZATION_MEMBERS = tableName;
      else if (tableName.includes('OrganizationEventsTable')) tableMap.ORGANIZATION_EVENTS = tableName;
      else if (tableName.includes('EventsTable')) tableMap.EVENTS = tableName;
      else if (tableName.includes('AthletesTable') && !tableName.includes('AthleteEvents')) tableMap.ATHLETES = tableName;
      else if (tableName.includes('CategoriesTable')) tableMap.CATEGORIES = tableName;
      else if (tableName.includes('WodsTable')) tableMap.WODS = tableName;
      else if (tableName.includes('ExerciseLibraryTable')) tableMap.EXERCISES = tableName;
      else if (tableName.includes('ScoresTable')) tableMap.SCORES = tableName;
      else if (tableName.includes('RolesTable')) tableMap.ROLES = tableName;
      else if (tableName.includes('PermissionsTable')) tableMap.PERMISSIONS = tableName;
      else if (tableName.includes('UserRolesTable')) tableMap.USER_ROLES = tableName;
    });
    
    console.log('// Current table names for seed scripts');
    console.log('const TABLES = {');
    Object.entries(tableMap).forEach(([key, value]) => {
      console.log(`  ${key}: '${value}',`);
    });
    console.log('};');
    console.log('');
    console.log(`const USER_POOL_ID = '${userPool?.Id}';`);
    
  } catch (error) {
    console.error('Error getting table names:', error.message);
  }
}

getCurrentTableNames();
