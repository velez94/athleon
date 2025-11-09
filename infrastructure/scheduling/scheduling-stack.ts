import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { createBundledLambda } from '../shared/lambda-bundling';

export interface SchedulingStackProps  {
  stage: string;
  eventBus: events.EventBus;
  sharedLayer: lambda.LayerVersion;
}

export class SchedulingStack extends Construct {
  public readonly schedulerLambda: lambda.Function;
  public readonly schedulesTable: dynamodb.Table;
  public readonly heatsTable: dynamodb.Table;
  public readonly classificationFiltersTable: dynamodb.Table;
  public readonly schedulingEventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: SchedulingStackProps) {
    super(scope, id);

    // Domain-specific EventBridge Bus
    this.schedulingEventBus = new events.EventBus(this, 'SchedulingEventBus', {
      eventBusName: `scheduling-domain-${props.stage}`,
    });

    // Schedules Table
    this.schedulesTable = new dynamodb.Table(this, 'SchedulesTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Heats Table
    this.heatsTable = new dynamodb.Table(this, 'HeatsTable', {
      partitionKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'heatId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Classification Filters Table
    this.classificationFiltersTable = new dynamodb.Table(this, 'ClassificationFiltersTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'filterId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Scheduler Lambda (DDD)
    this.schedulerLambda = createBundledLambda(this, 'SchedulerLambda', 'scheduling', {
      environment: {
        SCHEDULES_TABLE: this.schedulesTable.tableName,
        HEATS_TABLE: this.heatsTable.tableName,
        CLASSIFICATION_FILTERS_TABLE: this.classificationFiltersTable.tableName,
        DOMAIN_EVENT_BUS: this.schedulingEventBus.eventBusName,
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
      },
      layers: [props.sharedLayer],
    });

    this.schedulesTable.grantReadWriteData(this.schedulerLambda);
    this.heatsTable.grantReadWriteData(this.schedulerLambda);
    this.classificationFiltersTable.grantReadWriteData(this.schedulerLambda);
    this.schedulingEventBus.grantPutEventsTo(this.schedulerLambda);
    props.eventBus.grantPutEventsTo(this.schedulerLambda);

    // Generate Schedule Lambda (Step Functions task)
    const generateScheduleLambda = createBundledLambda(this, 'GenerateScheduleLambda', 'scheduling', {
      environment: {
        SCHEDULES_TABLE: this.schedulesTable.tableName,
      },
    });

    this.schedulesTable.grantReadWriteData(generateScheduleLambda);

    // Public Schedules Lambda
    const publicSchedulesLambda = createBundledLambda(this, 'PublicSchedulesLambda', 'scheduling', {
      environment: {
        SCHEDULES_TABLE: this.schedulesTable.tableName,
      },
    });

    this.schedulesTable.grantReadData(publicSchedulesLambda);

    // Outputs
  }
}
