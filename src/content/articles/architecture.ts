import type { Article } from '../types';

export const architectureArticles: Article[] = [
  {
    slug: 'layers-and-dependency-rule',
    group: 'architecture',
    title: { en: 'The four layers and the dependency rule', tr: 'Dört katman ve bağımlılık kuralı' },
    summary: {
      en: 'How hosts, verticals, modules and the shared core fit together, and which may reference which.',
      tr: 'Host’ların, dikeylerin, modüllerin ve ortak çekirdeğin nasıl bir araya geldiği ve hangisinin hangisine referans verebileceği.',
    },
    readme: ['§3', '§7'],
    sections: [
      {
        id: 'layers',
        heading: { en: 'Four layers', tr: 'Dört katman' },
        paragraphs: [
          {
            en: 'Four layers separate reusable infrastructure, business domains, industry logic and executable applications. Only application hosts perform cross-layer composition.',
            tr: 'Dört katman; yeniden kullanılabilir altyapıyı, iş alanlarını, sektör mantığını ve çalıştırılabilir uygulamaları birbirinden ayırır. Katmanlar arası birleştirmeyi yalnızca uygulama host’ları yapar.',
          },
        ],
        items: [
          {
            en: 'Hosts are the executable applications: sales website, hotel, healthcare, real estate, accounting and commerce.',
            tr: 'Host’lar çalıştırılabilir uygulamalardır: satış web sitesi, otel, sağlık, gayrimenkul, muhasebe ve e-ticaret.',
          },
          {
            en: 'Verticals hold the industry logic: the sales persona and claim gate, the hotel rate engine and answer gate, the healthcare schedule and medical gate, the real-estate inventory and the accounting adapters.',
            tr: 'Dikeyler sektör mantığını taşır: satış personası ve iddia kapısı, otel fiyat motoru ve yanıt kapısı, sağlık takvimi ve tıbbi kapı, gayrimenkul envanteri ve muhasebe adaptörleri.',
          },
          {
            en: 'Modules are the business domains: marketing, the accounting ledger, the accounting AI extension, the accounting documents extension and commerce.',
            tr: 'Modüller iş alanlarıdır: pazarlama, muhasebe defteri, muhasebe yapay zekâ uzantısı, muhasebe belgeleri uzantısı ve e-ticaret.',
          },
          {
            en: 'The shared core holds entities and security; AI chat, retrieval and voice; the shared web sign-in and voice client; an optional agents engine; and messaging for notifications.',
            tr: 'Ortak çekirdekte varlıklar ve güvenlik; yapay zekâ sohbeti, erişim ve ses; ortak web oturum açma ve ses istemcisi; isteğe bağlı bir ajan motoru; ve bildirimler için mesajlaşma bulunur.',
          },
          {
            en: 'The external services, per deployment, are Azure OpenAI, Azure AI Search, SQL Server or Azure SQL, Key Vault, Blob Storage and Document Intelligence.',
            tr: 'Dağıtıma göre değişen dış servisler Azure OpenAI, Azure AI Search, SQL Server veya Azure SQL, Key Vault, Blob Storage ve Document Intelligence’dır.',
          },
        ],
      },
      {
        id: 'references',
        heading: { en: 'How the layers reference each other', tr: 'Katmanlar birbirine nasıl referans verir' },
        paragraphs: [
          {
            en: 'Hosts reference verticals, modules and the shared core; verticals reference modules and the shared core; modules reference the shared core. These are project references. The shared core reaches the external services through runtime service calls.',
            tr: 'Host’lar dikeylere, modüllere ve ortak çekirdeğe; dikeyler modüllere ve ortak çekirdeğe; modüller ortak çekirdeğe referans verir. Bunlar proje referanslarıdır. Ortak çekirdek dış servislere çalışma zamanındaki servis çağrılarıyla ulaşır.',
          },
        ],
      },
      {
        id: 'dependency-rule',
        heading: { en: 'The dependency rule', tr: 'Bağımlılık kuralı' },
        paragraphs: [
          {
            en: 'The direction of every project reference is fixed and enforced by tests. This is what keeps the core shared: a module that referenced a vertical would become that customer’s module.',
            tr: 'Her proje referansının yönü sabittir ve testlerle zorunlu kılınır. Çekirdeği ortak tutan budur: bir dikeye referans veren bir modül, o müşterinin modülü hâline gelirdi.',
          },
        ],
        items: [
          { en: 'The shared core references no other layer.', tr: 'Ortak çekirdek başka hiçbir katmana referans vermez.' },
          {
            en: 'A business module may reference the shared core, and never a vertical, a host or another module.',
            tr: 'Bir iş modülü ortak çekirdeğe referans verebilir; hiçbir zaman bir dikeye, bir host’a veya başka bir modüle değil.',
          },
          {
            en: 'A module extension may reference the shared core and its own base module only.',
            tr: 'Bir modül uzantısı yalnızca ortak çekirdeğe ve kendi temel modülüne referans verebilir.',
          },
          {
            en: 'A vertical adapter may reference the shared core, the modules and its own vertical, and never a host.',
            tr: 'Bir dikey adaptörü ortak çekirdeğe, modüllere ve kendi dikeyine referans verebilir; hiçbir zaman bir host’a değil.',
          },
          {
            en: 'A host may reference the shared core, the modules and the verticals.',
            tr: 'Bir host ortak çekirdeğe, modüllere ve dikeylere referans verebilir.',
          },
        ],
      },
      {
        id: 'size',
        heading: { en: 'Size of the solution', tr: 'Çözümün büyüklüğü' },
        paragraphs: [
          {
            en: 'At the end of October 2026 the solution held 40 projects (32 application, 8 test): a five-project shared core, four business modules with their extensions, seven vertical projects and seven web hosts.',
            tr: 'Ekim 2026 sonunda çözüm 40 proje içeriyordu (32 uygulama, 8 test): beş projelik bir ortak çekirdek, uzantılarıyla birlikte dört iş modülü, yedi dikey proje ve yedi web host’u.',
          },
          {
            en: 'Static counts were about 228,000 lines of application C#, 45,000 lines of Razor, and 236,000 lines of test code declaring roughly 7,000 test methods, plus 124 JavaScript voice-client tests.',
            tr: 'Statik sayımlar yaklaşık 228.000 satır uygulama C# kodu, 45.000 satır Razor ve yaklaşık 7.000 test yöntemi tanımlayan 236.000 satır test kodu gösteriyordu; bunlara 124 JavaScript ses istemcisi testi eklenir.',
          },
          {
            en: 'Test counts are static declarations, not a record of executed runs.',
            tr: 'Test sayıları statik tanımlardır, çalıştırılmış koşuların kaydı değildir.',
          },
        ],
      },
    ],
  },
  {
    slug: 'core-engineering-decisions',
    group: 'architecture',
    title: { en: 'Core engineering decisions', tr: 'Temel mühendislik kararları' },
    summary: {
      en: 'Host-owned composition, an independent financial domain, deterministic figures and reusable customization.',
      tr: 'Host’a ait birleştirme, bağımsız bir finans alanı, deterministik rakamlar ve yeniden kullanılabilir özelleştirme.',
    },
    readme: ['§3'],
    sections: [
      {
        id: 'host-owned-composition',
        heading: { en: 'Host-owned composition', tr: 'Host’a ait birleştirme' },
        paragraphs: [
          {
            en: 'Each host selects its shared services, domain modules, industry adapters and UI in its own startup code. Business logic stays outside the presentation layer, and structural tests fail the build when a reference points the wrong way.',
            tr: 'Her host; ortak servislerini, alan modüllerini, sektör adaptörlerini ve arayüzünü kendi başlangıç kodunda seçer. İş mantığı sunum katmanının dışında kalır ve bir referans yanlış yönü gösterdiğinde yapısal testler derlemeyi başarısız kılar.',
          },
        ],
      },
      {
        id: 'independent-financial-domain',
        heading: { en: 'Independent financial domain', tr: 'Bağımsız finans alanı' },
        paragraphs: [
          {
            en: 'The accounting module owns the ledger. AI assistance and document extraction are separate extensions that consume its contracts, so the general ledger runs with no AI in it.',
            tr: 'Muhasebe defteri muhasebe modülüne aittir. Yapay zekâ desteği ve belge çıkarımı, onun sözleşmelerini kullanan ayrı uzantılardır; böylece genel muhasebe defteri içinde hiç yapay zekâ olmadan çalışır.',
          },
        ],
      },
      {
        id: 'deterministic-figures',
        heading: { en: 'Deterministic where a figure matters', tr: 'Rakamın önemli olduğu yerde deterministik' },
        paragraphs: [
          {
            en: 'Prices, availability, timetables, inventory matches and ledger figures are computed by code, never by a model.',
            tr: 'Fiyatlar, müsaitlik, zaman çizelgeleri, envanter eşleşmeleri ve muhasebe defteri rakamları hiçbir zaman bir model tarafından değil, kod tarafından hesaplanır.',
          },
        ],
      },
      {
        id: 'reusable-customization',
        heading: { en: 'Reusable customization', tr: 'Yeniden kullanılabilir özelleştirme' },
        paragraphs: [
          {
            en: 'A new application reuses chat, retrieval, voice, administration and data access, and adds its own domain services, knowledge content and interface. Sensitive capabilities ship switched off, and a test pins the defaults.',
            tr: 'Yeni bir uygulama; sohbeti, erişimi, sesi, yönetimi ve veri erişimini yeniden kullanır, kendi alan servislerini, bilgi içeriğini ve arayüzünü ekler. Hassas yetenekler kapalı olarak teslim edilir ve varsayılanları bir test sabitler.',
          },
        ],
      },
    ],
  },
  {
    slug: 'extending-the-platform',
    group: 'architecture',
    title: { en: 'Adding a new application or vertical', tr: 'Yeni bir uygulama veya dikey eklemek' },
    summary: {
      en: 'The four steps of extending the architecture, and where customer-specific integration logic belongs.',
      tr: 'Mimariyi genişletmenin dört adımı ve müşteriye özgü entegrasyon mantığının yeri.',
    },
    readme: ['§6'],
    sections: [
      {
        id: 'steps',
        heading: { en: 'Four steps', tr: 'Dört adım' },
        paragraphs: [{ en: 'Extending the architecture takes four steps.', tr: 'Mimariyi genişletmek dört adımdan oluşur.' }],
        items: [
          { en: 'Domain: industry-specific services, rules and data ownership.', tr: 'Alan: sektöre özgü servisler, kurallar ve veri sahipliği.' },
          {
            en: 'Composition: the shared services, modules and adapters selected in a host.',
            tr: 'Birleştirme: bir host’ta seçilen ortak servisler, modüller ve adaptörler.',
          },
          {
            en: 'Experience: pages, admin workflows, branding and knowledge content.',
            tr: 'Deneyim: sayfalar, yönetim iş akışları, marka görünümü ve bilgi içeriği.',
          },
          {
            en: 'Validation: tests for authorization, data integrity, AI paths and packaging.',
            tr: 'Doğrulama: yetkilendirme, veri bütünlüğü, yapay zekâ akışları ve paketleme için testler.',
          },
        ],
      },
      {
        id: 'customer-integrations',
        heading: { en: 'Customer-specific integrations', tr: 'Müşteriye özgü entegrasyonlar' },
        paragraphs: [
          {
            en: 'Customer-specific integration logic belongs behind scoped adapters. The accounting integration layer uses CSV and XLSX readers and SQL and HTTP connector contracts to turn external entries into reviewable drafts. No external system ships connected.',
            tr: 'Müşteriye özgü entegrasyon mantığı, kapsamı belirli adaptörlerin arkasında yer alır. Muhasebe entegrasyon katmanı, dış kayıtları incelenebilir taslaklara dönüştürmek için CSV ve XLSX okuyucuları ile SQL ve HTTP bağlayıcı sözleşmelerini kullanır. Hiçbir dış sistem bağlı olarak teslim edilmez.',
          },
        ],
      },
      {
        id: 'healthcare-example',
        heading: { en: 'An example: the healthcare vertical', tr: 'Bir örnek: sağlık dikeyi' },
        paragraphs: [
          {
            en: 'Adding the healthcare vertical changed no existing project beyond the solution file, four host-isolation tests and documentation.',
            tr: 'Sağlık dikeyini eklemek; çözüm dosyası, dört host yalıtım testi ve dokümantasyon dışında mevcut hiçbir projeyi değiştirmedi.',
          },
        ],
      },
    ],
  },
];
