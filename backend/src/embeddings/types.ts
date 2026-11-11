/** Turns text into a vector for pgvector. `id` names the embedder, so a change of embedder re-embeds every passage. */
export interface Embedder {
  readonly id: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}

/** The width of the `embedding` column (migration 001); both embedders write vectors of this size. */
export const EMBEDDING_DIMENSIONS = 1024;

/** Runs `work` over `items` with at most `limit` in flight, keeping the order of results. */
export async function mapLimited<T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}
