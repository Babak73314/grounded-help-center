import type { Dictionary } from '@/i18n/dictionaries';
import { SOURCE_REPOSITORY } from '@/lib/site';

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl">{dict.footer.note}</p>
        <a href={SOURCE_REPOSITORY} className="text-accent underline-offset-4 hover:underline">
          {dict.footer.source}
        </a>
      </div>
    </footer>
  );
}
