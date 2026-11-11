import type { ReactNode } from 'react';

/**
 * Every real page lives under `[locale]`, whose layout renders <html lang>.
 * This root layout only passes its children through, so the language of a
 * page is in its static HTML rather than patched in by script.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
