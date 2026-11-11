import { z } from 'zod';
import type { Locale } from '../corpus';
import type { Source } from '../retrieval';

/**
 * What a writer returns: a JSON envelope, so the code reads fields rather
 * than guessing at prose. Claude produces it through structured output; the
 * local extractive writer builds it directly.
 */
export const draftSchema = z.object({
  answer: z.string(),
  citations: z.array(z.number().int()),
  confidence: z.enum(['high', 'partial', 'none']),
});

export type DraftEnvelope = z.infer<typeof draftSchema>;

export interface DraftRequest {
  question: string;
  locale: Locale;
  sources: readonly Source[];
  /** On the second attempt: the rules the first draft broke. */
  feedback?: readonly string[];
}

interface DraftUsage {
  /** What wrote the draft: `extractive`, or the model id that answered. */
  writer: string;
  inputTokens: number;
  outputTokens: number;
}

export type Draft = ({ kind: 'answer' } & DraftUsage & DraftEnvelope) | ({ kind: 'refused' } & DraftUsage) | ({ kind: 'malformed' } & DraftUsage);

export interface AnswerModel {
  /** `quote`: sentences copied from the passages by code. `model`: text written by a language model. */
  readonly writes: 'quote' | 'model';
  draft(request: DraftRequest): Promise<Draft>;
}
