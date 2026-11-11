import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CfnOutput, Duration, RemovalPolicy, Stack, Token, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import { Assistant, type AssistantSettings } from './assistant';

export interface HelpCenterStackProps extends StackProps {
  /** A custom domain for the site. Without it the site is served on the distribution's own address. */
  domainName?: string;
  /** The Route 53 hosted zone of `domainName`. */
  hostedZoneId?: string;
  assistant: AssistantSettings;
}

const viewerRequestSource = readFileSync(fileURLToPath(new URL('./viewer-request.js', import.meta.url)), 'utf8');
const CANONICAL_HOST_LINE = "var CANONICAL_HOST = '__CANONICAL_HOST__';";

/** The edge function's source with the canonical host written in. */
export function viewerRequestCode(domainName: string | undefined): string {
  if (domainName !== undefined && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domainName)) {
    throw new Error(`domainName must be a lower-case host name, got "${domainName}".`);
  }
  if (!viewerRequestSource.includes(CANONICAL_HOST_LINE)) throw new Error('viewer-request.js no longer declares CANONICAL_HOST as expected.');
  return viewerRequestSource.replace(CANONICAL_HOST_LINE, `var CANONICAL_HOST = '${domainName ?? ''}';`);
}

/**
 * The whole help center in one stack: a private bucket for the static
 * export, CloudFront in front of it (Origin Access Control, TLS, HTTP/2 and
 * 3, security headers), the assistant behind `/api/*` on the same
 * distribution, and — only when a domain is given — its certificate and DNS
 * records. It creates no deployment role and no budget; publishing is a
 * manual step (docs/DEPLOYING.md).
 */
export class HelpCenterStack extends Stack {
  constructor(scope: Construct, id: string, props: HelpCenterStackProps) {
    super(scope, id, props);
    if ((props.domainName === undefined) !== (props.hostedZoneId === undefined)) throw new Error('Give domainName and hostedZoneId together, or neither.');
    // CloudFront accepts certificates from us-east-1 only.
    if (props.domainName && !Token.isUnresolved(this.region) && this.region !== 'us-east-1') {
      throw new Error(`A custom domain needs the stack in us-east-1 (CloudFront's certificate region); this one is in ${this.region}.`);
    }

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{ noncurrentVersionExpiration: Duration.days(30) }],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const zone = props.domainName
      ? route53.PublicHostedZone.fromPublicHostedZoneAttributes(this, 'Zone', { hostedZoneId: props.hostedZoneId!, zoneName: props.domainName })
      : undefined;
    const certificate =
      props.domainName && zone
        ? new acm.Certificate(this, 'Certificate', {
            domainName: props.domainName,
            subjectAlternativeNames: [`www.${props.domainName}`],
            validation: acm.CertificateValidation.fromDns(zone),
          })
        : undefined;

    const viewerRequest = new cloudfront.Function(this, 'ViewerRequest', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'Canonical host, language redirect for /, directory index and trailing slash.',
      code: cloudfront.FunctionCode.fromInline(viewerRequestCode(props.domainName)),
    });

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      comment: 'Security headers for the help center.',
      securityHeadersBehavior: {
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        contentSecurityPolicy: {
          // Next.js streams page data in inline scripts, so scripts need 'unsafe-inline'; everything else is this origin only.
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            'upgrade-insecure-requests',
          ].join('; '),
          override: true,
        },
      },
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Grounded help center',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        compress: true,
        functionAssociations: [{ function: viewerRequest, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      domainNames: props.domainName ? [props.domainName, `www.${props.domainName}`] : undefined,
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: certificate ? cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021 : undefined,
      // The bucket is private, so a missing object answers 403; both become the 404 page.
      errorResponses: [403, 404].map((httpStatus) => ({ httpStatus, responseHttpStatus: 404, responsePagePath: '/404.html', ttl: Duration.minutes(5) })),
    });

    if (props.domainName && zone) {
      for (const recordName of [props.domainName, `www.${props.domainName}`]) {
        const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
        const suffix = recordName.startsWith('www.') ? 'Www' : 'Apex';
        new route53.ARecord(this, `AliasA${suffix}`, { zone, recordName, target });
        new route53.AaaaRecord(this, `AliasAaaa${suffix}`, { zone, recordName, target });
      }
    }

    new Assistant(this, 'Assistant', {
      ...props.assistant,
      bucket,
      distribution,
      responseHeadersPolicy: securityHeaders,
      allowedOrigins: props.domainName ? [`https://${props.domainName}`, `https://www.${props.domainName}`] : [],
    });

    new CfnOutput(this, 'SiteUrl', { value: `https://${props.domainName ?? distribution.distributionDomainName}` });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName, description: 'Upload the static export (out/) here.' });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId, description: 'Invalidate after an upload.' });
  }
}
