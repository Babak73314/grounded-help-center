import { buildHelpCorpus } from '@/lib/corpus';

// Written once at build time to out/help/corpus.json, beside the articles it is built from.
export const dynamic = 'force-static';

export function GET(): Response {
  return Response.json(buildHelpCorpus());
}
