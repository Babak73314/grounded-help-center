import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { EMBEDDING_DIMENSIONS, type Embedder } from './types';

/**
 * Amazon Titan Text Embeddings V2 on Amazon Bedrock: multilingual,
 * normalised vectors, so cosine distance compares meaning across English and
 * Turkish passages alike. Reached with the function's IAM role; no key is
 * stored anywhere. Used when `EMBEDDING_PROVIDER=bedrock`.
 */
export class TitanEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIMENSIONS;
  readonly id: string;

  constructor(
    private readonly modelId: string,
    private readonly client: Pick<BedrockRuntimeClient, 'send'> = new BedrockRuntimeClient({}),
  ) {
    this.id = `bedrock:${modelId}:${EMBEDDING_DIMENSIONS}`;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.send(
      new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ inputText: text.slice(0, 30_000), dimensions: this.dimensions, normalize: true }),
      }),
    );
    const parsed = JSON.parse(new TextDecoder().decode(response.body)) as { embedding?: unknown };
    const embedding = parsed.embedding;
    if (!Array.isArray(embedding) || embedding.length !== this.dimensions || embedding.some((value) => typeof value !== 'number')) {
      throw new Error(`The embedding model returned no ${this.dimensions}-dimension vector.`);
    }
    return embedding as number[];
  }
}
