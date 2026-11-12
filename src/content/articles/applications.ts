import type { Article } from '../types';

export const applicationArticles: Article[] = [
  {
    slug: 'sales-website',
    group: 'applications',
    status: 'LIVE',
    title: { en: 'Sales website and administration (LIVE)', tr: 'Satış web sitesi ve yönetim (LIVE)' },
    summary: {
      en: 'The bilingual, knowledge-grounded sales assistant and the administration behind it.',
      tr: 'İki dilli, bilgiye dayalı satış asistanı ve arkasındaki yönetim.',
    },
    readme: ['§6', '§7'],
    sections: [
      {
        id: 'sales-assistant',
        heading: { en: 'The sales assistant', tr: 'Satış asistanı' },
        paragraphs: [
          {
            en: 'A bilingual, knowledge-grounded sales assistant works with text and live voice, conversation history, lead capture and notifications. The public text pipeline validates commercial claims before returning an answer.',
            tr: 'İki dilli, bilgiye dayalı bir satış asistanı; metin ve canlı ses, konuşma geçmişi, potansiyel müşteri kaydı ve bildirimlerle çalışır. Herkese açık metin işlem hattı, bir yanıtı döndürmeden önce ticari iddiaları doğrular.',
          },
        ],
      },
      {
        id: 'administration',
        heading: { en: 'Administration', tr: 'Yönetim' },
        paragraphs: [
          {
            en: 'Administrative components provide knowledge management, model selection, document-assisted research and the admin agent. An AI evaluation lab and a marketing workspace are implemented and switched off in the public deployment.',
            tr: 'Yönetim bileşenleri bilgi yönetimi, model seçimi, belge destekli araştırma ve yönetim ajanını sağlar. Bir yapay zekâ değerlendirme laboratuvarı ve bir pazarlama çalışma alanı uygulanmıştır ve herkese açık dağıtımda kapalıdır.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'The commercial site (assistant, admin agent and lead pipeline) is LIVE. It is published to the author’s own Azure environment, with a deployment workflow that uses OIDC login and provenance checks.',
            tr: 'Ticari site (asistan, yönetim ajanı ve potansiyel müşteri akışı) LIVE durumundadır. Yazarın kendi Azure ortamında yayımlanır ve OIDC ile oturum açan, kaynak denetimi yapan bir dağıtım iş akışı kullanır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'hotel-concierge',
    group: 'applications',
    status: 'DEMO',
    title: { en: 'Hotel concierge and operations (DEMO)', tr: 'Otel konsiyerji ve operasyonlar (DEMO)' },
    summary: {
      en: 'Document Q&A combined with a deterministic stay parser and pricing engine, on a public demo deployment.',
      tr: 'Deterministik bir konaklama ayrıştırıcısı ve fiyatlandırma motoruyla birleşen belge soru-cevabı; herkese açık bir demo dağıtımında.',
    },
    readme: ['§6', '§7'],
    sections: [
      {
        id: 'how-it-answers',
        heading: { en: 'How the concierge answers', tr: 'Konsiyerj nasıl yanıt verir' },
        paragraphs: [
          {
            en: 'Document Q&A is combined with a deterministic stay parser and pricing engine. Staff-managed room rates and availability feed the same calculation services that the concierge and the request form use.',
            tr: 'Belge soru-cevabı, deterministik bir konaklama ayrıştırıcısı ve fiyatlandırma motoruyla birleştirilir. Personelin yönettiği oda fiyatları ve müsaitlik, konsiyerjin ve talep formunun kullandığı hesaplama servislerinin aynısını besler.',
          },
        ],
      },
      {
        id: 'reservation-requests',
        heading: { en: 'Reservation requests', tr: 'Rezervasyon talepleri' },
        paragraphs: [
          {
            en: 'Reservation requests are re-priced on the server, saved with consent and processed through a staff queue. They are requests, never bookings.',
            tr: 'Rezervasyon talepleri sunucuda yeniden fiyatlandırılır, rıza alınarak kaydedilir ve bir personel kuyruğu üzerinden işlenir. Bunlar taleptir, hiçbir zaman kesin rezervasyon değildir.',
          },
        ],
      },
      {
        id: 'deployment',
        heading: { en: 'Deployment', tr: 'Dağıtım' },
        paragraphs: [
          {
            en: 'The demo runs on Azure App Service, a dedicated Azure SQL Database and an Azure AI Search index, with live voice enabled. No property-management system is connected.',
            tr: 'Demo; Azure App Service, ayrılmış bir Azure SQL Database ve bir Azure AI Search dizini üzerinde, canlı ses etkin olarak çalışır. Hiçbir mülk yönetim sistemi bağlı değildir.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'The hotel demo is DEMO, with a public Azure deployment: a fictional property with synthetic data, live voice on, no property-management system and no customer.',
            tr: 'Otel demosu DEMO durumundadır ve herkese açık bir Azure dağıtımı vardır: tesis kurgusaldır ve sentetik veriler kullanır; canlı ses açıktır; mülk yönetim sistemi ve müşteri yoktur.',
          },
          {
            en: 'A working slice of the hotel path is public, with its tests, in the grounded-hotel-concierge repository.',
            tr: 'Otel akışının çalışan bir bölümü, testleriyle birlikte grounded-hotel-concierge deposunda herkese açıktır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'healthcare',
    group: 'applications',
    status: 'DEMO',
    title: { en: 'Healthcare information and scheduling (DEMO)', tr: 'Sağlık bilgilendirme ve randevu planlama (DEMO)' },
    summary: {
      en: 'A text-only assistant over local documents and a staff-maintained timetable, with code-level safety checks.',
      tr: 'Yerel belgeler ve personelin güncel tuttuğu bir zaman çizelgesi üzerinde, kod düzeyinde güvenlik denetimleri olan, yalnızca metin kullanan bir asistan.',
    },
    readme: ['§6', '§7'],
    sections: [
      {
        id: 'assistant',
        heading: { en: 'The assistant', tr: 'Asistan' },
        paragraphs: [
          {
            en: 'A text-only assistant combines local document retrieval with a staff-maintained service timetable.',
            tr: 'Yalnızca metin kullanan bir asistan, yerel belge erişimini personelin güncel tuttuğu bir hizmet zaman çizelgesiyle birleştirir.',
          },
        ],
      },
      {
        id: 'safety-checks',
        heading: { en: 'Safety checks', tr: 'Güvenlik denetimleri' },
        paragraphs: [
          {
            en: 'Code handles crisis and emergency inputs before any model call, and medical-claim checks validate generated answers for diagnosis, dosing, result interpretation and false reassurance.',
            tr: 'Kriz ve acil durum girdilerini, herhangi bir model çağrısından önce kod ele alır; tıbbi iddia denetimleri de üretilen yanıtları tanı, dozaj, sonuç yorumlama ve yanlış güvence açısından doğrular.',
          },
        ],
      },
      {
        id: 'appointment-requests',
        heading: { en: 'Appointment requests', tr: 'Randevu talepleri' },
        paragraphs: [
          {
            en: 'Appointment-request services revalidate the selected time and the consent.',
            tr: 'Randevu talebi servisleri seçilen saati ve verilen rızayı yeniden doğrular.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'The healthcare demo is DEMO, local and text-only. It is non-clinical and keeps no real patient data.',
            tr: 'Sağlık demosu DEMO durumundadır; yereldir ve yalnızca metin kullanır. Klinik değildir ve gerçek hasta verisi tutmaz.',
          },
          {
            en: 'One live model red-flag evaluation was run in September 2026. It is not a clinical system, and no hospital system is connected.',
            tr: 'Eylül 2026’da tek bir canlı model kırmızı bayrak değerlendirmesi yapıldı. Klinik bir sistem değildir ve hiçbir hastane sistemi bağlı değildir.',
          },
        ],
      },
    ],
  },
  {
    slug: 'real-estate',
    group: 'applications',
    status: 'DEMO',
    title: { en: 'Real-estate advisor (DEMO)', tr: 'Gayrimenkul danışmanı (DEMO)' },
    summary: {
      en: 'A bilingual property advisor that runs its searches against a listing inventory in code.',
      tr: 'Aramalarını kodda, bir ilan envanteri üzerinde yapan iki dilli bir emlak danışmanı.',
    },
    readme: ['§6', '§7'],
    sections: [
      {
        id: 'advisor',
        heading: { en: 'The advisor', tr: 'Danışman' },
        paragraphs: [
          {
            en: 'The real-estate advisor is a bilingual property advisor and listing administration for a fictional agency.',
            tr: 'Gayrimenkul danışmanı, kurgusal bir emlak ofisi için iki dilli bir emlak danışmanlığı ve ilan yönetimi uygulamasıdır.',
          },
        ],
      },
      {
        id: 'search-in-code',
        heading: { en: 'Search in code', tr: 'Kodda arama' },
        paragraphs: [
          {
            en: 'A deterministic extractor turns a sentence such as “a one-bedroom rental between 70 and 90 square metres” into structured search criteria. The inventory service runs the search in code, and the assistant, by text or live voice, answers only from the matching listings and cites their reference codes.',
            tr: 'Deterministik bir çıkarıcı, “70 ile 90 metrekare arasında tek yatak odalı kiralık bir daire” gibi bir cümleyi yapılandırılmış arama ölçütlerine dönüştürür. Aramayı envanter servisi kodda yapar; asistan da metinle ya da canlı sesle yalnızca eşleşen ilanlardan yanıt verir ve bu ilanların referans kodlarını belirtir.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'The real-estate demo is DEMO and local: demo inventory, a text and voice assistant, and no listing-service integration.',
            tr: 'Gayrimenkul demosu DEMO durumundadır ve yereldir: demo envanteri ile metin ve ses asistanı vardır; ilan servisi entegrasyonu yoktur.',
          },
        ],
      },
    ],
  },
  {
    slug: 'commerce',
    group: 'applications',
    status: 'DEMO',
    title: { en: 'Commerce storefront (DEMO)', tr: 'E-ticaret mağazası (DEMO)' },
    summary: {
      en: 'A bilingual storefront with a simulated checkout and a shopping assistant that cannot order unasked.',
      tr: 'Simüle edilmiş bir ödeme adımı ve istenmeden sipariş veremeyen bir alışveriş asistanı içeren iki dilli bir mağaza.',
    },
    readme: ['§6', '§7', '§8'],
    sections: [
      {
        id: 'storefront',
        heading: { en: 'The storefront', tr: 'Mağaza' },
        paragraphs: [
          {
            en: 'The commerce storefront is bilingual, with guest and member shopping, persistent carts, a simulated checkout with idempotent and atomic stock handling, and a protected admin.',
            tr: 'E-ticaret mağazası iki dillidir; misafir ve üye alışverişi, kalıcı sepetler, idempotent ve atomik stok yönetimli simüle edilmiş bir ödeme adımı ve korumalı bir yönetim paneli içerir.',
          },
        ],
      },
      {
        id: 'shopping-assistant',
        heading: { en: 'The shopping assistant', tr: 'Alışveriş asistanı' },
        paragraphs: [
          {
            en: 'The shopping assistant’s drafts are validated before display. The assistant cannot place an order or change a cart unasked.',
            tr: 'Alışveriş asistanının taslakları gösterilmeden önce doğrulanır. Asistan, istenmeden sipariş veremez veya sepeti değiştiremez.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'The commerce demo is DEMO and local: a simulated checkout, AI features off and nothing deployed. Every AI capability ships switched off, and nothing is paid or shipped.',
            tr: 'E-ticaret demosu DEMO durumundadır ve yereldir: ödeme adımı simüle edilmiştir, yapay zekâ özellikleri kapalıdır ve hiçbir şey yayına alınmamıştır. Her yapay zekâ yeteneği kapalı olarak teslim edilir; hiçbir ödeme alınmaz ve hiçbir şey gönderilmez.',
          },
          {
            en: 'Its SQL Server suite of 141 commerce engine tests runs in a separate CI job against a throwaway engine.',
            tr: 'SQL Server üzerindeki 141 e-ticaret motoru testi, geçici bir motora karşı ayrı bir CI işinde çalışır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'accounting',
    group: 'applications',
    status: 'LOCAL',
    title: { en: 'Accounting and financial intelligence (LOCAL)', tr: 'Muhasebe ve finansal zekâ (LOCAL)' },
    summary: {
      en: 'A multi-company ledger with one deterministic calculation engine, and a copilot whose figures are checked against its tools.',
      tr: 'Tek bir deterministik hesaplama motoruna sahip çok şirketli bir muhasebe defteri ve rakamları araç sonuçlarıyla denetlenen bir asistan.',
    },
    readme: ['§6', '§7', '§8'],
    sections: [
      {
        id: 'ledger',
        heading: { en: 'The ledger', tr: 'Muhasebe defteri' },
        paragraphs: [
          {
            en: 'A reusable multi-company ledger manages accounts, fiscal periods, opening balances and a journal lifecycle of Draft, Approved, Posted and Reversed. Reports share one deterministic calculation engine.',
            tr: 'Yeniden kullanılabilir, çok şirketli bir muhasebe defteri; hesapları, mali dönemleri, açılış bakiyelerini ve Taslak (Draft), Onaylandı (Approved), Kayda alındı (Posted) ve Ters kayıt (Reversed) aşamalarından oluşan bir yevmiye yaşam döngüsünü yönetir. Raporlar tek bir deterministik hesaplama motorunu paylaşır.',
          },
        ],
      },
      {
        id: 'beyond-the-ledger',
        heading: { en: 'Beyond the ledger', tr: 'Defterin ötesinde' },
        paragraphs: [
          {
            en: 'Cost centres, open items and ageing, cash and bank records, budgets and deterministic cash-flow forecasts extend the domain across about thirty Blazor screens.',
            tr: 'Maliyet merkezleri, açık kalemler ve yaşlandırma, kasa ve banka kayıtları, bütçeler ve deterministik nakit akışı tahminleri alanı genişletir; bunlar yaklaşık otuz Blazor ekranında sunulur.',
          },
        ],
      },
      {
        id: 'finance-copilot',
        heading: { en: 'The finance copilot', tr: 'Finans asistanı' },
        paragraphs: [
          {
            en: 'The finance copilot calls typed, read-only reporting tools and checks every figure in its narrative against their results. A narrative whose figures cannot be traced to a tool result is withheld.',
            tr: 'Finans asistanı tipli, salt okunur raporlama araçlarını çağırır ve anlatısındaki her rakamı bu araçların sonuçlarıyla karşılaştırır. Rakamları bir araç sonucuna dayandırılamayan bir anlatı gösterilmez.',
          },
        ],
      },
      {
        id: 'drafts-and-approvals',
        heading: { en: 'Drafts and approvals', tr: 'Taslaklar ve onaylar' },
        paragraphs: [
          {
            en: 'Journal creation passes through drafts that a person confirms. Approval and posting belong to application services, on screens the AI cannot reach.',
            tr: 'Yevmiye kaydı oluşturma, bir kişinin onayladığı taslaklardan geçer. Onaylama ve kayda alma, yapay zekânın erişemediği ekranlarda, uygulama servislerine aittir.',
          },
        ],
      },
      {
        id: 'imports',
        heading: { en: 'Imports', tr: 'İçe aktarmalar' },
        paragraphs: [
          {
            en: 'Every import path (CSV and XLSX, SQL and HTTP connectors, invoice extraction with Azure Document Intelligence) ends in a reviewable draft.',
            tr: 'Her içe aktarma yolu (CSV ve XLSX, SQL ve HTTP bağlayıcıları, Azure Document Intelligence ile fatura çıkarımı) incelenebilir bir taslakla sonuçlanır.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'Finance and accounting is LOCAL: engineering-complete, with gated SQL Server suites in CI and one controlled live copilot smoke run. It has never been deployed and has no statutory certification.',
            tr: 'Finans ve muhasebe LOCAL durumundadır: mühendislik açısından tamamlanmıştır; CI’da koşullu SQL Server test paketleri ve tek bir kontrollü canlı asistan duman testi vardır. Hiçbir zaman yayına alınmamıştır ve yasal bir sertifikası yoktur.',
          },
          {
            en: 'Its gated SQL Server suite of 165 finance tests runs in a separate CI job against a throwaway engine.',
            tr: '165 finans testinden oluşan koşullu SQL Server paketi, ayrı bir CI işinde geçici bir motor üzerinde çalışır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'marketing',
    group: 'applications',
    status: 'OFF BY DEFAULT',
    title: { en: 'Marketing and social-media workspace (OFF BY DEFAULT)', tr: 'Pazarlama ve sosyal medya çalışma alanı (OFF BY DEFAULT)' },
    summary: {
      en: 'Campaigns and drafts under a claim gate and human approval, with nothing published automatically.',
      tr: 'İddia kapısı ve insan onayı altında kampanyalar ve taslaklar; hiçbir şey otomatik olarak yayımlanmaz.',
    },
    readme: ['§6', '§7'],
    sections: [
      {
        id: 'workspace',
        heading: { en: 'The workspace', tr: 'Çalışma alanı' },
        paragraphs: [
          {
            en: 'The marketing workspace holds campaigns, briefs, content variants, evidence references and an approval workflow with an append-only audit trail.',
            tr: 'Pazarlama çalışma alanında kampanyalar, brifler, içerik varyantları, kanıt referansları ve yalnızca eklenebilen bir denetim izine sahip bir onay iş akışı bulunur.',
          },
        ],
      },
      {
        id: 'drafts-and-review',
        heading: { en: 'Drafts and review', tr: 'Taslaklar ve inceleme' },
        paragraphs: [
          {
            en: 'Model drafts pass a deterministic, brand-specific claim gate before they are stored. A second-model review is shown as advice and never decides. AI image drafts are inspected and approved by a person.',
            tr: 'Model taslakları saklanmadan önce deterministik, markaya özgü bir iddia kapısından geçer. İkinci model incelemesi tavsiye olarak gösterilir ve hiçbir zaman karar vermez. Yapay zekâ görsel taslaklarını bir kişi inceler ve onaylar.',
          },
        ],
      },
      {
        id: 'publishing',
        heading: { en: 'Publishing', tr: 'Yayımlama' },
        paragraphs: [
          {
            en: 'Nothing connects to a social network, and nothing is published or scheduled automatically.',
            tr: 'Hiçbir şey bir sosyal ağa bağlanmaz; hiçbir şey otomatik olarak yayımlanmaz veya zamanlanmaz.',
          },
        ],
      },
      {
        id: 'status',
        heading: { en: 'Status', tr: 'Durum' },
        paragraphs: [
          {
            en: 'The marketing module is OFF BY DEFAULT: every switch is off, and one authorized live image-generation call has been made.',
            tr: 'Pazarlama modülü OFF BY DEFAULT durumundadır: tüm anahtarlar kapalıdır ve yetkilendirilmiş tek bir canlı görsel üretimi çağrısı yapılmıştır.',
          },
        ],
      },
    ],
  },
];
