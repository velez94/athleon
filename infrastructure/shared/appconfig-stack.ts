import * as cdk from 'aws-cdk-lib';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';

export interface AppConfigStackProps extends cdk.StackProps {
  stage: string;
}

export class AppConfigStack extends cdk.Stack {
  public readonly application: appconfig.Application;
  public readonly appConfigEnvironment: appconfig.Environment;
  public readonly deploymentStrategy: appconfig.CfnDeploymentStrategy;

  constructor(scope: Construct, id: string, props: AppConfigStackProps) {
    super(scope, id, props);

    // AppConfig Application
    this.application = new appconfig.Application(this, 'AthleonApp', {
      applicationName: `athleon-${props.stage}`,
      description: `Athleon feature flags for ${props.stage}`,
    });

    // Environment
    this.appConfigEnvironment = new appconfig.Environment(this, 'Environment', {
      application: this.application,
      environmentName: props.stage,
      description: `${props.stage} environment`,
    });

    // Deployment Strategy using CfnDeploymentStrategy
    this.deploymentStrategy = new appconfig.CfnDeploymentStrategy(this, 'Strategy', {
      name: `athleon-${props.stage}-strategy`,
      description: 'Gradual deployment with monitoring',
      deploymentDurationInMinutes: props.stage === 'production' ? 10 : 2,
      finalBakeTimeInMinutes: props.stage === 'production' ? 5 : 1,
      growthFactor: 50,
      growthType: 'LINEAR',
      replicateTo: 'NONE',
    });

    // Create initial configuration using CfnHostedConfigurationVersion
    const initialConfig = {
      flags: {
        newScoringSystem: { enabled: props.stage === 'development' },
        advancedScheduler: { enabled: props.stage === 'development' },
        realTimeLeaderboard: { enabled: true },
        betaFeatures: { enabled: props.stage === 'development' },
        organizationAnalytics: { enabled: props.stage !== 'production' },
        mobileApp: { enabled: false }
      },
      values: {
        maxConcurrentUsers: { value: props.stage === 'production' ? 10000 : props.stage === 'staging' ? 500 : 1000 },
        scoringTimeout: { value: props.stage === 'production' ? 120 : props.stage === 'staging' ? 60 : 30 },
        leaderboardRefreshInterval: { value: props.stage === 'production' ? 30 : props.stage === 'staging' ? 10 : 5 }
      },
      version: '1'
    };

    // Configuration Profile using CfnConfigurationProfile
    const configProfile = new appconfig.CfnConfigurationProfile(this, 'FeatureFlags', {
      applicationId: this.application.applicationId,
      name: 'feature-flags',
      description: 'Feature flags configuration',
      locationUri: 'hosted',
      type: 'AWS.AppConfig.FeatureFlags',
    });

    // Initial configuration version
    new appconfig.CfnHostedConfigurationVersion(this, 'InitialConfig', {
      applicationId: this.application.applicationId,
      configurationProfileId: configProfile.ref,
      content: JSON.stringify(initialConfig),
      contentType: 'application/json',
      description: 'Initial feature flags configuration',
    });

    // Outputs
    new cdk.CfnOutput(this, 'AppConfigApplicationId', {
      value: this.application.applicationId,
      exportName: `AthleonAppConfig-ApplicationId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'AppConfigEnvironmentId', {
      value: this.appConfigEnvironment.environmentId,
      exportName: `AthleonAppConfig-EnvironmentId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'AppConfigConfigProfileId', {
      value: configProfile.ref,
      exportName: `AthleonAppConfig-ConfigProfileId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'AppConfigDeploymentStrategyId', {
      value: this.deploymentStrategy.ref,
      exportName: `AthleonAppConfig-DeploymentStrategyId-${props.stage}`,
    });
  }
}
