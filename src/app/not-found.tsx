import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 · Help Center',
  robots: { index: false, follow: false },
};

/** Served for every unknown address. The language of a missing page is unknown, so it speaks both. */
export default function NotFound() {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <main className="container-page flex min-h-dvh flex-col justify-center py-20">
          <p className="font-mono text-sm text-accent">404</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-bold leading-tight tracking-[-0.03em]">Page not found</h1>
          <p lang="tr" className="mt-1 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold text-muted">
            Sayfa bulunamadı
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/en/" className="inline-flex h-12 items-center rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-hover">
              All articles
            </Link>
            <Link href="/tr/" lang="tr" hrefLang="tr" className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-5 font-semibold text-fg hover:border-accent">
              Tüm makaleler
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
