import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { createBundledLambda } from '../shared/lambda-bundling';
import { EnvironmentConfig } from '../config/environment-config';
import { AthleonSharedLayer } from '../shared/lambda-layer';

export interface CategoriesStackProps  {
  stage: string;  
  config: EnvironmentConfig;
  eventBus: events.EventBus;
  sharedLayer: AthleonSharedLayer;
  organizationEventsTable: dynamodb.Table;
  organizationMembersTable: dynamodb.Table;
}

export class CategoriesStack extends Construct {
  public readonly categoriesLambda: lambda.Function;
  public readonly categoriesTable: dynamodb.Table;
  public readonly categoriesEventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: CategoriesStackProps) {
    super(scope, id);

    // Domain-specific EventBridge Bus
    this.categoriesEventBus = new events.EventBus(this, 'CategoriesEventBus', {
      eventBusName: `categories-domain-${props.stage}`,
    });

    // Categories Table
    this.categoriesTable = new dynamodb.Table(this, 'CategoriesTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'categoryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Categories Lambda
    this.categoriesLambda = createBundledLambda(this, 'CategoriesLambda', 'categories', {
      layers: [props.sharedLayer.layer],
      environment: {
        CATEGORIES_TABLE: this.categoriesTable.tableName,
        ORGANIZATION_EVENTS_TABLE: props.organizationEventsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        DOMAIN_EVENT_BUS: this.categoriesEventBus.eventBusName,
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
        ...props.config.lambda.environment,
      },
    });

    // Grant permissions
    this.categoriesTable.grantReadWriteData(this.categoriesLambda);
    props.organizationEventsTable.grantReadData(this.categoriesLambda);
    props.organizationMembersTable.grantReadData(this.categoriesLambda);
    this.categoriesEventBus.grantPutEventsTo(this.categoriesLambda);
    props.eventBus.grantPutEventsTo(this.categoriesLambda);

    // Outputs
  }
}
