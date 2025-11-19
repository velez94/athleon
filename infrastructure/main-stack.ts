import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import { SharedStack } from './shared/shared-stack';
import { NetworkStack } from './shared/network-stack';
import { AppConfigStack } from './shared/appconfig-stack';
import { EventRouting } from './shared/event-routing';
import { AnalyticsStack } from './analytics/analytics-stack';
import { OrganizationsStack } from './organizations/organizations-stack';
import { CompetitionsStack } from './competitions/competitions-stack';
import { AthletesStack } from './athletes/athletes-stack';
import { ScoringStack } from './scoring/scoring-stack';
import { SchedulingStack } from './scheduling/scheduling-stack';
import { CategoriesStack } from './categories/categories-stack';
import { WodsStack } from './wods/wods-stack';
import { AuthorizationStack } from './authorization/authorization-stack';
import { FrontendStack } from './frontend/frontend-stack';

import { EnvironmentConfig } from './config/environment-config';

export interface AthleonStackProps extends cdk.StackProps {
  stage: string;
  config: EnvironmentConfig;
}

export class AthleonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AthleonStackProps) {
    super(scope, id, {
      ...props,
      crossRegionReferences: true,
    });

    // 1. Shared Infrastructure
    const sharedStack = new SharedStack(this, 'Shared', { 
      stage: props.stage,
      config: props.config 
    });

    // 1.5. AppConfig for Feature Flags
    const appConfigApplication = new appconfig.Application(this, 'AthleonApp', {
      applicationName: `athleon-${props.stage}`,
      description: `Athleon feature flags for ${props.stage}`,
    });

    const appConfigEnvironment = new appconfig.Environment(this, 'AppConfigEnvironment', {
      application: appConfigApplication,
      environmentName: props.stage,
      description: `${props.stage} environment`,
    });

    const deploymentStrategy = new appconfig.CfnDeploymentStrategy(this, 'DeploymentStrategy', {
      name: `athleon-${props.stage}-strategy`,
      description: 'Gradual deployment with monitoring',
      deploymentDurationInMinutes: props.stage === 'production' ? 10 : 2,
      finalBakeTimeInMinutes: props.stage === 'production' ? 5 : 1,
      growthFactor: 50,
      growthType: 'LINEAR',
      replicateTo: 'NONE',
    });

    const configProfile = new appconfig.CfnConfigurationProfile(this, 'FeatureFlags', {
      applicationId: appConfigApplication.applicationId,
      name: 'feature-flags',
      description: 'Feature flags configuration',
      locationUri: 'hosted',
      type: 'AWS.AppConfig.FeatureFlags',
    });

    // 7. Frontend Stack (create first to get certificate)
    const frontendStack = new FrontendStack(this, 'Frontend', {
      stage: props.stage,
      domain: props.config.frontend.customDomain ? props.config.domain : undefined,
      enableWaf: props.config.frontend?.waf?.enabled,
      rateLimiting: props.config.frontend?.waf?.rateLimiting,
      eventImagesBucket: sharedStack.eventImagesBucket,
    });

    // 2. Network Infrastructure (use certificate from frontend)
    const networkStack = new NetworkStack(this, 'Network', {
      stage: props.stage,
      userPool: sharedStack.userPool,
      certificate: props.config.frontend.customDomain ? frontendStack.apiCertificate : undefined,
      apiDomain: props.config.frontend.customDomain ? `api.${props.config.domain}` : undefined,
      hostedZone: props.config.frontend.customDomain ? frontendStack.hostedZone : undefined,
    });

    // 3. Organizations (RBAC foundation)
    const organizationsStack = new OrganizationsStack(this, 'Organizations', {
      stage: props.stage,
      eventBus: sharedStack.eventBus,
      sharedLayer: sharedStack.sharedLayer,
      appConfigApplicationId: appConfigApplication.applicationId,
      appConfigEnvironmentId: appConfigEnvironment.environmentId,
      appConfigConfigProfileId: configProfile.ref,
    });

    // Wire Organizations API routes
    const organizations = networkStack.api.root.addResource('organizations');
    organizations.addMethod('ANY', new apigateway.LambdaIntegration(organizationsStack.organizationsLambda), {
      authorizer: networkStack.authorizer,
    });
    const organizationsProxy = organizations.addResource('{proxy+}');
    organizationsProxy.addMethod('ANY', new apigateway.LambdaIntegration(organizationsStack.organizationsLambda), {
      authorizer: networkStack.authorizer,
    });

    // 4. Domain Stacks
    const scoringStack = new ScoringStack(this, 'Scoring', {
      stage: props.stage,
      eventBus: sharedStack.eventBus,
      sharedLayer: sharedStack.sharedLayer,
    });

    const categoriesStack = new CategoriesStack(this, 'Categories', {
      stage: props.stage,
      config: props.config,
      eventBus: sharedStack.eventBus,
      sharedLayer: sharedStack.sharedLayer,
      organizationEventsTable: organizationsStack.organizationEventsTable,
      organizationMembersTable: organizationsStack.organizationMembersTable,
    });

