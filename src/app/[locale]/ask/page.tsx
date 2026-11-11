import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AskAssistant } from '@/components/ask-assistant';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.ask.title, description: dict.ask.lede };
}

export default async function AskPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="container-page pt-14 sm:pt-20">
      <p className="eyebrow">{dict.ask.eyebrow}</p>
      <h1 className="mt-2 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em]">{dict.ask.title}</h1>
      <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-muted">{dict.ask.lede}</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <AskAssistant locale={locale} labels={dict.ask} />
        <aside aria-labelledby="how-title" className="self-start rounded-2xl border border-line bg-surface p-6">
          <h2 id="how-title" className="text-lg font-semibold">
            {dict.ask.howTitle}
          </h2>
          <ol className="mt-4 flex list-decimal flex-col gap-3 pl-5 text-[15px] leading-relaxed text-muted">
            {dict.ask.how.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
