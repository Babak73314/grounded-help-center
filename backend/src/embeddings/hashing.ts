import { createHash } from 'node:crypto';
import { stemSequence } from '../text';
import { EMBEDDING_DIMENSIONS, type Embedder } from './types';

/**
 * The local stand-in for an embedding model: feature hashing. Every word stem
 * of the text — each time it occurs — adds one to a slot chosen by its hash,
 * and the vector is normalised, so cosine distance in pgvector ranks passages
 * by the stems they share with the question and how much of the passage those
 * stems make up. Deterministic, free and offline.
 *
 * It knows no synonyms and no translation: "price" does not come near
 * "rate". That is what an embedding model adds; here retrieval leans on the
 * keyword half of the hybrid search instead.
 */
export class HashingEmbedder implements Embedder {
  readonly id = 'hashing-v1';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  calls = 0;

  async embed(text: string): Promise<number[]> {
    this.calls += 1;
    const vector = new Array<number>(this.dimensions).fill(0);
    for (const term of stemSequence(text)) {
      const digest = createHash('sha256').update(term).digest();
      vector[digest.readUInt16BE(0) % this.dimensions]! += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    // A text with no searchable word still needs a valid vector; one fixed slot gives it one.
    if (norm === 0) vector[0] = 1;
    return norm === 0 ? vector : vector.map((value) => value / norm);
  }
}