    const wodsStack = new WodsStack(this, 'Wods', {
      stage: props.stage,
      config: props.config,
      eventBus: sharedStack.eventBus,
      sharedLayer: sharedStack.sharedLayer,
      organizationEventsTable: organizationsStack.organizationEventsTable,
      organizationMembersTable: organizationsStack.organizationMembersTable,
      scoresTable: scoringStack.scoresTable,
      scoringSystemsTable: scoringStack.scoringSystemsTable,  // Cross-context read for validation
    });
    
    // Configure cross-context read permissions (DDD pattern: read-only access)
    // Scoring context reads WOD time cap for score validation
    wodsStack.wodsTable.grantReadData(scoringStack.scoresLambda);
    scoringStack.scoresLambda.addEnvironment('WODS_TABLE', wodsStack.wodsTable.tableName);

    const athletesStack = new AthletesStack(this, 'Athletes', {
      stage: props.stage,
      eventBus: sharedStack.eventBus,
    });

    const competitionsStack = new CompetitionsStack(this, 'Competitions', {
      stage: props.stage,
      eventBus: sharedStack.eventBus,
      sharedLayer: sharedStack.sharedLayer.layer,
      eventImagesBucket: sharedStack.eventImagesBucket,
      organizationEventsTable: organizationsStack.organizationEventsTable,
      organizationMembersTable: organizationsStack.organizationMembersTable,
      scoringSystemsTable: scoringStack.scoringSystemsTable,
      categoriesTable: categoriesStack.categoriesTable,
      wodsTable: wodsStack.wodsTable,
      athleteEventsTable: athletesStack.athleteEventsTable,
      cloudfrontDomain: `https://${props.config.domain || frontendStack.distribution.distributionDomainName}`,
      lambdaEnvironment: props.config.lambda.environment,
    });

    const schedulingStack = new SchedulingStack(this, 'Scheduling', {
      stage: props.stage,
      eventBus: sharedStack.eventBus,
      sharedLayer: sharedStack.sharedLayer.layer,
    });

    // Analytics Domain (event-driven)
    const analyticsStack = new AnalyticsStack(this, 'Analytics', {
      stage: props.stage,
      api: networkStack.api,
      authorizer: networkStack.authorizer,
      sharedLayer: sharedStack.sharedLayer.layer,
      eventBus: sharedStack.eventBus,
      organizationMembersTable: organizationsStack.organizationMembersTable,
      envConfig: props.config,
    });

    const authorizationStack = new AuthorizationStack(this, 'Authorization', {
      stage: props.stage,
      eventBus: sharedStack.eventBus,
    });

    // 5. API Routing (wire Lambdas to API Gateway)

