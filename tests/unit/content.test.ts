import { describe, expect, it } from 'vitest';
import { articles } from '@/content/articles';
import { capabilities } from '@/content/status';
import { articleGroups } from '@/content/types';
import { en } from '@/i18n/dictionaries/en';
import { tr } from '@/i18n/dictionaries/tr';
import { findProblems } from '../../scripts/check-public.mjs';

type Pair = { path: string; en: string; tr: string };

/** Every `{ en, tr }` text pair anywhere inside a value. */
function localizedPairs(value: unknown, path = ''): Pair[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => localizedPairs(item, `${path}[${index}]`));
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 2 && typeof record.en === 'string' && typeof record.tr === 'string') return [{ path, en: record.en, tr: record.tr }];
    return keys.flatMap((key) => localizedPairs(record[key], path ? `${path}.${key}` : key));
  }
  return [];
}

describe('bilingual content', () => {
  const pairs = localizedPairs({ articles, capabilities });

  it('has every text in both languages, trimmed', () => {
    expect(pairs.length).toBeGreaterThan(300);
    for (const pair of pairs) {
      expect(pair.en.trim(), pair.path).not.toBe('');
      expect(pair.tr.trim(), pair.path).not.toBe('');
      expect(pair.en, pair.path).toBe(pair.en.trim());
      expect(pair.tr, pair.path).toBe(pair.tr.trim());
    }
  });

  it('has no sentence left untranslated', () => {
    const untranslated = pairs.filter((pair) => pair.en.length > 30 && pair.en === pair.tr).map((pair) => pair.path);
    expect(untranslated).toEqual([]);
  });

  it('carries no contact details, URLs or domain names', () => {
    for (const pair of pairs) expect(findProblems(`${pair.en}\n${pair.tr}`), pair.path).toEqual([]);
  });

  it('calls the platform "the platform" and speaks of its author in the third person', () => {
    for (const pair of pairs) expect(pair.en, pair.path).not.toMatch(/\b(I|my|me|we|our)\b/);
  });
});

describe('articles', () => {
  it('are 24, with unique kebab-case slugs, in every group', () => {
    expect(articles).toHaveLength(24);
    const slugs = articles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const group of articleGroups) expect(articles.some((article) => article.group === group), group).toBe(true);
  });

  it('have unique kebab-case section anchors, each with some text', () => {
    for (const article of articles) {
      const ids = article.sections.map((section) => section.id);
      expect(new Set(ids).size, article.slug).toBe(ids.length);
      for (const section of article.sections) {
        expect(section.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect((section.paragraphs?.length ?? 0) + (section.items?.length ?? 0), `${article.slug}#${section.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('end every paragraph and item with a full stop, so each is a sentence the assistant can quote', () => {
    for (const article of articles) {
      for (const section of article.sections) {
        for (const text of [...(section.paragraphs ?? []), ...(section.items ?? [])]) {
          expect(text.en, `${article.slug}#${section.id}`).toMatch(/\.$/);
          expect(text.tr, `${article.slug}#${section.id}`).toMatch(/\.$/);
        }
      }
    }
  });
});

describe('interface dictionaries', () => {
  const shape = (value: unknown): unknown =>
    Array.isArray(value) ? value.map(shape) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)])) : typeof value;

  it('have the same keys and list lengths in both languages', () => {
    expect(shape(tr)).toEqual(shape(en));
  });

  it('keep the same placeholders in both languages', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === 'string' && typeof b === 'string') expect(placeholders(b), path).toEqual(placeholders(a));
      else if (a && typeof a === 'object') for (const key of Object.keys(a)) walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
    };
    walk(en, tr, 'dict');
  });
});
