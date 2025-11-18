import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createBundledLambda } from '../shared/lambda-bundling';

export interface CompetitionsStackProps  {
  stage: string;
  eventBus: events.EventBus;
  sharedLayer: lambda.LayerVersion;
  eventImagesBucket: s3.Bucket;
  organizationEventsTable: dynamodb.Table;
  organizationMembersTable: dynamodb.Table;
  scoringSystemsTable: dynamodb.Table;
  categoriesTable?: dynamodb.Table;
  wodsTable?: dynamodb.Table;
  athleteEventsTable?: dynamodb.Table;
  cloudfrontDomain?: string;
  lambdaEnvironment?: Record<string, string>;
}

export class CompetitionsStack extends Construct {
  public readonly eventsTable: dynamodb.Table;
  public readonly eventDaysTable: dynamodb.Table;
  public readonly competitionsEventBus: events.EventBus;
  public readonly competitionsDddLambda: lambda.Function; // DDD handler

  constructor(scope: Construct, id: string, props: CompetitionsStackProps) {
    super(scope, id);

    // Domain-specific EventBridge Bus
    this.competitionsEventBus = new events.EventBus(this, 'CompetitionsEventBus', {
      eventBusName: `competitions-domain-${props.stage}`,
    });

    // Events Table
    this.eventsTable = new dynamodb.Table(this, 'EventsTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.eventsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
    });

    // Event Days Table
    this.eventDaysTable = new dynamodb.Table(this, 'EventDaysTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dayId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // DDD-Aligned Competitions Lambda
    this.competitionsDddLambda = createBundledLambda(this, 'CompetitionsDddLambda', 'competitions', {
      handler: 'handler-ddd.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512, // Slightly more memory for domain logic
      layers: [props.sharedLayer],
      environment: {
        EVENTS_TABLE: this.eventsTable.tableName,
        EVENT_DAYS_TABLE: this.eventDaysTable.tableName,
        EVENT_IMAGES_BUCKET: props.eventImagesBucket.bucketName,
        CLOUDFRONT_DOMAIN: props.cloudfrontDomain || '',
        ORGANIZATION_EVENTS_TABLE: props.organizationEventsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        SCORING_SYSTEMS_TABLE: props.scoringSystemsTable.tableName,
        CATEGORIES_TABLE: props.categoriesTable?.tableName || '',
        WODS_TABLE: props.wodsTable?.tableName || '',
        ATHLETES_TABLE: props.athleteEventsTable?.tableName || '',
        EVENT_BUS_NAME: this.competitionsEventBus.eventBusName,
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
        ...props.lambdaEnvironment,
      },
    });

    // Grant permissions to DDD Lambda
    this.eventsTable.grantReadWriteData(this.competitionsDddLambda);
    this.eventDaysTable.grantReadWriteData(this.competitionsDddLambda);
    props.eventImagesBucket.grantPut(this.competitionsDddLambda);
    props.organizationEventsTable.grantReadWriteData(this.competitionsDddLambda);
    props.organizationMembersTable.grantReadData(this.competitionsDddLambda);
    props.scoringSystemsTable.grantReadData(this.competitionsDddLambda);
    // Pragmatic DDD: Write access for immediate consistency + events for other consumers
    // This balances DDD principles with user experience requirements
    if (props.categoriesTable) props.categoriesTable.grantReadWriteData(this.competitionsDddLambda);
    if (props.wodsTable) props.wodsTable.grantReadWriteData(this.competitionsDddLambda);
    if (props.athleteEventsTable) props.athleteEventsTable.grantReadData(this.competitionsDddLambda);
    this.competitionsEventBus.grantPutEventsTo(this.competitionsDddLambda);
    props.eventBus.grantPutEventsTo(this.competitionsDddLambda);

    // Add CloudWatch Logs insights for domain events monitoring
    new cdk.CfnOutput(this, 'CompetitionsDddLambdaName', {
      value: this.competitionsDddLambda.functionName,
      description: 'DDD Lambda function name for monitoring',
    });

    new cdk.CfnOutput(this, 'CompetitionsEventBusName', {
      value: this.competitionsEventBus.eventBusName,
      description: 'EventBridge bus for domain events',
    });

    // Outputs
  }
}
