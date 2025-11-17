import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { createBundledLambda } from '../shared/lambda-bundling';
import { EnvironmentConfig } from '../config/environment-config';
import { AthleonSharedLayer } from '../shared/lambda-layer';

export interface WodsStackProps  {
  stage: string;  
  config: EnvironmentConfig;
  eventBus: events.EventBus;
  sharedLayer: AthleonSharedLayer;
  organizationEventsTable: dynamodb.Table;
  organizationMembersTable: dynamodb.Table;
  scoresTable: dynamodb.Table;
}

export class WodsStack extends Construct {
  public readonly wodsLambda: lambda.Function;
  public readonly wodsPublicLambda: lambda.Function;
  public readonly wodsTable: dynamodb.Table;
  public readonly wodsEventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: WodsStackProps) {
    super(scope, id);

    // Domain-specific EventBridge Bus
    this.wodsEventBus = new events.EventBus(this, 'WodsEventBus', {
      eventBusName: `wods-domain-${props.stage}`,
    });

    // WODs Table
    this.wodsTable = new dynamodb.Table(this, 'WodsTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'wodId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WODs Lambda
    this.wodsLambda = createBundledLambda(this, 'WodsLambda', 'wods', {
      layers: [props.sharedLayer.layer],
      environment: {
        WODS_TABLE: this.wodsTable.tableName,
        ORGANIZATION_EVENTS_TABLE: props.organizationEventsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        SCORES_TABLE: props.scoresTable.tableName,
        AUTHORIZATION_API: `https://api.${props.stage === 'production' ? '' : props.stage + '.'}athleon.fitness/authorization`,
        DOMAIN_EVENT_BUS: this.wodsEventBus.eventBusName,
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
        ...props.config.lambda.environment,
      },
    });

    // Public WODs Lambda (no auth, CORS-friendly)
    this.wodsPublicLambda = createBundledLambda(this, 'WodsPublicLambda', 'wods', {
      handler: 'public.handler',
      environment: {
        WODS_TABLE: this.wodsTable.tableName,
      },
    });

    // Grant permissions
    this.wodsTable.grantReadWriteData(this.wodsLambda);
    props.organizationEventsTable.grantReadData(this.wodsLambda);
    props.organizationMembersTable.grantReadData(this.wodsLambda);
    props.scoresTable.grantReadData(this.wodsLambda);
    this.wodsEventBus.grantPutEventsTo(this.wodsLambda);
    props.eventBus.grantPutEventsTo(this.wodsLambda);

    // Grant read-only to public Lambda
    this.wodsTable.grantReadData(this.wodsPublicLambda);

    // Outputs
  }
}
