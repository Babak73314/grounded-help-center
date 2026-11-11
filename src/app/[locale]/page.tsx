import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { articlesIn } from '@/content/articles';
import { articleGroups, statusLabels } from '@/content/types';
import { isLocale } from '@/i18n/config';
import { format, getDictionary } from '@/i18n/dictionaries';
import { articlePath, localePath } from '@/lib/site';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="container-page pt-14 sm:pt-20">
      <p className="eyebrow">{dict.home.eyebrow}</p>
      <h1 className="mt-2 max-w-3xl text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em]">{dict.home.title}</h1>
      <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-muted">{dict.home.lede}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="ask-title" className="rounded-2xl border border-line bg-surface p-6">
          <h2 id="ask-title" className="text-lg font-semibold">
            {dict.home.askTitle}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{dict.home.askText}</p>
          <Link href={localePath(locale, '/ask')} className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-hover">
            {dict.home.askCta}
          </Link>
        </section>
        <section aria-labelledby="labels-title" className="rounded-2xl border border-line bg-surface p-6">
          <h2 id="labels-title" className="text-lg font-semibold">
            {dict.home.statusTitle}
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {statusLabels.map((label) => (
              <li key={label} className="flex items-center gap-3 text-[15px] text-muted">
                <StatusBadge label={label} meaning={dict.status[label]} />
                <span aria-hidden="true">{dict.status[label]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {articleGroups.map((group) => {
        const articles = articlesIn(group);
        return (
          <section key={group} aria-labelledby={`group-${group}`} className="mt-14">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <h2 id={`group-${group}`} className="text-xl font-semibold tracking-[-0.01em]">
                {dict.home.groups[group]}
              </h2>
              <span className="text-sm text-muted">{format(dict.home.articles, { count: articles.length })}</span>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link href={articlePath(locale, article.slug)} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent">
                    <span className="font-semibold leading-snug text-fg">{article.title[locale]}</span>
                    <span className="text-[15px] leading-relaxed text-muted">{article.summary[locale]}</span>
                    {article.status && (
                      <span className="mt-auto pt-1">
                        <StatusBadge label={article.status} meaning={dict.status[article.status]} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
