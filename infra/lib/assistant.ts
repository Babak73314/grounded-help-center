import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CfnOutput, CustomResource, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

const BACKEND = fileURLToPath(new URL('../../backend/', import.meta.url));
const MIGRATIONS = join(BACKEND, 'src', 'db', 'migrations');
/** Where the site build writes the corpus, and so where it lands in the bucket. */
export const CORPUS_KEY = 'help/corpus.json';

export type WriterSettings = { provider: 'local' } | { provider: 'bedrock'; modelId: string; fallbackModelId?: string };
export type EmbeddingSettings = { provider: 'local' } | { provider: 'bedrock'; modelId: string };

export interface AssistantSettings {
  /** Who writes the answers: the local extractive writer, or Claude on Bedrock. */
  writer: WriterSettings;
  /** Who embeds the passages: the local hashing embedder, or Titan on Bedrock. */
  embeddings: EmbeddingSettings;
  /** Aurora Serverless v2 capacity in ACUs; a minimum of 0 lets the database pause when idle. */
  minCapacity: number;
  maxCapacity: number;
  /** With a minimum of 0: idle minutes before the database pauses. */
  autoPauseMinutes: number;
  /** The most API requests in flight at once; unset leaves the function unreserved. Never 0, which would throttle everything. */
  apiReservedConcurrency?: number;
  /** Answers the writer may draft per day, for all visitors together. */
  draftsPerDay: number;
}

export interface AssistantProps extends AssistantSettings {
  bucket: s3.IBucket;
  distribution: cloudfront.Distribution;
  responseHeadersPolicy: cloudfront.IResponseHeadersPolicy;
  /**
   * The origins a browser request may come from: the custom domain, when there
   * is one. Without a domain none is set — the distribution's own address
   * cannot be given to the function it routes to without a dependency cycle —
   * and the API's JSON-only rule keeps cross-site browser posts out.
   */
  allowedOrigins: string[];
}

/** A hash of every migration file, so the migration resource changes — and runs — exactly when a migration does. */
export function migrationsHash(): string {
  const hash = createHash('sha256');
  for (const file of readdirSync(MIGRATIONS).sort()) hash.update(file).update(readFileSync(join(MIGRATIONS, file)));
  return hash.digest('hex');
}

/**
 * The assistant behind `/api/*`:
 *
 * - Aurora PostgreSQL Serverless v2 (pgvector, full-text search, rate limits)
 *   in isolated subnets — no NAT, no internet route. It pauses when idle.
 * - Four Lambda functions outside the VPC: the API, the corpus ingester (on
 *   each upload of the site), the schema migrator (on each deployment) and a
 *   daily clean-up. They reach the database through the RDS Data API, over
 *   HTTPS and IAM, so there is no connection to hold and nothing to pay for
 *   network address translation.
 * - `/api/*` on the site's own distribution, to a function URL only
 *   CloudFront may call (Origin Access Control): same address, no CORS.
 * - Amazon Bedrock only when the context asks for it, and then only the
 *   named models.
 */
