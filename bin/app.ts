#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AthleonStack } from '../infrastructure/main-stack';
import { EnvironmentConfigLoader } from '../infrastructure/config/environment-config';

const app = new cdk.App();

// Get environment from context or environment variable
const environment = app.node.tryGetContext('environment') || 
                   process.env.ENVIRONMENT || 
                   'development';

console.log(`🚀 Deploying to environment: ${environment}`);

// Load environment-specific configuration
const config = EnvironmentConfigLoader.load(environment);

// Validate we're deploying to the correct account
const currentAccount = process.env.CDK_DEFAULT_ACCOUNT;
if (currentAccount && currentAccount !== config.account) {
  console.error(`❌ Account mismatch!`);
  console.error(`   Current account: ${currentAccount}`);
  console.error(`   Expected account: ${config.account}`);
  console.error(`   Environment: ${environment}`);
  process.exit(1);
}

new AthleonStack(app, `Athleon-${environment}`, {
  stage: environment,
  config,
  //env: {
   // account: config.account,
    //region: config.region,
 // },
  tags: {
    Environment: environment,
    Project: 'Athleon',
    ManagedBy: 'CDK',
  },
});
