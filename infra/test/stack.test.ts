import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { settingsFromContext } from '../bin/settings';
import { migrationsHash } from '../lib/assistant';
import { HelpCenterStack } from '../lib/help-center-stack';

/** Synthesises the stack from context values, the way `cdk synth -c key=value` does, without bundling the functions. */
function synth(context: Record<string, string> = {}, env?: { account: string; region: string }) {
  const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });
  const settings = settingsFromContext((key) => context[key]);
  return Template.fromStack(new HelpCenterStack(app, 'Test', { ...(env ? { env } : {}), ...settings }));
}

type Statement = { Action: string | string[]; Resource: unknown; Condition?: unknown; Effect: string; Sid?: string };
const statementsOf = (template: Template): Statement[] =>
  Object.values(template.findResources('AWS::IAM::Policy')).flatMap(
    (policy) => (policy as { Properties: { PolicyDocument: { Statement: Statement[] } } }).Properties.PolicyDocument.Statement,
  );
const actionsOf = (template: Template) => statementsOf(template).flatMap((statement) => (Array.isArray(statement.Action) ? statement.Action : [statement.Action]));

/** A reserved example name (it can never resolve), standing in for a custom domain, and a placeholder zone id. */
const DOMAIN = { domainName: 'help-center.example', hostedZoneId: 'ZONE-PLACEHOLDER' };
const BEDROCK = {
  modelProvider: 'bedrock',
  bedrockModelId: 'anthropic.example-model',
  embeddingProvider: 'bedrock',
  bedrockEmbeddingModelId: 'amazon.example-embedding',
};

describe('the site', () => {
  const template = synth();

  it('keeps the bucket private, encrypted and versioned', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
      BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] },
      VersioningConfiguration: { Status: 'Enabled' },
    });
    template.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Retain' });
  });

  it('serves over HTTPS only, with HTTP/3, the edge function, security headers and the 404 page', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        HttpVersion: 'http2and3',
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https', FunctionAssociations: [Match.objectLike({ EventType: 'viewer-request' })] }),
        CustomErrorResponses: [
          Match.objectLike({ ErrorCode: 403, ResponseCode: 404, ResponsePagePath: '/404.html' }),
          Match.objectLike({ ErrorCode: 404, ResponseCode: 404, ResponsePagePath: '/404.html' }),
        ],
      }),
    });
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          ContentSecurityPolicy: Match.objectLike({ ContentSecurityPolicy: Match.stringLikeRegexp("default-src 'self'.*frame-ancestors 'none'") }),
          FrameOptions: { FrameOption: 'DENY', Override: true },
        }),
      }),
    });
  });

  it('creates no domain, certificate or DNS records without a domain, and no deploy role, budget or e-mail sending at all', () => {
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::IAM::OIDCProvider', 0);
    template.resourceCountIs('AWS::Budgets::Budget', 0);
    template.resourceCountIs('AWS::SES::EmailIdentity', 0);
  });

  it('adds a certificate validated in DNS and records for both names when a domain is given', () => {
    const withDomain = synth(DOMAIN);
    withDomain.hasResourceProperties('AWS::CertificateManager::Certificate', { DomainName: DOMAIN.domainName, ValidationMethod: 'DNS' });
    withDomain.resourceCountIs('AWS::Route53::RecordSet', 4);
    withDomain.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ Aliases: [DOMAIN.domainName, `www.${DOMAIN.domainName}`], ViewerCertificate: Match.objectLike({ MinimumProtocolVersion: 'TLSv1.2_2021' }) }),
    });
  });

  it('refuses a domain without its zone, and a domain outside the certificate region', () => {
    expect(() => synth({ domainName: DOMAIN.domainName })).toThrow(/together/);
    expect(() => synth(DOMAIN, { account: '0'.repeat(12), region: 'eu-west-1' })).toThrow(/us-east-1/);
  });
});

