'use client';

import { ArrowUpRight, Loader2, Send } from 'lucide-react';
import { Fragment, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { postJsonWhileWarming } from '@/lib/api-client';

type AskLabels = Dictionary['ask'];

interface AskLink {
  label: string;
  url: string;
}

interface AskSource extends AskLink {
  n: number;
}

/** What `/api/ask` returns; mirrors `AskAnswer` in the backend. */
export interface AskAnswer {
  kind: 'status' | 'grounded' | 'out-of-scope' | 'not-covered' | 'withheld' | 'busy';
  writes?: 'quote' | 'model';
  text: string;
  sources: AskSource[];
  links: AskLink[];
}

/** Where the answer came from, said plainly above it. */
function provenance(answer: AskAnswer, labels: AskLabels): string {
  switch (answer.kind) {
    case 'status':
      return labels.byStatus;
    case 'grounded':
      return answer.writes === 'model' ? labels.byModel : labels.byQuote;
    case 'out-of-scope':
    case 'not-covered':
      return labels.refused;
    case 'withheld':
      return labels.withheld;
    case 'busy':
      return labels.busy;
  }
}

/** The answer's text with each `[n]` turned into a link to the section it cites; everything else stays plain text. */
function withCitations(text: string, sources: readonly AskSource[], citationLabel: string): ReactNode[] {
  return text.split(/(\[\d{1,2}\])/).map((part, index) => {
    const match = /^\[(\d{1,2})\]$/.exec(part);
    const source = match ? sources.find((candidate) => candidate.n === Number(match[1])) : undefined;
    if (!source) return <Fragment key={index}>{part}</Fragment>;
    return (
      <a
        key={index}
        href={source.url}
        aria-label={citationLabel.replace('{n}', String(source.n)).replace('{title}', source.label)}
        className="mx-0.5 inline-flex min-w-6 items-center justify-center rounded-md bg-accent-soft px-1 align-baseline font-mono text-xs font-semibold text-accent hover:bg-accent hover:text-accent-ink"
      >
        {source.n}
      </a>
    );
  });
}

export function AskAssistant({ locale, labels }: { locale: 'en' | 'tr'; labels: AskLabels }) {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<'idle' | 'asking' | 'warming'>('idle');
  const busy = phase !== 'idle';
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const inFlight = useRef<AbortController | null>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed.length > 400) {
      setError(labels.invalid);
      return;
    }
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setPhase('asking');
    setError(null);
    setAnswer(null);
    try {
      const response = await postJsonWhileWarming<{ answer?: AskAnswer }>(
        '/api/ask',
        { question: trimmed, locale },
        { signal: controller.signal, onWarming: () => setPhase('warming') },
      );
      if (response.status === 200 && response.body?.answer) setAnswer(response.body.answer);
      else if (response.status === 429) setError(labels.rateLimited.replace('{minutes}', String(Math.max(1, Math.ceil((response.retryAfter ?? 60) / 60)))));
      else if (response.status === 400) setError(labels.invalid);
      else setError(labels.unavailable);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError(labels.unavailable);
    } finally {
      if (inFlight.current === controller) setPhase('idle');
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor={inputId} className="text-sm font-semibold text-fg">
          {labels.label}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            name="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={400}
            placeholder={labels.placeholder}
            autoComplete="off"
            className="h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-4 text-[15px] text-fg placeholder:text-faint focus:border-accent focus:outline-none sm:flex-1"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            {busy ? <Loader2 aria-hidden="true" className="size-[18px] animate-spin" /> : <Send aria-hidden="true" className="size-[18px]" />}
            {labels.submit}
          </button>
        </div>
      </form>

      <div>
        <p className="text-sm text-muted">{labels.suggestions}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {labels.suggested.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => {
                  setQuestion(suggestion);
                  void ask(suggestion);
                }}
                className="rounded-full border border-line px-3.5 py-2 text-left text-sm text-muted transition-colors hover:border-accent hover:text-fg"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <section aria-live="polite" aria-busy={busy} aria-label={labels.answer} className="min-h-6">
        {busy && <p className="text-muted">{phase === 'warming' ? labels.warming : labels.asking}</p>}
        {error && (
          <p role="alert" className="rounded-xl border border-line bg-surface p-4 text-fg">
            {error}
          </p>
        )}
        {answer && (
          <article className="rounded-2xl border border-line bg-surface p-6">
            <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted">{provenance(answer, labels)}</p>
            <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed text-fg">{withCitations(answer.text, answer.sources, labels.citation)}</p>
            {answer.sources.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-fg">{labels.sources}</h3>
                <ol className="mt-2 flex flex-col gap-1.5">
                  {answer.sources.map((source) => (
                    <li key={source.n} className="flex gap-2 text-[15px]">
                      <span className="font-mono text-xs text-muted">[{source.n}]</span>
                      <a href={source.url} className="text-accent underline-offset-4 hover:underline">
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {answer.links.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-fg">{labels.pages}</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {answer.links.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} className="inline-flex items-center gap-1 text-[15px] text-accent underline-offset-4 hover:underline">
                        {link.label}
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        )}
      </section>
    </div>
  );
}
