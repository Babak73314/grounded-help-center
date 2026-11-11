import { buildHelpCorpus } from '@/lib/corpus';
import { corpusSchema, type Corpus } from '../src/corpus';

let cached: Corpus | undefined;

/** The real corpus, built from the site's content modules exactly as the site build writes it. */
export function helpCorpus(): Corpus {
  cached ??= corpusSchema.parse(JSON.parse(JSON.stringify(buildHelpCorpus())));
  return cached;
}
