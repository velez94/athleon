import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface NetworkStackProps  {
  stage: string;
  userPool: cognito.UserPool;
  certificate?: acm.Certificate;
  apiDomain?: string;
  hostedZone?: route53.IHostedZone;
}

export class NetworkStack extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;
  public readonly domainName?: apigateway.DomainName;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id);

    // Custom domain for API Gateway (if certificate provided)
    this.domainName = props.certificate && props.apiDomain ? new apigateway.DomainName(this, 'ApiDomain', {
      domainName: props.apiDomain,
      certificate: props.certificate,
      endpointType: apigateway.EndpointType.REGIONAL,
    }) : undefined;

    // API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `athleon-api-${props.stage}`,
      description: 'Athleon API',
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Cognito Authorizer
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'CognitoAuthorizer',
    });

    // Map custom domain to API Gateway stage
    if (this.domainName) {
      new apigateway.BasePathMapping(this, 'BasePathMapping', {
        domainName: this.domainName,
        restApi: this.api,
        stage: this.api.deploymentStage,
      });

      // Create Route 53 CNAME record for API domain
      if (props.hostedZone && props.apiDomain) {
        new route53.CnameRecord(this, 'ApiCnameRecord', {
          zone: props.hostedZone,
          recordName: props.apiDomain,
          domainName: this.domainName.domainNameAliasDomainName,
        });
      }
    }

    // Add CORS headers to Gateway error responses
    this.api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
      },
    });

    this.api.addGatewayResponse('AccessDenied', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
      },
    });

    this.api.addGatewayResponse('Default4xx', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
      },
    });

    // Outputs
  }
}
