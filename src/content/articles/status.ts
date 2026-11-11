import { capabilities } from '../status';
import type { Article } from '../types';

/** The delivery-status article is the status table itself: one section per row, written from `status.ts`. */
export const DELIVERY_STATUS_SLUG = 'delivery-status';

export const statusArticles: Article[] = [
  {
    slug: DELIVERY_STATUS_SLUG,
    group: 'status',
    title: { en: 'Delivery status at a glance', tr: 'Teslim durumu: genel bakış' },
    summary: {
      en: 'Every capability with its state, and what that state means.',
      tr: 'Her yetenek, durumu ve bu durumun anlamıyla birlikte.',
    },
    readme: ['§7'],
    sections: capabilities.map((capability) => ({
      id: capability.id,
      heading: capability.name,
      paragraphs: [
        { en: `${capability.name.en}: ${capability.state.en}.`, tr: `${capability.name.tr}: ${capability.state.tr}.` },
        { en: `${capability.meaning.en}.`, tr: `${capability.meaning.tr}.` },
      ],
    })),
  },
  {
    slug: 'what-is-not-claimed',
    group: 'status',
    title: { en: 'What is not claimed', tr: 'Neler iddia edilmiyor' },
    summary: {
      en: 'The certifications, tests and deployments that do not exist, and the boundaries that follow.',
      tr: 'Var olmayan sertifikalar, testler ve dağıtımlar ile bunlardan doğan sınırlar.',
    },
    readme: ['§7', '§9'],
    sections: [
      {
        id: 'not-claimed',
        heading: { en: 'Not claimed', tr: 'İddia edilmeyenler' },
        paragraphs: [
          {
            en: 'No customer deployment, penetration test, SLA, user-acceptance test, statutory accounting certification or healthcare certification exists, and none is claimed.',
            tr: 'Hiçbir müşteri dağıtımı, sızma testi, SLA, kullanıcı kabul testi, yasal muhasebe sertifikası veya sağlık sertifikası yoktur ve hiçbiri iddia edilmez.',
          },
        ],
      },
      {
        id: 'test-counts',
        heading: { en: 'Test counts', tr: 'Test sayıları' },
        paragraphs: [
          {
            en: 'Test counts are static declarations, not a record of executed runs.',
            tr: 'Test sayıları statik tanımlardır, çalıştırılmış koşuların kaydı değildir.',
          },
        ],
      },
      {
        id: 'boundaries',
        heading: { en: 'Boundaries in the delivery status', tr: 'Teslim durumundaki sınırlar' },
        paragraphs: [
          {
            en: 'Integrations with hotel, hospital, ERP and bank-feed systems are contracts only: preview-then-draft paths exist, and nothing is connected.',
            tr: 'Otel, hastane, ERP ve banka akışı sistemleriyle entegrasyonlar yalnızca sözleşme düzeyindedir: önizleme-sonra-taslak yolları vardır ve hiçbir şey bağlı değildir.',
          },
          {
            en: 'The platform runs as a single instance: quotas and caps are per process, sized for single-instance App Services.',
            tr: 'Platform tek örnek olarak çalışır: kotalar ve sınırlar süreç başınadır ve tek örnekli App Service’lere göre boyutlandırılmıştır.',
          },
        ],
      },
      {
        id: 'connecting-real-systems',
        heading: { en: 'Connecting real systems', tr: 'Gerçek sistemlere bağlanmak' },
        paragraphs: [
          {
            en: 'Connecting a real hotel, ERP, hospital or banking system is scoped integration work with its own testing and compliance obligations.',
            tr: 'Gerçek bir otel, ERP, hastane veya bankacılık sistemine bağlanmak; kendi test ve uyum yükümlülükleri olan, kapsamı belirli bir entegrasyon işidir.',
          },
        ],
      },
    ],
  },
];