    // Competitions - DDD Handler
    const competitions = networkStack.api.root.addResource('competitions');
    competitions.addMethod('ANY', new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda), {
      authorizer: networkStack.authorizer,
    });
    competitions.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda), 
      { authorizer: networkStack.authorizer }
    );

    // Competitions V2 - DDD Handler (parallel deployment for migration)
    const competitionsV2 = networkStack.api.root.addResource('competitions-v2');
    competitionsV2.addMethod('ANY', new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda), {
      authorizer: networkStack.authorizer,
    });
    competitionsV2.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda), 
      { authorizer: networkStack.authorizer }
    );

    // Events (alias for competitions for backward compatibility)
    const events = networkStack.api.root.addResource('events');
    events.addMethod('ANY', new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda), {
      authorizer: networkStack.authorizer,
    });
    events.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda), 
      { authorizer: networkStack.authorizer }
    );

    // Public events
    const publicRoot = networkStack.api.root.addResource('public');
    const publicEvents = publicRoot.addResource('events');
    publicEvents.addMethod('GET', new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda));
    publicEvents.addResource('{proxy+}').addMethod('GET', 
      new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda)
    );

    // Public Exercises
    const publicExercises = publicRoot.addResource('exercises');
    publicExercises.addMethod('GET', new apigateway.LambdaIntegration(scoringStack.exercisesLambda));

    // Public Categories (CORS-friendly)
    const publicCategories = publicRoot.addResource('categories');
    publicCategories.addMethod('GET', new apigateway.LambdaIntegration(categoriesStack.categoriesPublicLambda));

    // Public WODs (CORS-friendly)
    const publicWods = publicRoot.addResource('wods');
    publicWods.addMethod('GET', new apigateway.LambdaIntegration(wodsStack.wodsPublicLambda));

    // Public Schedules (CORS-friendly)
    const publicSchedules = publicRoot.addResource('schedules');
    publicSchedules.addMethod('GET', new apigateway.LambdaIntegration(schedulingStack.publicSchedulesLambda));
    publicSchedules.addResource('{proxy+}').addMethod('GET', 
      new apigateway.LambdaIntegration(schedulingStack.publicSchedulesLambda)
    );

    // Public Scores
    const publicScores = publicRoot.addResource('scores');
    publicScores.addMethod('GET', new apigateway.LambdaIntegration(scoringStack.scoresLambda));

    // Athletes
    const athletes = networkStack.api.root.addResource('athletes');
    athletes.addMethod('ANY', new apigateway.LambdaIntegration(athletesStack.athletesLambda), {
      authorizer: networkStack.authorizer,
    });
    athletes.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(athletesStack.athletesLambda), 
      { authorizer: networkStack.authorizer }
    );

    // Scores
    const scores = networkStack.api.root.addResource('scores');
    scores.addMethod('ANY', new apigateway.LambdaIntegration(scoringStack.scoresLambda), {
      authorizer: networkStack.authorizer,
    });

    // Exercises
    const exercises = networkStack.api.root.addResource('exercises');
    exercises.addMethod('ANY', new apigateway.LambdaIntegration(scoringStack.exercisesLambda), {
      authorizer: networkStack.authorizer,
    });

    // Scoring Systems
    const scoringSystems = networkStack.api.root.addResource('scoring-systems');
    scoringSystems.addMethod('ANY', new apigateway.LambdaIntegration(scoringStack.scoringSystemsLambda), {
      authorizer: networkStack.authorizer,
    });
    scoringSystems.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(scoringStack.scoringSystemsLambda), 
      { authorizer: networkStack.authorizer }
    );

    // Categories
    const categories = networkStack.api.root.addResource('categories');
    categories.addMethod('ANY', new apigateway.LambdaIntegration(categoriesStack.categoriesLambda), {
      authorizer: networkStack.authorizer,
    });
    categories.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(categoriesStack.categoriesLambda), 
      { authorizer: networkStack.authorizer }
    );

    // WODs
    const wods = networkStack.api.root.addResource('wods', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    wods.addMethod('ANY', new apigateway.LambdaIntegration(wodsStack.wodsLambda), {
      authorizer: networkStack.authorizer,
    });

    const wodsProxy = wods.addResource('{proxy+}', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    wodsProxy.addMethod('ANY', new apigateway.LambdaIntegration(wodsStack.wodsLambda), {
      authorizer: networkStack.authorizer,
    });

    // Scheduler
    const scheduler = networkStack.api.root.addResource('scheduler');
    scheduler.addMethod('ANY', new apigateway.LambdaIntegration(schedulingStack.schedulerLambda), {
      authorizer: networkStack.authorizer,
    });
    scheduler.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(schedulingStack.schedulerLambda), 
      { authorizer: networkStack.authorizer }
    );

    // Authorization
    const authorization = networkStack.api.root.addResource('authorization');
    authorization.addMethod('ANY', new apigateway.LambdaIntegration(authorizationStack.authorizationLambda), {
      authorizer: networkStack.authorizer,
    });
    authorization.addResource('{proxy+}').addMethod('ANY', 
      new apigateway.LambdaIntegration(authorizationStack.authorizationLambda), 
      { authorizer: networkStack.authorizer }
    );

    // 6. Cross-Domain Event Routing
    new EventRouting(this, 'EventRouting', {
      centralBus: sharedStack.eventBus,
      competitionsEventBus: competitionsStack.competitionsEventBus,
      organizationsEventBus: organizationsStack.organizationsEventBus,
      athletesEventBus: athletesStack.athletesEventBus,
      scoringEventBus: scoringStack.scoringEventBus,
      schedulingEventBus: schedulingStack.schedulingEventBus,
    });

    // AppConfig Outputs
    new cdk.CfnOutput(this, 'AppConfigApplicationId', {
      value: appConfigApplication.applicationId,
      exportName: `AthleonAppConfig-ApplicationId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'AppConfigEnvironmentId', {
      value: appConfigEnvironment.environmentId,
      exportName: `AthleonAppConfig-EnvironmentId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'AppConfigConfigProfileId', {
      value: configProfile.ref,
      exportName: `AthleonAppConfig-ConfigProfileId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'AppConfigDeploymentStrategyId', {
      value: deploymentStrategy.ref,
      exportName: `AthleonAppConfig-DeploymentStrategyId-${props.stage}`,
    });
    new cdk.CfnOutput(this, 'Stage', { value: props.stage });
    new cdk.CfnOutput(this, 'ApiUrl', { 
      value: networkStack.domainName 
        ? `https://api.${props.config.domain}` 
        : networkStack.api.url 
    });
    new cdk.CfnOutput(this, 'UserPoolId', { value: sharedStack.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: sharedStack.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'CentralEventBus', { value: sharedStack.eventBus.eventBusName });
    new cdk.CfnOutput(this, 'FrontendBucket', { value: frontendStack.bucket.bucketName });
    new cdk.CfnOutput(this, 'FrontendDistributionId', { value: frontendStack.distribution.distributionId });
    new cdk.CfnOutput(this, 'FrontendUrl', { 
      value: props.config.domain && frontendStack.cloudfrontCertificate 
        ? `https://${props.config.domain}` 
        : `https://${frontendStack.distribution.distributionDomainName}` 
    });
    if (frontendStack.cloudfrontCertificate) {
      new cdk.CfnOutput(this, 'CloudFrontCertificateArn', { value: frontendStack.cloudfrontCertificate.certificateArn });
    }
    if (frontendStack.apiCertificate) {
      new cdk.CfnOutput(this, 'ApiCertificateArn', { value: frontendStack.apiCertificate.certificateArn });
    }
  }
}
