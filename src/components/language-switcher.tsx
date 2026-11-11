'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeNames, locales, type Locale } from '@/i18n/config';
import { PREFERRED_LOCALE_KEY, switchLocalePath } from '@/lib/locale-path';

/**
 * Remembers the choice for the next visit to `/`: in local storage for the
 * static fallback page, and in a first-party cookie for the CDN's redirect.
 * It holds only "en" or "tr" and is never sent anywhere else.
 */
function rememberLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(PREFERRED_LOCALE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the choice simply isn't remembered.
  }
  document.cookie = `${PREFERRED_LOCALE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** EN | TR — each link opens the same page in the other language. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}/`;
  return (
    <div role="group" aria-label={label} className="flex h-10 items-stretch overflow-hidden rounded-xl border border-line text-[13px] font-semibold">
      {locales.map((target) => {
        const current = target === locale;
        return (
          <Link
            key={target}
            href={switchLocalePath(pathname, target)}
            hrefLang={target}
            lang={target}
            aria-current={current ? 'true' : undefined}
            onClick={() => rememberLocale(target)}
            className={`flex items-center px-3 transition-colors ${current ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'}`}
          >
            {target.toUpperCase()}
            <span className="sr-only"> — {localeNames[target]}</span>
          </Link>
        );
      })}
    </div>
  );
}
