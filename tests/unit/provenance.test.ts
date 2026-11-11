import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { articles } from '@/content/articles';
import { namedTechnologies, unnamedTechnologies } from '@/content/glossary';
import { SOURCE } from '@/content/source/source';
import { capabilities } from '@/content/status';
import { statusLabels } from '@/content/types';
import { locales } from '@/i18n/config';
import { sectionText } from '@/lib/corpus';

/**
 * The articles say only what the architecture overview says. These tests
 * hold every number, technology name and status label in every article — in
 * both languages — to the pinned copy of the overview.
 */
const overview = readFileSync(new URL('../../src/content/source/architecture-overview.md', import.meta.url), 'utf8');

/** All the text of every article in one language: title, summary and sections. */
function articleText(locale: (typeof locales)[number]): string[] {
  return articles.map((article) =>
    [article.title[locale], article.summary[locale], ...article.sections.flatMap((section) => [section.heading[locale], sectionText(section, locale)])].join('\n'),
  );
}

const fold = (text: string) => text.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const hasTerm = (text: string, term: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${fold(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}]|\\.[\\p{L}\\p{N}])`, 'u').test(fold(text));
/** "228,000" and "228.000" are the same number. */
const numbersIn = (text: string) => [...text.matchAll(/(?<![\p{L}\p{N}])\d{1,3}(?:[.,]\d{3})+(?!\d)|(?<![\p{L}\p{N}.,])\d+(?![\p{L}\p{N}])/gu)].map((match) => match[0].replace(/[.,]/g, ''));

describe('the pinned architecture overview', () => {
  it('is the file recorded in source.ts, unchanged', () => {
    expect(createHash('sha256').update(readFileSync(new URL('../../src/content/source/architecture-overview.md', import.meta.url))).digest('hex')).toBe(SOURCE.sha256);
    expect(SOURCE.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('the articles', () => {
  const overviewNumbers = new Set(numbersIn(overview));

  for (const locale of locales) {
    it(`use only numbers the overview states (${locale})`, () => {
      for (const [index, text] of articleText(locale).entries()) {
        const unknown = numbersIn(text).filter((number) => !overviewNumbers.has(number));
        expect(unknown, articles[index]!.slug).toEqual([]);
      }
    });

    it(`name only technologies the overview names (${locale})`, () => {
      for (const [index, text] of articleText(locale).entries()) {
        for (const term of [...namedTechnologies, ...unnamedTechnologies]) {
          const named = term.aliases.filter((alias) => hasTerm(text, alias));
          if (named.length > 0) expect(named.some((alias) => hasTerm(overview, alias)), `${articles[index]!.slug}: ${term.label}`).toBe(true);
        }
      }
    });
  }

  it('write every status label as the overview writes it, and use no other', () => {
    for (const label of statusLabels) expect(overview).toContain(`**${label}**`);
    for (const text of [...articleText('en'), ...articleText('tr')]) {
      for (const match of text.matchAll(/\b[A-Z]{3,}(?: [A-Z]{2,})*\b/g)) {
        if (/^(LIVE|DEMO|LOCAL|OFF BY DEFAULT)$/.test(match[0])) continue;
        // Other capitals are acronyms the overview uses: CI, SLA, ERP, OIDC, HSTS, CSV, XLSX, PASS, FAIL, NOT RUN, BLOCKED…
        expect(overview, match[0]).toContain(match[0]);
      }
    }
  });

  it('cite only sections of the overview that exist', () => {
    const sections = new Set([...overview.matchAll(/^## (\d+)\. /gm)].map((match) => `§${match[1]}`));
    for (const article of articles) for (const section of article.readme) expect(sections.has(section), `${article.slug} ${section}`).toBe(true);
  });
});

describe('the delivery-status table', () => {
  it('copies each capability’s state from the overview word for word', () => {
    for (const capability of capabilities) expect(overview, capability.id).toContain(`| ${capability.state.en} |`);
  });

  it('gives each application article the label of its capability', () => {
    for (const capability of capabilities) {
      if (!capability.article) continue;
      const article = articles.find((candidate) => candidate.slug === capability.article)!;
      expect(capability.labels, capability.id).toContain(article.status);
    }
  });
});

describe('the glossary', () => {
  it('lists as named only technologies the overview names', () => {
    for (const term of namedTechnologies) expect(term.aliases.some((alias) => hasTerm(overview, alias)), term.label).toBe(true);
  });

  it('lists as unnamed only technologies neither the overview nor any article names', () => {
    const everything = [overview, ...articleText('en'), ...articleText('tr')].join('\n');
    for (const term of unnamedTechnologies) expect(term.aliases.some((alias) => hasTerm(everything, alias)), term.label).toBe(false);
  });
});
