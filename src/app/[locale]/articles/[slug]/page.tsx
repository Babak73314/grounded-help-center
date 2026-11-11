import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { articles, getArticle } from '@/content/articles';
import { isLocale, locales } from '@/i18n/config';
import { format, getDictionary } from '@/i18n/dictionaries';
import { articlePath, localePath, SOURCE_REPOSITORY } from '@/lib/site';

type Params = Promise<{ locale: string; slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => articles.map((article) => ({ locale, slug: article.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!isLocale(locale) || !article) return {};
  return { title: article.title[locale], description: article.summary[locale] };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!isLocale(locale) || !article) notFound();
  const dict = getDictionary(locale);
  const index = articles.indexOf(article);
  const previous = articles[index - 1];
  const next = articles[index + 1];

  return (
    <div className="container-page pt-12 sm:pt-16">
      <Link href={localePath(locale)} className="text-sm text-accent underline-offset-4 hover:underline">
        ← {dict.article.allArticles}
      </Link>
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article>
          <p className="eyebrow">{dict.home.groups[article.group]}</p>
          <h1 className="mt-2 text-[clamp(1.875rem,3.4vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.03em]">{article.title[locale]}</h1>
          {article.status && (
            <p className="mt-4 flex items-center gap-3 text-[15px] text-muted">
              <span>{dict.article.status}:</span>
              <StatusBadge label={article.status} meaning={dict.status[article.status]} />
            </p>
          )}
          <p className="mt-4 text-[18px] leading-relaxed text-muted">{article.summary[locale]}</p>

          {article.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mt-10">
              <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-[-0.01em]">
                {section.heading[locale]}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph.en} className="mt-3 text-[17px] leading-relaxed">
                  {paragraph[locale]}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[17px] leading-relaxed">
                  {section.items.map((item) => (
                    <li key={item.en}>{item[locale]}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            {format(dict.article.source, { sections: article.readme.join(', ') })}{' '}
            <a href={SOURCE_REPOSITORY} className="text-accent underline underline-offset-4">
              {dict.article.sourceLink}
            </a>
          </p>

          <nav aria-label={dict.nav.articles} className="mt-8 grid gap-4 sm:grid-cols-2">
            {previous && (
              <Link href={articlePath(locale, previous.slug)} className="rounded-2xl border border-line bg-surface p-4 hover:border-accent">
                <span className="block text-sm text-muted">{dict.article.previous}</span>
                <span className="font-semibold">{previous.title[locale]}</span>
              </Link>
            )}
            {next && (
              <Link href={articlePath(locale, next.slug)} className="rounded-2xl border border-line bg-surface p-4 hover:border-accent sm:col-start-2">
                <span className="block text-sm text-muted">{dict.article.next}</span>
                <span className="font-semibold">{next.title[locale]}</span>
              </Link>
            )}
          </nav>
        </article>

        <aside className="self-start lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold">{dict.article.onThisPage}</h2>
          <ul className="mt-3 flex flex-col gap-2 border-l border-line pl-4 text-[15px]">
            {article.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted hover:text-fg">
                  {section.heading[locale]}
                </a>
              </li>
            ))}
          </ul>
          <Link href={localePath(locale, '/ask')} className="mt-6 inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-[15px] font-semibold hover:border-accent">
            {dict.article.askAbout}
          </Link>
        </aside>
      </div>
    </div>
  );
}
