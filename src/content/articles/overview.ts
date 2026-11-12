import type { Article } from '../types';

export const overviewArticles: Article[] = [
  {
    slug: 'what-the-platform-is',
    group: 'overview',
    title: { en: 'What the platform is', tr: 'Platform nedir' },
    summary: {
      en: 'A modular .NET and Azure AI platform in which the model writes language and code owns every figure.',
      tr: 'Modelin dili yazdığı, her rakamın ise koda ait olduğu modüler bir .NET ve Azure yapay zekâ platformu.',
    },
    readme: ['§1'],
    sections: [
      {
        id: 'in-short',
        heading: { en: 'In short', tr: 'Kısaca' },
        paragraphs: [
          {
            en: 'The platform is a modular .NET and Azure AI platform in which the model writes language and code owns every figure.',
            tr: 'Platform, modelin dili yazdığı ve her rakamın koda ait olduğu modüler bir .NET ve Azure yapay zekâ platformudur.',
          },
          {
            en: 'It is a C# platform that combines ASP.NET Core, Blazor, SQL Server and Azure AI. One shared core powers a commercial sales website, a hotel concierge, a healthcare information assistant, a real-estate advisor, a commerce storefront and a finance and accounting application.',
            tr: 'ASP.NET Core, Blazor, SQL Server ve Azure AI’ı bir araya getiren bir C# platformudur. Tek bir ortak çekirdek; ticari bir satış web sitesine, bir otel konsiyerjine, bir sağlık bilgilendirme asistanına, bir gayrimenkul danışmanına, bir e-ticaret mağazasına ve bir finans ve muhasebe uygulamasına güç verir.',
          },
          {
            en: 'Each application host composes reusable business modules and industry-specific logic through dependency injection.',
            tr: 'Her uygulama host’u, yeniden kullanılabilir iş modüllerini ve sektöre özgü mantığı bağımlılık enjeksiyonu ile bir araya getirir.',
          },
        ],
      },
      {
        id: 'central-design',
        heading: { en: 'The central design', tr: 'Temel tasarım' },
        paragraphs: [
          {
            en: 'The central design separates AI-generated language from authoritative business operations.',
            tr: 'Temel tasarım, yapay zekânın ürettiği dili esas alınan iş işlemlerinden ayırır.',
          },
        ],
        items: [
          { en: 'Retrieval grounds document answers.', tr: 'Belge yanıtları, erişim (retrieval) yoluyla kaynağa dayandırılır.' },
          {
            en: 'Code calculates rates, availability, schedules and financial figures.',
            tr: 'Fiyatları, müsaitliği, takvimleri ve finansal rakamları kod hesaplar.',
          },
          {
            en: 'Application services enforce authorization and transaction rules.',
            tr: 'Yetkilendirme ve işlem kurallarını uygulama servisleri uygular.',
          },
          {
            en: 'Where a model writes text that a customer could act on, a deterministic validator checks the draft before it is shown.',
            tr: 'Bir modelin, müşterinin ona göre hareket edebileceği bir metin yazdığı her yerde, taslak gösterilmeden önce deterministik bir doğrulayıcı tarafından denetlenir.',
          },
        ],
      },
      {
        id: 'who-built-it',
        heading: { en: 'Who built it', tr: 'Kim geliştirdi' },
        paragraphs: [
          {
            en: 'The platform is a personal startup initiative. It was designed, implemented and tested independently, without a registered company or a team, using AI coding tools under the author’s own review.',
            tr: 'Platform kişisel bir girişim projesidir. Kayıtlı bir şirket ya da ekip olmadan, yapay zekâ kodlama araçları yazarın kendi incelemesi altında kullanılarak bağımsız olarak tasarlandı, geliştirildi ve test edildi.',
          },
          {
            en: 'The architecture overview describes the author’s own work only and contains no client code, data or confidential material.',
            tr: 'Mimari genel bakış yalnızca yazarın kendi çalışmasını anlatır; müşteri kodu, verisi veya gizli bir materyal içermez.',
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
    slug: 'status-labels',
    group: 'overview',
    title: { en: 'Status labels: LIVE, DEMO, LOCAL, OFF BY DEFAULT', tr: 'Durum etiketleri: LIVE, DEMO, LOCAL, OFF BY DEFAULT' },
    summary: {
      en: 'What each of the four status labels means.',
      tr: 'Dört durum etiketinin her birinin anlamı.',
    },
    readme: ['§1', '§8'],
    sections: [
      {
        id: 'labels',
        heading: { en: 'The four labels', tr: 'Dört etiket' },
        paragraphs: [{ en: 'The architecture overview uses four status labels.', tr: 'Mimari genel bakış dört durum etiketi kullanır.' }],
        items: [
          { en: 'LIVE: running publicly in the author’s own Azure environment.', tr: 'LIVE: yazarın kendi Azure ortamında herkese açık olarak çalışıyor.' },
          {
            en: 'DEMO: a fictional business with synthetic data; never a customer production system.',
            tr: 'DEMO: sentetik verilerle çalışan kurgusal bir işletme; hiçbir zaman bir müşterinin üretim sistemi değil.',
          },
          {
            en: 'LOCAL: engineering-complete, validated locally and in CI; not deployed.',
            tr: 'LOCAL: mühendislik açısından tamamlanmış, yerelde ve CI’da doğrulanmış; yayına alınmamış.',
          },
          {
            en: 'OFF BY DEFAULT: implemented but switched off in the shipped configuration.',
            tr: 'OFF BY DEFAULT: uygulanmış, ancak teslim edilen yapılandırmada kapalı.',
          },
        ],
      },
      {
        id: 'validated-level',
        heading: { en: 'Described at the level it was validated', tr: 'Doğrulandığı düzeyde anlatılır' },
        paragraphs: [
          {
            en: 'A feature is described at the level it was actually validated. “Engineering complete” is kept apart from integration, CI, deployment, runtime validation, user acceptance and go-live.',
            tr: 'Bir özellik, gerçekte doğrulandığı düzeyde anlatılır. “Mühendislik açısından tamamlanmış” olmak; entegrasyondan, CI’dan, yayına almadan, çalışma zamanı doğrulamasından, kullanıcı kabulünden ve canlıya geçişten ayrı tutulur.',
          },
        ],
      },
    ],
  },
  {
    slug: 'technology-stack',
    group: 'overview',
    title: { en: 'Technology stack', tr: 'Teknoloji yığını' },
    summary: {
      en: 'The languages, frameworks, AI services and cloud services the platform is built on.',
      tr: 'Platformun üzerine kurulduğu diller, çatılar, yapay zekâ servisleri ve bulut servisleri.',
    },
    readme: ['§2'],
    sections: [
      {
        id: 'runtime',
        heading: { en: 'Application runtime', tr: 'Uygulama çalışma ortamı' },
        paragraphs: [
          {
            en: 'The application runtime is C#, .NET 10 and ASP.NET Core, with dependency injection, typed HttpClient services with resilience handlers where retries are safe, and minimal APIs for voice endpoints.',
            tr: 'Uygulama çalışma ortamı C#, .NET 10 ve ASP.NET Core’dur; bağımlılık enjeksiyonu, yeniden denemenin güvenli olduğu yerlerde dayanıklılık işleyicilerine sahip tipli HttpClient servisleri ve ses uç noktaları için minimal API’ler kullanılır.',
          },
        ],
      },
      {
        id: 'user-interface',
        heading: { en: 'User interface', tr: 'Kullanıcı arayüzü' },
        paragraphs: [
          {
            en: 'The user interface uses Blazor Interactive Server, SignalR circuits, one shared Razor class library and a plain-JavaScript WebRTC voice client, with a Turkish and an English UI.',
            tr: 'Kullanıcı arayüzü Blazor Interactive Server, SignalR bağlantı devreleri, tek bir ortak Razor sınıf kütüphanesi ve düz JavaScript ile yazılmış bir WebRTC ses istemcisi kullanır; arayüz Türkçe ve İngilizcedir.',
          },
        ],
      },
      {
        id: 'data-access',
        heading: { en: 'Data access', tr: 'Veri erişimi' },
        paragraphs: [
          {
            en: 'Data access uses EF Core 10 with SQL Server and Azure SQL. Each domain owns its DbContext, schema and migration history, and the tests use SQLite and in-memory providers.',
            tr: 'Veri erişimi SQL Server ve Azure SQL ile EF Core 10 kullanır. Her alan kendi DbContext’ine, şemasına ve migration geçmişine sahiptir; testler SQLite ve bellek içi sağlayıcılar kullanır.',
          },
        ],
      },
      {
        id: 'ai-and-retrieval',
        heading: { en: 'AI and retrieval', tr: 'Yapay zekâ ve erişim' },
        paragraphs: [
          {
            en: 'AI and retrieval use Azure OpenAI chat and embeddings, Azure AI Search hybrid retrieval (keyword and vector) with semantic reranking, an in-process lexical index for machines without Azure AI Search, Azure Document Intelligence and Azure OpenAI image generation.',
            tr: 'Yapay zekâ ve erişim tarafında Azure OpenAI sohbet ve embedding’leri, anlamsal yeniden sıralamalı Azure AI Search hibrit erişimi (anahtar kelime ve vektör), Azure AI Search bulunmayan makineler için süreç içi sözcüksel bir dizin, Azure Document Intelligence ve Azure OpenAI görsel üretimi kullanılır.',
          },
        ],
      },
      {
        id: 'voice-and-agents',
        heading: { en: 'Voice and agents', tr: 'Ses ve ajanlar' },
        paragraphs: [
          {
            en: 'Voice uses WebRTC with Azure OpenAI Realtime and server-side turn routing. There is a multi-provider admin agent (Azure OpenAI, Microsoft Foundry, Anthropic Claude, Google Gemini), and Microsoft Agent Framework is a configuration-selected orchestration engine.',
            tr: 'Ses için Azure OpenAI Realtime ve sunucu tarafında konuşma sırası yönlendirmesiyle WebRTC kullanılır. Çok sağlayıcılı bir yönetim ajanı vardır (Azure OpenAI, Microsoft Foundry, Anthropic Claude, Google Gemini) ve Microsoft Agent Framework, yapılandırmayla seçilen bir orkestrasyon motorudur.',
          },
        ],
      },
      {
        id: 'cloud-and-configuration',
        heading: { en: 'Cloud and configuration', tr: 'Bulut ve yapılandırma' },
        paragraphs: [
          {
            en: 'The cloud services are Azure App Service (Linux), Azure SQL Database, Azure Key Vault and Azure Blob Storage, with managed identity where supported. Provisioning uses PowerShell 7 scripts that are dry-run by default.',
            tr: 'Bulut servisleri Azure App Service (Linux), Azure SQL Database, Azure Key Vault ve Azure Blob Storage’dır; desteklendiği yerlerde yönetilen kimlik kullanılır. Kurulum, varsayılan olarak deneme (dry-run) modunda çalışan PowerShell 7 betikleriyle yapılır.',
          },
        ],
      },
      {
        id: 'engineering-automation',
        heading: { en: 'Engineering automation', tr: 'Mühendislik otomasyonu' },
        paragraphs: [
          {
            en: 'Engineering automation consists of xUnit and Node test suites, structural and configuration tests, SQL Server integration gates, GitHub Actions CI with a separate gated SQL Server job, and an OIDC-based deployment workflow with version-provenance checks.',
            tr: 'Mühendislik otomasyonu; xUnit ve Node test paketlerinden, yapısal ve yapılandırma testlerinden, SQL Server entegrasyon denetimlerinden, ayrı ve koşullu bir SQL Server işi içeren GitHub Actions CI’dan ve sürüm kaynağı denetimli, OIDC tabanlı bir dağıtım iş akışından oluşur.',
          },
        ],
      },
    ],
  },
];
