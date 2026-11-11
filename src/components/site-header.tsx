import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath } from '@/lib/site';
import { LanguageSwitcher } from './language-switcher';

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href={localePath(locale)} aria-label={dict.nav.home} className="flex items-center gap-2.5 font-semibold text-fg">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-accent font-mono text-sm text-accent">
            ?
          </span>
          <span>{dict.meta.title}</span>
        </Link>
        <nav aria-label={dict.nav.articles} className="flex items-center gap-2 sm:gap-4">
          <Link href={localePath(locale)} className="hidden px-2 py-2 text-[15px] text-muted hover:text-fg sm:inline">
            {dict.nav.articles}
          </Link>
          <Link href={localePath(locale, '/ask')} className="rounded-xl bg-accent px-4 py-2 text-[15px] font-semibold text-accent-ink hover:bg-accent-hover">
            {dict.nav.ask}
          </Link>
          <LanguageSwitcher locale={locale} label={dict.nav.language} />
        </nav>
      </div>
    </header>
  );
}
