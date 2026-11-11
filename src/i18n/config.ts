/**
 * The two languages the help center is published in. English is the default: it
 * is what `/` falls back to when a visitor's browser asks for neither language.
 */
export const locales = ['en', 'tr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'tr' : 'en';
}

/** Native names, shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
};

/** BCP 47 tags used for `og:locale` and date formatting. */
export const localeTags: Record<Locale, string> = {
  en: 'en_US',
  tr: 'tr_TR',
};

/**
 * A piece of text in both languages, side by side. Content is written as
 * pairs rather than as two separate files so that a sentence and its
 * translation can never drift apart unnoticed — a test fails the build if
 * either half is empty.
 */
export interface Localized<T = string> {
  en: T;
  tr: T;
}

export function pick<T>(value: Localized<T>, locale: Locale): T {
  return value[locale];
}
