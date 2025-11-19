import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface FrontendStackProps {
  stage: string;
  domain?: string;
  enableWaf?: boolean;
  rateLimiting?: number;
  eventImagesBucket: s3.Bucket;
}

export class FrontendStack extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly cloudfrontCertificate?: acm.Certificate;
  public readonly apiCertificate?: acm.Certificate;
  public readonly hostedZone?: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id);

    // Create certificates for custom domain
    if (props.domain) {
      // Lookup existing hosted zone
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domain,
      });

      // Certificate for CloudFront (must be in us-east-1)
      this.cloudfrontCertificate = new acm.Certificate(this, 'CloudFrontCertificate', {
        domainName: props.domain,
        subjectAlternativeNames: [`*.${props.domain}`],
        validation: acm.CertificateValidation.fromDns(this.hostedZone),
        certificateName: `${props.stage}-cloudfront-cert`,
      });

      // Certificate for API Gateway (in current region us-east-2)
      this.apiCertificate = new acm.Certificate(this, 'ApiCertificate', {
        domainName: `api.${props.domain}`,
        validation: acm.CertificateValidation.fromDns(this.hostedZone),
        certificateName: `${props.stage}-api-cert`,
      });
    }

    // S3 bucket for static website
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `athleon-frontend-${props.stage}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // Dynamic CSP policy based on environment
    const apiDomain = props.domain ? `https://api.${props.domain}` : `https://api.${props.stage}.athleon.fitness`;
    const cognitoRegion = process.env.CDK_DEFAULT_REGION || 'us-east-2';
    const s3BucketDomain = `https://athleon-event-images-${props.stage}.s3.${cognitoRegion}.amazonaws.com`;
    
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "media-src 'self' data:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiDomain} https://cognito-idp.${cognitoRegion}.amazonaws.com ${s3BucketDomain}`,
      "frame-ancestors 'none'"
    ].join('; ');

    // Security headers policy
    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      responseHeadersPolicyName: `athleon-security-headers-${props.stage}`,
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: cspPolicy,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
      },
    });

    // CloudFront function to handle SPA routing vs asset requests
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      functionName: `athleon-spa-routing-${props.stage}`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // If request is for an asset (has file extension), don't modify
  if (uri.match(/\\.[a-zA-Z0-9]+$/)) {
    return request;
  }
  
  // If request is for a route (no extension), serve index.html
  if (!uri.match(/\\.[a-zA-Z0-9]+$/) && uri !== '/') {
    request.uri = '/index.html';
  }
  
  return request;
}
      `),
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeadersPolicy,
        functionAssociations: [{
          function: spaRoutingFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      additionalBehaviors: {
        // Handle Vite assets with proper caching
        '/assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
        '/images/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(props.eventImagesBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          functionAssociations: [{
            function: new cloudfront.Function(this, 'ImagePathRewriteFunction', {
              functionName: `athleon-image-path-rewrite-${props.stage}`,
              code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  // Remove /images prefix from the URI
  request.uri = request.uri.replace(/^\\/images\\//, '/');
  return request;
}
              `),
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
        },
      },
      domainNames: props.domain ? [props.domain] : undefined,
      certificate: this.cloudfrontCertificate,
      defaultRootObject: 'index.html',
      // Remove error responses - let the function handle routing
    });

    // Grant CloudFront access to event images bucket
    props.eventImagesBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [props.eventImagesBucket.arnForObjects('*')],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
        },
      },
    }));

    // Create Route 53 A Record for custom domain
    if (props.domain && this.hostedZone) {
      new route53.ARecord(this, 'AliasRecord', {
        zone: this.hostedZone,
        recordName: props.domain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }
  }
}
