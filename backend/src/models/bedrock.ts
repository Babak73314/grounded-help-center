import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import { BetaFallbackState, betaRefusalFallbackMiddleware } from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { systemPrompt, userPrompt } from './prompt';
import { draftSchema, type AnswerModel, type Draft, type DraftRequest } from './types';

/**
 * Claude on Amazon Bedrock (the Messages API endpoint, `bedrock-mantle`),
 * reached with the caller's IAM role — no key is stored anywhere. Used when
 * `MODEL_PROVIDER=bedrock`; the model id comes from `BEDROCK_MODEL_ID`.
 *
 * The model receives only the numbered passages retrieval found and the
 * question, both fenced as data, and must answer in a JSON envelope
 * (structured output). Its answer then goes through the answer check like
 * any other draft.
 */
export interface BedrockModelOptions {
  region: string;
  modelId: string;
  /** Retried, inside the same call, when the main model declines (`stop_reason: refusal`); unset switches it off. */
  fallbackModelId?: string;
  effort: 'low' | 'medium' | 'high';
}

/** The part of the client this class calls; tests pass a fake. */
export type BedrockMessagesClient = Pick<AnthropicBedrockMantle, 'beta'>;

export class BedrockAnswerModel implements AnswerModel {
  readonly writes = 'model' as const;
  private readonly client: BedrockMessagesClient;

  constructor(
    private readonly options: BedrockModelOptions,
    client?: BedrockMessagesClient,
  ) {
    this.client =
      client ??
      new AnthropicBedrockMantle({
        awsRegion: options.region,
        middleware: options.fallbackModelId ? [betaRefusalFallbackMiddleware([{ model: options.fallbackModelId }])] : [],
        maxRetries: 2,
        timeout: 45_000,
      });
  }

  async draft(request: DraftRequest): Promise<Draft> {
    const response = await this.client.beta.messages.parse(
      {
        model: this.options.modelId,
        max_tokens: 16_000,
        system: systemPrompt(request.locale),
        messages: [{ role: 'user', content: userPrompt(request) }],
        output_config: { effort: this.options.effort, format: betaZodOutputFormat(draftSchema) },
      },
      { fallbackState: new BetaFallbackState() },
    );
    const usage = { writer: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    if (response.stop_reason === 'refusal') return { kind: 'refused', ...usage };
    const parsed = response.parsed_output;
    if (response.stop_reason !== 'end_turn' || !parsed) return { kind: 'malformed', ...usage };
    return { kind: 'answer', ...usage, ...parsed };
  }
}
