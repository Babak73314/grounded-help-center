import type { AssistantSettings } from '../lib/assistant';

/**
 * Everything the stack is configured with comes from the CDK context
 * (`-c key=value`), and nothing account-specific has a default: no domain,
 * no hosted zone, no model id. With no context at all, the stack synthesises
 * a site on the distribution's own address and an assistant that runs the
 * local extractive writer and hashing embedder — no Amazon Bedrock.
 *
 *   domainName, hostedZoneId          a custom domain and its Route 53 zone (both or neither)
 *   modelProvider=bedrock             Claude on Bedrock writes the answers; needs bedrockModelId
 *   bedrockFallbackModelId            retried on a refusal (optional)
 *   embeddingProvider=bedrock         Titan embeddings; needs bedrockEmbeddingModelId
 *   minCapacity, maxCapacity          Aurora Serverless v2 ACUs (default 0 and 4: pauses when idle)
 *   autoPauseMinutes                  idle minutes before the pause (default 5)
 *   apiReservedConcurrency            reserved concurrency of the API function, or "none" (default 10)
 *   draftsPerDay                      answers the writer may draft per day, for everyone (default 100)
 */
export interface StackSettings {
  domainName?: string;
  hostedZoneId?: string;
  assistant: AssistantSettings;
}

type Context = (key: string) => string | undefined;

function number(get: Context, key: string, fallback: number): number {
  const raw = get(key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Context ${key} must be a number, got "${raw}".`);
  return value;
}

function provider(get: Context, key: string): 'local' | 'bedrock' {
  const raw = get(key) ?? 'local';
  if (raw !== 'local' && raw !== 'bedrock') throw new Error(`Context ${key} must be local or bedrock, got "${raw}".`);
  return raw;
}

function required(get: Context, key: string, why: string): string {
  const value = get(key);
  if (!value) throw new Error(`Context ${key} is required when ${why}.`);
  return value;
}

export function settingsFromContext(get: Context): StackSettings {
  const domainName = get('domainName');
  const hostedZoneId = get('hostedZoneId');
  if ((domainName === undefined) !== (hostedZoneId === undefined)) throw new Error('Give domainName and hostedZoneId together, or neither.');

  const fallbackModelId = get('bedrockFallbackModelId');
  const reserved = get('apiReservedConcurrency');
  return {
    ...(domainName ? { domainName, hostedZoneId } : {}),
    assistant: {
      writer:
        provider(get, 'modelProvider') === 'bedrock'
          ? { provider: 'bedrock', modelId: required(get, 'bedrockModelId', 'modelProvider is bedrock'), ...(fallbackModelId ? { fallbackModelId } : {}) }
          : { provider: 'local' },
      embeddings:
        provider(get, 'embeddingProvider') === 'bedrock'
          ? { provider: 'bedrock', modelId: required(get, 'bedrockEmbeddingModelId', 'embeddingProvider is bedrock') }
          : { provider: 'local' },
      minCapacity: number(get, 'minCapacity', 0),
      maxCapacity: number(get, 'maxCapacity', 4),
      autoPauseMinutes: number(get, 'autoPauseMinutes', 5),
      // "none" leaves the function unreserved, for an account whose Lambda quota cannot spare a reservation.
      ...(reserved?.toLowerCase() === 'none' ? {} : { apiReservedConcurrency: number(get, 'apiReservedConcurrency', 10) }),
      draftsPerDay: number(get, 'draftsPerDay', 100),
    },
  };
}
