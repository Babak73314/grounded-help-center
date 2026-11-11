# Deploying (not done)

The help center is **not deployed anywhere**. The AWS stack in `infra/` is
type-checked, unit-tested and synthesised in CI; it has never been deployed.
This page describes how it would be.

## What the stack creates

One CloudFormation stack (`infra/lib/help-center-stack.ts`):

- a private, encrypted S3 bucket for the static export, behind CloudFront with
  Origin Access Control, HTTPS only, HTTP/2 and HTTP/3, security headers and a
  small edge function (language redirect on `/`, directory index, trailing
  slash, canonical host);
- the assistant (`infra/lib/assistant.ts`): Aurora PostgreSQL Serverless v2
  with the Data API, in isolated subnets, pausing when idle; four Lambda
  functions outside the VPC (API, corpus ingestion, schema migration, daily
  clean-up); `/api/*` on the same distribution, to a function URL only
  CloudFront can call;
- a certificate and DNS records only when a domain is given.

It creates no deployment role, no budget and no e-mail sending.

## Configuration

Everything comes from the CDK context; nothing account-specific has a default.

| Context | Meaning |
|---|---|
| `domainName`, `hostedZoneId` | A custom domain and its Route 53 hosted zone (both or neither). With a domain, deploy to `us-east-1`, where CloudFront takes its certificates. |
| `modelProvider=bedrock`, `bedrockModelId` | Claude on Amazon Bedrock writes the answers. Without it, the local extractive writer does. |
| `bedrockFallbackModelId` | Optional: a model to retry on when the main one declines. |
| `embeddingProvider=bedrock`, `bedrockEmbeddingModelId` | Titan Text Embeddings V2 on Bedrock embeds the passages. Without it, the hashing embedder does. |
| `minCapacity`, `maxCapacity`, `autoPauseMinutes` | Aurora capacity (default 0–4 ACU, pause after 5 idle minutes). |
| `apiReservedConcurrency` | Reserved concurrency of the API function (default 10; `none` to leave it unreserved). |
| `draftsPerDay` | Answers the writer may draft per day, for everyone (default 100). |
| `stackName` | Default `GroundedHelpCenter`. |

The code was written against the Bedrock model ids `anthropic.claude-opus-5-5`
(answers) and `amazon.titan-embed-text-v2:0` (embeddings, 1024 dimensions);
neither has been called from this repository.

## Steps

```bash
npm run build                                # the static export, with out/help/corpus.json
cd infra
npx cdk deploy -c modelProvider=bedrock -c bedrockModelId=<id> \
  -c embeddingProvider=bedrock -c bedrockEmbeddingModelId=<id>
```

Then upload `out/` to the bucket the stack prints (`BucketName`) and
invalidate the distribution (`DistributionId`). The upload of
`help/corpus.json` triggers the ingest function, which embeds the passages;
the API answers once it has run.

With Bedrock, the account must have access to the models in its region, and
the first call to a third-party model may create its AWS Marketplace
subscription (the API function is allowed to, only through Bedrock).

## Switching the Bedrock path on locally

The same switches work on the local server, with AWS credentials in the
environment:

```bash
MODEL_PROVIDER=bedrock BEDROCK_MODEL_ID=<id> AWS_REGION=<region> npm start
```

`EMBEDDING_PROVIDER=bedrock` with `BEDROCK_EMBEDDING_MODEL_ID` changes the
embedder too; every passage is then embedded again on start, because the
embedder's id is part of each passage's hash.
