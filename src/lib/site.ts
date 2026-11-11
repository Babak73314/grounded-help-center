import type { Locale } from '@/i18n/config';

/** The help center's name as it is written on every page. */
export const SITE_NAME = { en: 'Help Center', tr: 'Yardım Merkezi' } as const;

/**
 * A path inside one language, always ending in a slash — the form the static
 * export writes to disk (`/en/articles/x/` → `/en/articles/x/index.html`).
 */
export function localePath(locale: Locale, path = '/'): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? `/${locale}/` : `/${locale}/${trimmed}/`;
}

export function articlePath(locale: Locale, slug: string, section?: string): string {
  return `${localePath(locale, `/articles/${slug}`)}${section ? `#${section}` : ''}`;
}

/** The source of every article, on GitHub. */
export const SOURCE_REPOSITORY = 'https://github.com/Babak73314/ai-platform-architecture';
