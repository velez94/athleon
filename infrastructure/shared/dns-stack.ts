import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface DnsStackProps {
  stage: string;
  domain: string;
}

export class DnsStack extends Construct {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: certificatemanager.ICertificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id);

    // Hosted Zone (existing)
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domain,
    });

    // SSL Certificate for auth subdomain
    this.certificate = new certificatemanager.Certificate(this, 'AuthCertificate', {
      domainName: `auth.${props.domain}`,
      validation: certificatemanager.CertificateValidation.fromDns(this.hostedZone),
    });
  }
}