export class Assistant extends Construct {
  readonly cluster: rds.DatabaseCluster;
  readonly api: nodejs.NodejsFunction;
  readonly ingest: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: AssistantProps) {
    super(scope, id);
    const stack = Stack.of(this);
    if (props.apiReservedConcurrency !== undefined && (!Number.isInteger(props.apiReservedConcurrency) || props.apiReservedConcurrency < 1)) {
      throw new Error(`apiReservedConcurrency must be a whole number of at least 1, or unset; got ${props.apiReservedConcurrency}.`);
    }
    if (!Number.isInteger(props.draftsPerDay) || props.draftsPerDay < 1) {
      throw new Error(`draftsPerDay must be a whole number of at least 1; got ${props.draftsPerDay}.`);
    }

    const vpc = new ec2.Vpc(this, 'Network', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'database', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 }],
    });

    this.cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_16_13 }),
      writer: rds.ClusterInstance.serverlessV2('Writer', { publiclyAccessible: false }),
      serverlessV2MinCapacity: props.minCapacity,
      serverlessV2MaxCapacity: props.maxCapacity,
      // Auto-pause exists only with a minimum of 0; CloudFormation refuses the duration otherwise.
      serverlessV2AutoPauseDuration: props.minCapacity === 0 ? Duration.minutes(props.autoPauseMinutes) : undefined,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      enableDataApi: true,
      defaultDatabaseName: 'help',
      credentials: rds.Credentials.fromGeneratedSecret('help_admin'),
      storageEncrypted: true,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      backup: { retention: Duration.days(7) },
    });

    const writer = props.writer;
    const embeddings = props.embeddings;
    // Every function reaches the database; each gets only the other settings it reads.
    const database = { DB_CLUSTER_ARN: this.cluster.clusterArn, DB_SECRET_ARN: this.cluster.secret!.secretArn, DB_NAME: 'help', NODE_OPTIONS: '--enable-source-maps' };
    const embedder = {
      EMBEDDING_PROVIDER: embeddings.provider,
      ...(embeddings.provider === 'bedrock' ? { BEDROCK_EMBEDDING_MODEL_ID: embeddings.modelId } : {}),
    };
    const apiEnvironment = {
      ...database,
      ...embedder,
      MODEL_PROVIDER: writer.provider,
      ...(writer.provider === 'bedrock'
        ? { BEDROCK_MODEL_ID: writer.modelId, MODEL_EFFORT: 'low', ...(writer.fallbackModelId ? { BEDROCK_FALLBACK_MODEL_ID: writer.fallbackModelId } : {}) }
        : {}),
      ...(props.allowedOrigins.length > 0 ? { ALLOWED_ORIGINS: props.allowedOrigins.join(',') } : {}),
      LIMIT_DRAFTS_PER_DAY: String(props.draftsPerDay),
    };
    const ingestEnvironment = { ...database, ...embedder, CORPUS_BUCKET: props.bucket.bucketName, CORPUS_KEY };

    const fn = (
      name: string,
      entry: string,
      options: { timeout: Duration; memorySize: number; description: string; environment: Record<string, string>; reservedConcurrency?: number },
    ) =>
      new nodejs.NodejsFunction(this, name, {
        entry: join(BACKEND, 'src', 'handlers', entry),
        handler: 'handler',
        projectRoot: BACKEND,
        depsLockFilePath: join(BACKEND, 'package-lock.json'),
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: options.timeout,
        memorySize: options.memorySize,
        description: options.description,
        // Set only when a value exists: an absent property means "unreserved", never 0.
        ...(options.reservedConcurrency !== undefined ? { reservedConcurrentExecutions: options.reservedConcurrency } : {}),
        environment: options.environment,
        logGroup: new logs.LogGroup(this, `${name}Logs`, { retention: logs.RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY }),
        bundling: {
          format: nodejs.OutputFormat.ESM,
          target: 'node22',
          minify: true,
          sourceMap: true,
          // Bundle the SDK versions the code was tested with, not whichever the runtime ships.
          externalModules: [],
          mainFields: ['module', 'main'],
          banner: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
        },
      });

    this.api = fn('Api', 'lambda-api.ts', {
      timeout: Duration.seconds(90),
      memorySize: 1024,
      description: 'The help center API: /api/ask.',
      environment: apiEnvironment,
      reservedConcurrency: props.apiReservedConcurrency,
    });
    this.ingest = fn('Ingest', 'lambda-ingest.ts', {
      timeout: Duration.minutes(10),
      memorySize: 1024,
      description: 'Loads the published corpus into the database.',
      environment: ingestEnvironment,
    });
    const migrate = fn('Migrate', 'lambda-migrate.ts', {
      timeout: Duration.minutes(10),
      memorySize: 512,
      description: 'Applies the database migrations during deployment.',
      environment: database,
    });
    const maintenance = fn('Maintenance', 'lambda-maintenance.ts', {
      timeout: Duration.minutes(2),
      memorySize: 512,
      description: 'Deletes old counters and events.',
      environment: database,
    });

    for (const handler of [this.api, this.ingest, migrate, maintenance]) this.cluster.grantDataApiAccess(handler);

    if (embeddings.provider === 'bedrock') {
      const model = stack.formatArn({ service: 'bedrock', account: '', resource: 'foundation-model', resourceName: embeddings.modelId });
      for (const handler of [this.api, this.ingest]) {
        handler.addToRolePolicy(new iam.PolicyStatement({ sid: 'Embeddings', actions: ['bedrock:InvokeModel'], resources: [model] }));
      }
    }
    if (writer.provider === 'bedrock') {
      this.api.addToRolePolicy(
        new iam.PolicyStatement({
          sid: 'ClaudeOnBedrock',
          // The Messages API endpoint (bedrock-mantle) authorises inference on the account's project.
          actions: ['bedrock-mantle:CreateInference'],
          resources: [stack.formatArn({ service: 'bedrock-mantle', resource: 'project', resourceName: '*' })],
        }),
      );
      this.api.addToRolePolicy(
        new iam.PolicyStatement({
          sid: 'ModelSubscriptionOnFirstUse',
          // Bedrock enables a third-party model for an account on its first call by creating an AWS Marketplace
          // subscription as the caller. Granted only for calls Bedrock itself makes for this function.
          actions: ['aws-marketplace:Subscribe', 'aws-marketplace:ViewSubscriptions'],
          resources: ['*'],
          conditions: { StringEquals: { 'aws:CalledViaLast': `bedrock-mantle.${stack.urlSuffix}` } },
        }),
      );
    }
    this.ingest.addToRolePolicy(new iam.PolicyStatement({ sid: 'ReadCorpus', actions: ['s3:GetObject'], resources: [props.bucket.arnForObjects(CORPUS_KEY)] }));

    // Every upload of the site uploads the corpus; its arrival triggers ingestion.
    props.bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(this.ingest), { prefix: 'help/', suffix: 'corpus.json' });

    new events.Rule(this, 'Daily', {
      description: 'Daily clean-up of old counters and question events.',
      schedule: events.Schedule.cron({ minute: '17', hour: '3' }),
      targets: [new eventTargets.LambdaFunction(maintenance)],
    });

    // Migrations run inside the deployment: a failure fails the deployment.
    const migrator = new cr.Provider(this, 'MigrationProvider', { onEventHandler: migrate });
    const schema = new CustomResource(this, 'Schema', {
      serviceToken: migrator.serviceToken,
      properties: { Migrations: migrationsHash() },
      resourceType: 'Custom::HelpCenterSchema',
    });
    schema.node.addDependency(this.cluster);
    this.api.node.addDependency(schema);

    const url = this.api.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM });
    // x-amz-content-sha256 (the body hash the OAC signature of a POST needs) is not listed: CloudFront reads it itself.
    const apiRequests = new cloudfront.OriginRequestPolicy(this, 'ApiRequests', {
      comment: 'The help center API: the visitor address CloudFront saw, the browser origin and the content type.',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('CloudFront-Viewer-Address', 'Origin', 'Content-Type'),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
    });
    props.distribution.addBehavior('/api/*', origins.FunctionUrlOrigin.withOriginAccessControl(url, { readTimeout: Duration.seconds(60) }), {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: apiRequests,
      responseHeadersPolicy: props.responseHeadersPolicy,
      compress: true,
    });

    new CfnOutput(stack, 'IngestFunction', {
      value: this.ingest.functionName,
      description: 'Loads the uploaded corpus; invoke with {"action":"ingest"} to load it by hand.',
    });
    new CfnOutput(stack, 'DatabaseCluster', { value: this.cluster.clusterArn, description: 'Aurora PostgreSQL cluster (Data API enabled).' });
  }
}
