#!/usr/bin/env node

const { CloudFormationClient, DescribeStackResourcesCommand } = require('@aws-sdk/client-cloudformation');

const client = new CloudFormationClient({ region: 'us-east-2' });

async function getTableNames() {
  try {
    const response = await client.send(new DescribeStackResourcesCommand({
      StackName: 'Athleon-development'
    }));

    const tables = {};
    
    response.StackResources
      .filter(resource => resource.ResourceType === 'AWS::DynamoDB::Table')
      .forEach(resource => {
        const logicalId = resource.LogicalResourceId;
        const physicalId = resource.PhysicalResourceId;
        
        if (logicalId.includes('Organizations') && logicalId.includes('OrganizationsTable')) {
          tables.ORGANIZATIONS = physicalId;
        } else if (logicalId.includes('OrganizationMembers')) {
          tables.ORGANIZATION_MEMBERS = physicalId;
        } else if (logicalId.includes('OrganizationEvents')) {
          tables.ORGANIZATION_EVENTS = physicalId;
        } else if (logicalId.includes('Events') && logicalId.includes('EventsTable')) {
          tables.EVENTS = physicalId;
        } else if (logicalId.includes('Athletes') && logicalId.includes('AthletesTable')) {
          tables.ATHLETES = physicalId;
        } else if (logicalId.includes('Categories')) {
          tables.CATEGORIES = physicalId;
        } else if (logicalId.includes('Wods') && logicalId.includes('WodsTable')) {
          tables.WODS = physicalId;
        } else if (logicalId.includes('ExerciseLibrary')) {
          tables.EXERCISES = physicalId;
        } else if (logicalId.includes('Roles')) {
          tables.ROLES = physicalId;
        } else if (logicalId.includes('Permissions')) {
          tables.PERMISSIONS = physicalId;
        } else if (logicalId.includes('UserRoles')) {
          tables.USER_ROLES = physicalId;
        }
      });

    // Get Cognito User Pool ID from stack outputs
    const { CloudFormationClient: CFClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
    const cfClient = new CFClient({ region: 'us-east-2' });
    
    const stackResponse = await cfClient.send(new DescribeStacksCommand({
      StackName: 'Athleon-development'
    }));
    
    const userPoolOutput = stackResponse.Stacks[0].Outputs.find(output => 
      output.OutputKey === 'UserPoolId'
    );
    
    if (userPoolOutput) {
      tables.USER_POOL_ID = userPoolOutput.OutputValue;
    }

    return tables;
  } catch (error) {
    console.error('Error getting table names:', error.message);
    process.exit(1);
  }
}

module.exports = { getTableNames };

// If run directly, output the table names
if (require.main === module) {
  getTableNames().then(tables => {
    console.log(JSON.stringify(tables, null, 2));
  });
}
