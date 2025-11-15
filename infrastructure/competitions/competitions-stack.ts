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
  eventImagesBucket: s3.Bucket;
  organizationEventsTable: dynamodb.Table;
  organizationMembersTable: dynamodb.Table;
  scoringSystemsTable: dynamodb.Table;
}

export class CompetitionsStack extends Construct {
  public readonly eventsTable: dynamodb.Table;
  public readonly eventDaysTable: dynamodb.Table;
  public readonly competitionsEventBus: events.EventBus;
  public readonly competitionsLambda: lambda.Function;
  public readonly competitionsDddLambda: lambda.Function; // New DDD handler

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

    // Legacy Competitions Lambda (to be deprecated)
    this.competitionsLambda = createBundledLambda(this, 'CompetitionsLambda', 'competitions', {
      handler: 'index.handler',
      environment: {
        EVENTS_TABLE: this.eventsTable.tableName,
        EVENT_DAYS_TABLE: this.eventDaysTable.tableName,
        EVENT_IMAGES_BUCKET: props.eventImagesBucket.bucketName,
        ORGANIZATION_EVENTS_TABLE: props.organizationEventsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        SCORING_SYSTEMS_TABLE: props.scoringSystemsTable.tableName,
        DOMAIN_EVENT_BUS: this.competitionsEventBus.eventBusName,
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
      },
    });

    // New DDD-Aligned Competitions Lambda
    this.competitionsDddLambda = createBundledLambda(this, 'CompetitionsDddLambda', 'competitions', {
      handler: 'handler-ddd.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512, // Slightly more memory for domain logic
      environment: {
        EVENTS_TABLE: this.eventsTable.tableName,
        EVENT_DAYS_TABLE: this.eventDaysTable.tableName,
        EVENT_IMAGES_BUCKET: props.eventImagesBucket.bucketName,
        ORGANIZATION_EVENTS_TABLE: props.organizationEventsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        SCORING_SYSTEMS_TABLE: props.scoringSystemsTable.tableName,
        EVENT_BUS_NAME: this.competitionsEventBus.eventBusName, // DDD handler uses this name
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
      },
    });

    // Grant permissions to legacy Lambda
    this.eventsTable.grantReadWriteData(this.competitionsLambda);
    this.eventDaysTable.grantReadWriteData(this.competitionsLambda);
    props.eventImagesBucket.grantPut(this.competitionsLambda);
    props.organizationEventsTable.grantReadWriteData(this.competitionsLambda);
    props.organizationMembersTable.grantReadData(this.competitionsLambda);
    props.scoringSystemsTable.grantReadData(this.competitionsLambda);
    this.competitionsEventBus.grantPutEventsTo(this.competitionsLambda);
    props.eventBus.grantPutEventsTo(this.competitionsLambda);

    // Grant permissions to DDD Lambda
    this.eventsTable.grantReadWriteData(this.competitionsDddLambda);
    this.eventDaysTable.grantReadWriteData(this.competitionsDddLambda);
    props.eventImagesBucket.grantPut(this.competitionsDddLambda);
    props.organizationEventsTable.grantReadWriteData(this.competitionsDddLambda);
    props.organizationMembersTable.grantReadData(this.competitionsDddLambda);
    props.scoringSystemsTable.grantReadData(this.competitionsDddLambda);
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
