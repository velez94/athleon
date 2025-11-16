import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

export interface AnalyticsStackProps {
  stage: string;
  api: apigateway.RestApi;
  authorizer: apigateway.CognitoUserPoolsAuthorizer;
  sharedLayer: lambda.LayerVersion;
  eventBus: events.EventBus;
  // Only organization tables for RBAC
  organizationMembersTable: dynamodb.Table;
  envConfig: any;
}

export class AnalyticsStack extends Construct {
  public readonly analyticsTable: dynamodb.Table;
  public readonly analyticsLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: AnalyticsStackProps) {
    super(scope, id);

    // Analytics Domain Table (own data)
    this.analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: `analytics-${props.stage}`,
      partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'metricId', type: dynamodb.AttributeType.STRING },
      billingMode: props.envConfig.dynamodb?.billingMode || dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.envConfig.dynamodb?.pointInTimeRecovery || false,
      },
      deletionProtection: props.envConfig.dynamodb?.deletionProtection || false,
    });

    // Analytics Lambda (owns analytics domain)
    this.analyticsLambda = new lambda.Function(this, 'AnalyticsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      layers: [props.sharedLayer],
      memorySize: props.envConfig.lambda?.memorySize || 256,
      timeout: cdk.Duration.seconds(props.envConfig.lambda?.timeout || 30),
      environment: {
        ANALYTICS_TABLE: this.analyticsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        ...props.envConfig.lambda?.environment,
      },
    });

    // Grant permissions (only own table + RBAC)
    this.analyticsTable.grantReadWriteData(this.analyticsLambda);
    props.organizationMembersTable.grantReadData(this.analyticsLambda);

    // Event-driven data collection
    const eventRule = new events.Rule(this, 'AnalyticsEventRule', {
      eventBus: props.eventBus,
      eventPattern: {
        source: ['competitions.domain', 'athletes.domain', 'scoring.domain'],
        detailType: ['EventCreated', 'AthleteRegistered', 'ScoreSubmitted'],
      },
    });
    eventRule.addTarget(new targets.LambdaFunction(this.analyticsLambda));

    // API Gateway Integration
    const analyticsResource = props.api.root.addResource('analytics');
    analyticsResource.addMethod('GET', new apigateway.LambdaIntegration(this.analyticsLambda), {
      authorizer: props.authorizer,
    });
  }
}
