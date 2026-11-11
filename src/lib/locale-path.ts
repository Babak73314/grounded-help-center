import { isLocale, type Locale } from '@/i18n/config';

/**
 * The same page in another language: `/en/articles/x/` → `/tr/articles/x/`.
 * Works with or without a trailing slash, and on a path with no locale yet.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split(/[?#]/)[0]!.split('/').filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0]!)) {
    segments[0] = target;
  } else {
    segments.unshift(target);
  }
  return `/${segments.join('/')}/`;
}

/** Remembered so that `/` can send a returning visitor to the language they chose. */
export const PREFERRED_LOCALE_KEY = 'preferred-locale';
