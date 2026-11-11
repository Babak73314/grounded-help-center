import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { AssistantConfig, Limits } from './config';
import type { SqlClient } from './db/sql';
import { HashingEmbedder } from './embeddings/hashing';
import { TitanEmbedder } from './embeddings/titan';
import type { Embedder } from './embeddings/types';
import { BedrockAnswerModel } from './models/bedrock';
import { ExtractiveAnswerModel } from './models/extractive';
import type { AnswerModel } from './models/types';

/** Everything the API needs, so tests, the local server and Lambda each pass their own database. */
export interface Services {
  db: SqlClient;
  embedder: Embedder;
  model: AnswerModel;
  limits: Limits;
  /** Origins a browser request may come from; empty checks none. */
  allowedOrigins: readonly string[];
}

export function buildEmbedder(config: AssistantConfig): Embedder {
  const embeddings = config.embeddings;
  return embeddings.provider === 'bedrock'
    ? new TitanEmbedder(embeddings.modelId, new BedrockRuntimeClient({ region: embeddings.region }))
    : new HashingEmbedder();
}

export function buildModel(config: AssistantConfig): AnswerModel {
  const model = config.model;
  return model.provider === 'bedrock'
    ? new BedrockAnswerModel({ region: model.region, modelId: model.modelId, fallbackModelId: model.fallbackModelId, effort: model.effort })
    : new ExtractiveAnswerModel();
}

/** A structured log line. Never the visitor's question or address. */
export function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...fields }));
}
