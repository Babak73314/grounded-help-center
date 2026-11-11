import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3Event } from 'aws-lambda';
import { loadAssistantConfig, loadDataApiTarget, required } from '../config';
import { DataApiClient } from '../db/data-api';
import { ingest, type IngestReport } from '../ingest';
import { buildEmbedder, log } from '../services';

const s3 = new S3Client({});

/**
 * Loads the published `help/corpus.json` into the database. It runs when a
 * new corpus is uploaded with the site (an S3 event), and can be invoked by
 * hand with `{ "action": "ingest" }`.
 */
export async function handler(event: S3Event | { action: 'ingest' }): Promise<IngestReport> {
  const bucket = required(process.env, 'CORPUS_BUCKET');
  const key = required(process.env, 'CORPUS_KEY');
  const isS3 = 'Records' in event;
  if (isS3 && !event.Records.some((record) => record.s3.object.key === key)) throw new Error('The event does not concern the corpus.');
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const text = await object.Body?.transformToString('utf-8');
  if (!text) throw new Error('The corpus object is empty.');
  const report = await ingest(new DataApiClient(loadDataApiTarget()), JSON.parse(text) as unknown, buildEmbedder(loadAssistantConfig()));
  log('ingest', { trigger: isS3 ? 's3' : 'manual', ...report });
  return report;
}
