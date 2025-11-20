#!/usr/bin/env node

const { CloudFormationClient, DescribeStackResourcesCommand } = require('@aws-sdk/client-cloudformation');

const STACK_NAME = 'Athleon-development';
const REGION = 'us-east-2';

async function getTableNames() {
  console.log(`Getting table names from CloudFormation stack: ${STACK_NAME}`);

  const client = new CloudFormationClient({ region: REGION });
  
  try {
    const command = new DescribeStackResourcesCommand({ StackName: STACK_NAME });
    const response = await client.send(command);
    
    const tables = response.StackResources
      .filter(r => r.ResourceType === 'AWS::DynamoDB::Table')
      .reduce((acc, resource) => {
        const logical = resource.LogicalResourceId;
        const physical = resource.PhysicalResourceId;
        
        if (logical.includes('OrganizationsOrganizationsTable')) {
          acc.ORGANIZATIONS_TABLE = physical;
        } else if (logical.includes('OrganizationMembersTable')) {
          acc.ORGANIZATION_MEMBERS_TABLE = physical;
        } else if (logical.includes('OrganizationEventsTable')) {
          acc.ORGANIZATION_EVENTS_TABLE = physical;
        } else if (logical.includes('CompetitionsEventsTable')) {
          acc.EVENTS_TABLE = physical;
        } else if (logical.includes('AthletesAthletesTable')) {
          acc.ATHLETES_TABLE = physical;
        } else if (logical.includes('AthleteEventsTable')) {
          acc.ATHLETE_EVENTS_TABLE = physical;
        } else if (logical.includes('CategoriesTable')) {
          acc.CATEGORIES_TABLE = physical;
        } else if (logical.includes('WodsTable')) {
          acc.WODS_TABLE = physical;
        } else if (logical.includes('ExerciseLibraryTable')) {
          acc.EXERCISES_TABLE = physical;
        } else if (logical.includes('ScoresTable')) {
          acc.SCORES_TABLE = physical;
        }
        
        return acc;
      }, {});
    
    // Get User Pool ID
    const userPool = response.StackResources.find(r => 
      r.ResourceType === 'AWS::Cognito::UserPool'
    );
    if (userPool) {
      tables.USER_POOL_ID = userPool.PhysicalResourceId;
    }
    
    // Print and return
    Object.entries(tables).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
      process.env[key] = value;
    });
    
    return tables;
  } catch (error) {
    console.error('Error fetching table names:', error.message);
    process.exit(1);
  }
}

// If run directly, execute and export
if (require.main === module) {
  getTableNames().then(tables => {
    // Export as shell variables for sourcing
    console.log('\n# To use in shell, run:');
    console.log('# eval $(node get-table-names.js)');
  });
}

module.exports = { getTableNames };
