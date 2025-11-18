#!/usr/bin/env node

const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const fs = require('fs');
const path = require('path');

const client = new CloudFormationClient({ region: 'us-east-2' });

async function generateConfig() {
  try {
    const { Stacks } = await client.send(new DescribeStacksCommand({
      StackName: 'Athleon-development'
    }));

    const outputs = Stacks[0].Outputs.reduce((acc, output) => {
      acc[output.OutputKey] = output.OutputValue;
      return acc;
    }, {});

    const config = {
      region: 'us-east-2',
      apiUrl: outputs.NetworkApiEndpoint5F7D2C04,
      userPoolId: outputs.UserPoolId,
      userPoolClientId: outputs.UserPoolClientId
    };

    const configPath = path.join(__dirname, '../frontend/src/aws-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('✅ Frontend configuration generated:');
    console.log(JSON.stringify(config, null, 2));

  } catch (error) {
    console.error('❌ Error generating config:', error.message);
  }
}

generateConfig();
