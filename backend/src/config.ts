/**
 * Everything the assistant reads from its environment, parsed once and
 * checked: a missing or malformed value fails at start-up with its name, not
 * later with an unrelated error.
 *
 * With no variables set, both the writer and the embedder are the local,
 * deterministic ones. `MODEL_PROVIDER=bedrock` and `EMBEDDING_PROVIDER=bedrock`
 * switch each, independently, to Amazon Bedrock; each then needs its model id
 * and `AWS_REGION`, and no default model id is assumed.
 */
export interface Limits {
  /** Questions per caller in ten minutes, and per day. */
  askPer10Minutes: number;
  askPerDay: number;
  /** Drafts the writer may produce per day, for everyone together. Over it, only code-written answers are given. */
  draftsPerDay: number;
}

export type ModelConfig =
  | { provider: 'local' }
  | { provider: 'bedrock'; region: string; modelId: string; fallbackModelId?: string; effort: 'low' | 'medium' | 'high' };

export type EmbeddingConfig = { provider: 'local' } | { provider: 'bedrock'; region: string; modelId: string };

export interface AssistantConfig {
  model: ModelConfig;
  embeddings: EmbeddingConfig;
  limits: Limits;
}

type Env = Record<string, string | undefined>;

function value(env: Env, name: string): string | undefined {
  const raw = env[name]?.trim();
  return raw ? raw : undefined;
}

export function required(env: Env, name: string, why?: string): string {
  const found = value(env, name);
  if (!found) throw new Error(`The environment variable ${name} is not set${why ? ` (${why})` : ''}.`);
  return found;
}

function integer(env: Env, name: string, fallback: number, min = 1, max = 100_000): number {
  const raw = value(env, name);
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a whole number, got "${raw}".`);
  const parsed = Number(raw);
  if (parsed < min || parsed > max) throw new Error(`${name} must be between ${min} and ${max}, got ${parsed}.`);
  return parsed;
}

function oneOf<T extends string>(env: Env, name: string, values: readonly T[], fallback: T): T {
  const raw = value(env, name);
  if (!raw) return fallback;
  if (!(values as readonly string[]).includes(raw)) throw new Error(`${name} must be one of ${values.join(', ')}, got "${raw}".`);
  return raw as T;
}

export function loadAssistantConfig(env: Env = process.env): AssistantConfig {
  const modelProvider = oneOf(env, 'MODEL_PROVIDER', ['local', 'bedrock'] as const, 'local');
  const embeddingProvider = oneOf(env, 'EMBEDDING_PROVIDER', ['local', 'bedrock'] as const, 'local');
  const region = () => required(env, 'AWS_REGION', 'Amazon Bedrock needs a region');
  const fallbackModelId = value(env, 'BEDROCK_FALLBACK_MODEL_ID');
  return {
    model:
      modelProvider === 'bedrock'
        ? {
            provider: 'bedrock',
            region: region(),
            modelId: required(env, 'BEDROCK_MODEL_ID', 'MODEL_PROVIDER is bedrock'),
            ...(fallbackModelId ? { fallbackModelId } : {}),
            effort: oneOf(env, 'MODEL_EFFORT', ['low', 'medium', 'high'] as const, 'low'),
          }
        : { provider: 'local' },
    embeddings:
      embeddingProvider === 'bedrock'
        ? { provider: 'bedrock', region: region(), modelId: required(env, 'BEDROCK_EMBEDDING_MODEL_ID', 'EMBEDDING_PROVIDER is bedrock') }
        : { provider: 'local' },
    limits: {
      askPer10Minutes: integer(env, 'LIMIT_ASK_PER_10_MINUTES', 10),
      askPerDay: integer(env, 'LIMIT_ASK_PER_DAY', 40),
      draftsPerDay: integer(env, 'LIMIT_DRAFTS_PER_DAY', 100),
    },
  };
}

/** The Aurora cluster behind the RDS Data API, in AWS. */
export function loadDataApiTarget(env: Env = process.env): { resourceArn: string; secretArn: string; database: string } {
  return {
    resourceArn: required(env, 'DB_CLUSTER_ARN'),
    secretArn: required(env, 'DB_SECRET_ARN'),
    database: required(env, 'DB_NAME'),
  };
}

/**
 * Origins a browser request may come from, comma-separated; a request from
 * any other origin is refused. Unset, no origin is checked — a cross-site
 * page still cannot post JSON without a CORS preflight, which the API never
 * grants.
 */
export function loadAllowedOrigins(env: Env = process.env): string[] {
  return (value(env, 'ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