describe('the assistant', () => {
  const template = synth();

  it('runs PostgreSQL on Aurora Serverless v2 that pauses when idle, with the Data API, encryption and deletion protection', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      EngineVersion: Match.stringLikeRegexp('^16\\.'),
      ServerlessV2ScalingConfiguration: { MinCapacity: 0, MaxCapacity: 4, SecondsUntilAutoPause: 300 },
      EnableHttpEndpoint: true,
      StorageEncrypted: true,
      DeletionProtection: true,
      DatabaseName: 'help',
    });
    template.hasResourceProperties('AWS::RDS::DBInstance', { DBInstanceClass: 'db.serverless', PubliclyAccessible: false });
  });

  it('keeps the database in isolated subnets and every function outside the VPC: no NAT, no internet gateway', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.resourceCountIs('AWS::EC2::InternetGateway', 0);
    for (const fn of Object.values(template.findResources('AWS::Lambda::Function'))) {
      expect((fn as { Properties: { VpcConfig?: unknown } }).Properties.VpcConfig).toBeUndefined();
    }
  });

  it('serves /api/* on the same distribution, uncached, to a function URL only CloudFront can call', () => {
    template.hasResourceProperties('AWS::Lambda::Url', { AuthType: 'AWS_IAM' });
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: [
          Match.objectLike({
            PathPattern: '/api/*',
            AllowedMethods: Match.arrayWith(['POST']),
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // CachingDisabled
            FunctionAssociations: Match.absent(),
            ViewerProtocolPolicy: 'redirect-to-https',
          }),
        ],
      }),
    });
    template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: Match.objectLike({ OriginAccessControlOriginType: 'lambda', SigningBehavior: 'always' }),
    });
    template.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
      OriginRequestPolicyConfig: Match.objectLike({
        HeadersConfig: { HeaderBehavior: 'whitelist', Headers: ['CloudFront-Viewer-Address', 'Origin', 'Content-Type'] },
        CookiesConfig: { CookieBehavior: 'none' },
      }),
    });
  });

  it('by default writes and embeds locally: no Bedrock permission at all, no model id anywhere', () => {
    expect(actionsOf(template).filter((action) => /bedrock|marketplace/.test(action))).toEqual([]);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'The help center API: /api/ask.',
      Environment: { Variables: Match.objectLike({ MODEL_PROVIDER: 'local', EMBEDDING_PROVIDER: 'local', BEDROCK_MODEL_ID: Match.absent() }) },
    });
  });

  it('with Bedrock chosen, grants exactly the named models and passes their ids — to the functions that call them', () => {
    const bedrock = synth(BEDROCK);
    const statements = statementsOf(bedrock);
    const policies = JSON.stringify(bedrock.findResources('AWS::IAM::Policy'));
    expect(actionsOf(bedrock)).not.toContain('*');
    expect(policies).toContain('foundation-model/amazon.example-embedding');
    expect(policies).not.toMatch(/foundation-model\/\*/);
    expect(statements.filter((statement) => statement.Sid === 'ClaudeOnBedrock')).toHaveLength(1);
    const marketplace = statements.find((statement) => statement.Sid === 'ModelSubscriptionOnFirstUse');
    expect(JSON.stringify(marketplace?.Condition)).toContain('aws:CalledViaLast');
    bedrock.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'The help center API: /api/ask.',
      Environment: { Variables: Match.objectLike({ MODEL_PROVIDER: 'bedrock', BEDROCK_MODEL_ID: 'anthropic.example-model', MODEL_EFFORT: 'low', EMBEDDING_PROVIDER: 'bedrock' }) },
    });
    bedrock.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'Applies the database migrations during deployment.',
      Environment: { Variables: Match.objectLike({ BEDROCK_MODEL_ID: Match.absent(), EMBEDDING_PROVIDER: Match.absent() }) },
    });
  });

  it('checks the browser origin against the custom domain when there is one', () => {
    synth(DOMAIN).hasResourceProperties('AWS::Lambda::Function', {
      Description: 'The help center API: /api/ask.',
      Environment: { Variables: Match.objectLike({ ALLOWED_ORIGINS: `https://${DOMAIN.domainName},https://www.${DOMAIN.domainName}` }) },
    });
  });

  it('caps the API’s concurrency and daily drafts, and never sets a reserved concurrency of 0', () => {
    template.hasResourceProperties('AWS::Lambda::Function', { Description: 'The help center API: /api/ask.', ReservedConcurrentExecutions: 10 });
    synth({ apiReservedConcurrency: 'none' }).hasResourceProperties('AWS::Lambda::Function', {
      Description: 'The help center API: /api/ask.',
      ReservedConcurrentExecutions: Match.absent(),
    });
    expect(() => synth({ apiReservedConcurrency: '0' })).toThrow(/at least 1/);
    expect(() => synth({ draftsPerDay: '0' })).toThrow(/at least 1/);
  });

  it('ingests on every uploaded corpus, cleans up daily, and migrates the schema on deployment', () => {
    template.hasResourceProperties('Custom::S3BucketNotifications', {
      NotificationConfiguration: Match.objectLike({
        LambdaFunctionConfigurations: [
          Match.objectLike({ Filter: { Key: { FilterRules: Match.arrayWith([{ Name: 'suffix', Value: 'corpus.json' }, { Name: 'prefix', Value: 'help/' }]) } } }),
        ],
      }),
    });
    template.hasResourceProperties('AWS::Events::Rule', { ScheduleExpression: 'cron(17 3 * * ? *)' });
    template.hasResourceProperties('Custom::HelpCenterSchema', { Migrations: migrationsHash() });
  });
});

describe('settings from the context', () => {
  it('need nothing: local writer and embedder, no domain, a pausing database', () => {
    expect(settingsFromContext(() => undefined)).toEqual({
      assistant: {
        writer: { provider: 'local' },
        embeddings: { provider: 'local' },
        minCapacity: 0,
        maxCapacity: 4,
        autoPauseMinutes: 5,
        apiReservedConcurrency: 10,
        draftsPerDay: 100,
      },
    });
  });

  it('require a model id for each Bedrock provider, and assume none', () => {
    expect(() => settingsFromContext((key) => ({ modelProvider: 'bedrock' })[key])).toThrow(/bedrockModelId/);
    expect(() => settingsFromContext((key) => ({ embeddingProvider: 'bedrock' })[key])).toThrow(/bedrockEmbeddingModelId/);
    expect(() => settingsFromContext((key) => ({ modelProvider: 'openai' })[key])).toThrow(/local or bedrock/);
    expect(() => settingsFromContext((key) => ({ maxCapacity: 'lots' })[key])).toThrow(/number/);
  });
});
