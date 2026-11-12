import type { Article } from '../types';

export const dataSecurityArticles: Article[] = [
  {
    slug: 'data-and-audit',
    group: 'data-security',
    title: { en: 'Data ownership, concurrency and audit', tr: 'Veri sahipliği, eşzamanlılık ve denetim izi' },
    summary: {
      en: 'How data is separated per domain, how concurrent changes are protected, and what is audited.',
      tr: 'Verinin alanlara göre nasıl ayrıldığı, eşzamanlı değişikliklerin nasıl korunduğu ve nelerin denetim izine yazıldığı.',
    },
    readme: ['§2', '§5'],
    sections: [
      {
        id: 'data-ownership',
        heading: { en: 'Data ownership', tr: 'Veri sahipliği' },
        paragraphs: [
          {
            en: 'Separate domain contexts and schemas hold platform conversations, hotel operations, healthcare data, accounting, marketing and commerce. Each host may open only the database it is configured for.',
            tr: 'Platform konuşmaları, otel operasyonları, sağlık verileri, muhasebe, pazarlama ve e-ticaret ayrı alan bağlamlarında ve şemalarda tutulur. Her host yalnızca yapılandırıldığı veritabanını açabilir.',
          },
          {
            en: 'Each domain owns its DbContext, schema and migration history in EF Core 10, with SQL Server and Azure SQL.',
            tr: 'Her alan, SQL Server ve Azure SQL ile EF Core 10 üzerinde kendi DbContext’ine, şemasına ve migration geçmişine sahiptir.',
          },
        ],
      },
      {
        id: 'concurrency',
        heading: { en: 'Concurrency', tr: 'Eşzamanlılık' },
        paragraphs: [
          {
            en: 'Row-version checks protect edits, and unique constraints support duplicate detection. Financial and commerce operations use explicit transactions and database locking, proved on a real SQL Server engine in CI.',
            tr: 'Satır sürümü denetimleri düzenlemeleri korur, benzersizlik kısıtları da yinelenen kayıtların tespitine yardım eder. Finans ve e-ticaret işlemlerinde açıkça tanımlanmış veritabanı işlemleri ve kilitler kullanılır; bu, CI’da gerçek bir SQL Server motorunda kanıtlanmıştır.',
          },
        ],
      },
      {
        id: 'audit',
        heading: { en: 'Audit and observability', tr: 'Denetim izi ve gözlemlenebilirlik' },
        paragraphs: [
          {
            en: 'Ledger and marketing changes write append-only audit rows in the same transaction. Retrieval outcomes, validation events and model usage feed logs and administrative diagnostics.',
            tr: 'Muhasebe defteri ve pazarlama değişiklikleri, aynı işlem içinde yalnızca eklenebilen denetim satırları yazar. Erişim sonuçları, doğrulama olayları ve model kullanımı günlüklere ve yönetim tanılamalarına aktarılır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'security',
    group: 'data-security',
    title: { en: 'Authorization, request protection and secrets', tr: 'Yetkilendirme, istek koruması ve gizli bilgiler' },
    summary: {
      en: 'Who may do what, how anonymous surfaces are protected, and where secrets are kept.',
      tr: 'Kimin neyi yapabildiği, anonim yüzeylerin nasıl korunduğu ve gizli bilgilerin nerede tutulduğu.',
    },
    readme: ['§5'],
    sections: [
      {
        id: 'authorization',
        heading: { en: 'Authorization', tr: 'Yetkilendirme' },
        paragraphs: [
          {
            en: 'Staff services enforce access checks behind a shared admin sign-in. Finance resolves company membership on the server and applies company-scoped roles to every service operation; no tool schema can name a company.',
            tr: 'Personel servisleri ortak bir yönetici girişinin arkasında çalışır ve erişim denetimleri uygular. Finans tarafında şirket üyeliği sunucuda belirlenir ve her servis işlemine şirkete özgü roller uygulanır; hiçbir araç şeması bir şirketi adıyla belirtemez.',
          },
        ],
      },
      {
        id: 'request-protection',
        heading: { en: 'Request protection', tr: 'İstek koruması' },
        paragraphs: [
          {
            en: 'Every anonymous surface has signed visitor tokens, quotas and rate limits. The platform also uses antiforgery controls, HSTS, server-side knowledge-index allow-lists and guarded outbound requests.',
            tr: 'Her anonim yüzeyde imzalı ziyaretçi belirteçleri, kotalar ve istek sınırları vardır. Platform ayrıca sahteciliğe karşı denetimler, HSTS, sunucu tarafında bilgi dizini izin listeleri ve korumalı dış istekler kullanır.',
          },
          { en: 'Model keys never reach a browser.', tr: 'Model anahtarları hiçbir zaman bir tarayıcıya ulaşmaz.' },
        ],
      },
      {
        id: 'secrets',
        heading: { en: 'Secrets', tr: 'Gizli bilgiler' },
        paragraphs: [
          {
            en: 'Secrets are kept in Azure Key Vault, with managed identity where supported. Publish-output guards keep development settings out of release packages.',
            tr: 'Gizli bilgiler Azure Key Vault’ta tutulur; desteklendiği yerlerde yönetilen kimlik kullanılır. Yayın çıktısı korumaları, geliştirme ayarlarını sürüm paketlerinin dışında tutar.',
          },
        ],
      },
    ],
  },
];
