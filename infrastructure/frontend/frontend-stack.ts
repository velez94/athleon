import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface FrontendStackProps {
  stage: string;
  domain?: string;
  enableWaf?: boolean;
  rateLimiting?: number;
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
      // Lookup hosted zone
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domain,
      });

      // Certificate for CloudFront (must be in us-east-1)
      this.cloudfrontCertificate = new acm.DnsValidatedCertificate(this, 'CloudFrontCertificate', {
        domainName: props.domain,
        subjectAlternativeNames: [`*.${props.domain}`],
        hostedZone: this.hostedZone,
        region: 'us-east-1',
        certificateName: `${props.stage}-cloudfront-cert`,
      });

      // Certificate for API Gateway (in current region)
      this.apiCertificate = new acm.Certificate(this, 'ApiCertificate', {
        domainName: `api.${props.domain}`,
        validation: acm.CertificateValidation.fromDns(this.hostedZone),
        certificateName: `${props.stage}-api-cert`,
      });
    }

    // S3 bucket for static website
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `scoringames-frontend-${props.stage}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: props.domain ? [props.domain] : undefined,
      certificate: this.cloudfrontCertificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

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
