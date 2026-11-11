import type { Locale } from '../config';
import { en, type Dictionary } from './en';
import { tr } from './tr';

const dictionaries: Record<Locale, Dictionary> = { en, tr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Fills `{name}` placeholders. An unknown placeholder is left visible on purpose. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export type { Dictionary };
