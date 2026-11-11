import type { AnswerModel, Draft, DraftRequest } from '../src/models/types';

/** A writer that returns prepared drafts in order and records what it was asked — for testing everything around a model. */
export class ScriptedModel implements AnswerModel {
  readonly writes = 'model' as const;
  requests: DraftRequest[] = [];

  constructor(private readonly drafts: Draft[] = []) {}

  queue(...drafts: Draft[]): void {
    this.drafts.push(...drafts);
  }

  async draft(request: DraftRequest): Promise<Draft> {
    this.requests.push(request);
    const next = this.drafts.shift();
    if (!next) throw new Error('No more scripted drafts.');
    return next;
  }
}

export const draftOf = (answer: string, confidence: 'high' | 'partial' | 'none' = 'high'): Draft => ({
  kind: 'answer',
  writer: 'scripted-model',
  inputTokens: 1000,
  outputTokens: 100,
  answer,
  citations: [],
  confidence,
});
