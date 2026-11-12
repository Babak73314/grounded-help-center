import type { Article } from '../types';

export const aiArticles: Article[] = [
  {
    slug: 'grounded-answers',
    group: 'ai',
    title: { en: 'How a grounded answer is produced', tr: 'Kaynağa dayalı bir yanıt nasıl üretilir' },
    summary: {
      en: 'The four steps of a grounded text request, retrieval and prompts, and the orchestration engine.',
      tr: 'Kaynağa dayalı bir metin isteğinin dört adımı; erişim ve istemler; orkestrasyon motoru.',
    },
    readme: ['§2', '§4'],
    sections: [
      {
        id: 'four-steps',
        heading: { en: 'Four steps', tr: 'Dört adım' },
        paragraphs: [{ en: 'A grounded text request goes through four steps.', tr: 'Kaynağa dayalı bir metin isteği dört adımdan geçer.' }],
        items: [
          { en: '1 Route: bound the request and pick the path in code.', tr: '1 Yönlendirme: isteği sınırla ve izlenecek yolu kodda seç.' },
          { en: '2 Ground: retrieve documents or business facts.', tr: '2 Temellendirme: belgeleri veya iş bilgilerini getir.' },
          { en: '3 Generate: build a grounded prompt and get the draft.', tr: '3 Üretim: kaynağa dayalı bir istem oluştur ve taslağı al.' },
          { en: '4 Deliver: validate, attach citations and return.', tr: '4 Teslim: doğrula, atıfları ekle ve döndür.' },
        ],
      },
      {
        id: 'retrieval-and-prompts',
        heading: { en: 'Retrieval and prompts', tr: 'Erişim ve istemler' },
        paragraphs: [
          {
            en: 'Azure AI Search combines keyword and vector retrieval with semantic reranking, behind a per-host index allow-list that is checked at startup. Retrieved passages are numbered, fenced as untrusted data through one fencing routine, and combined with domain instructions and safety rules.',
            tr: 'Azure AI Search, anahtar kelime ve vektör erişimini anlamsal yeniden sıralamayla birleştirir; bunu, başlangıçta denetlenen ve her host için ayrı tutulan bir dizin izin listesinin arkasında yapar. Getirilen pasajlar numaralandırılır, tek bir yalıtma yordamıyla güvenilmeyen veri olarak yalıtılır ve alan talimatları ile güvenlik kurallarıyla birleştirilir.',
          },
          {
            en: 'An in-process lexical index serves machines without Azure AI Search.',
            tr: 'Azure AI Search bulunmayan makinelerde süreç içi sözcüksel bir dizin kullanılır.',
          },
        ],
      },
      {
        id: 'orchestration-engine',
        heading: { en: 'Orchestration engine', tr: 'Orkestrasyon motoru' },
        paragraphs: [
          {
            en: 'The sales orchestrator runs either as a hand-written pipeline or on Microsoft Agent Framework, selected by configuration. Both engines share the same prompts and safety rules, so the choice of engine never changes what the assistant may claim.',
            tr: 'Satış orkestratörü, yapılandırmayla seçilerek ya elle yazılmış bir işlem hattı olarak ya da Microsoft Agent Framework üzerinde çalışır. İki motor da aynı istemleri ve güvenlik kurallarını paylaşır; bu yüzden motor seçimi, asistanın neyi iddia edebileceğini hiçbir zaman değiştirmez.',
          },
        ],
      },
    ],
  },
  {
    slug: 'figures-by-code',
    group: 'ai',
    title: { en: 'Figures are computed by code, never by a model', tr: 'Rakamları model değil, kod hesaplar' },
    summary: {
      en: 'Where prices, availability, timetables and ledger figures come from.',
      tr: 'Fiyatların, müsaitliğin, zaman çizelgelerinin ve muhasebe rakamlarının kaynağı.',
    },
    readme: ['§3', '§4', '§6'],
    sections: [
      {
        id: 'principle',
        heading: { en: 'The principle', tr: 'İlke' },
        paragraphs: [
          {
            en: 'Prices, availability, timetables, inventory matches and ledger figures are computed by code, never by a model.',
            tr: 'Fiyatlar, müsaitlik, zaman çizelgeleri, envanter eşleşmeleri ve muhasebe defteri rakamları hiçbir zaman bir model tarafından değil, kod tarafından hesaplanır.',
          },
        ],
      },
      {
        id: 'in-each-application',
        heading: { en: 'In each application', tr: 'Her uygulamada' },
        paragraphs: [
          {
            en: 'Hotel dates, rates and availability follow a parser, then a calculation engine, then an answer composer. Real-estate searches run against the listing inventory in code. Financial reports read ledger data through typed services. None of these figures comes from a model.',
            tr: 'Otel tarihleri, fiyatları ve müsaitliği önce bir ayrıştırıcıdan, sonra bir hesaplama motorundan, ardından bir yanıt oluşturucudan geçer. Gayrimenkul aramaları kodda, ilan envanteri üzerinde çalışır. Finansal raporlar muhasebe defteri verilerini tipli servisler aracılığıyla okur. Bu rakamların hiçbiri bir modelden gelmez.',
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
    ],
  },
  {
    slug: 'answer-validation',
    group: 'ai',
    title: { en: 'Answer validation, one retry and a defined fallback', tr: 'Yanıt doğrulama, tek yeniden deneme ve tanımlı bir yedek yanıt' },
    summary: {
      en: 'Which paths validate a drafted answer, and what happens when a draft fails.',
      tr: 'Hangi akışların taslak yanıtı doğruladığı ve bir taslak doğrulamadan geçemediğinde ne olduğu.',
    },
    readme: ['§1', '§4'],
    sections: [
      {
        id: 'why',
        heading: { en: 'Why drafts are checked', tr: 'Taslaklar neden denetlenir' },
        paragraphs: [
          {
            en: 'Where a model writes text that a customer could act on, a deterministic validator checks the draft before it is shown.',
            tr: 'Bir modelin, müşterinin ona göre hareket edebileceği bir metin yazdığı her yerde, taslak gösterilmeden önce deterministik bir doğrulayıcı tarafından denetlenir.',
          },
        ],
      },
      {
        id: 'validators',
        heading: { en: 'Domain-specific validators', tr: 'Alana özgü doğrulayıcılar' },
        paragraphs: [
          {
            en: 'Public sales answers, hotel document answers, healthcare answers, marketing drafts and finance copilot narratives each have a domain-specific validator.',
            tr: 'Herkese açık satış yanıtları, otel belge yanıtları, sağlık yanıtları, pazarlama taslakları ve finans asistanı anlatıları için ayrı ayrı alana özgü bir doğrulayıcı vardır.',
          },
        ],
      },
      {
        id: 'when-a-draft-fails',
        heading: { en: 'When a draft fails validation', tr: 'Bir taslak doğrulamadan geçemediğinde' },
        paragraphs: [
          {
            en: 'These paths buffer the full draft instead of streaming it, allow one controlled retry, and return a defined fallback when validation fails.',
            tr: 'Bu akışlar taslağın tamamını akış hâlinde göndermek yerine arabelleğe alır, tek bir kontrollü yeniden denemeye izin verir ve doğrulama başarısız olduğunda tanımlı bir yedek yanıt döndürür.',
          },
        ],
      },
    ],
  },
  {
    slug: 'live-voice',
    group: 'ai',
    status: 'OFF BY DEFAULT',
    title: { en: 'Live voice (OFF BY DEFAULT)', tr: 'Canlı ses (OFF BY DEFAULT)' },
    summary: {
      en: 'How browser-to-model voice works, and why some hosts stay text-only.',
      tr: 'Tarayıcıdan modele sesin nasıl çalıştığı ve bazı host’ların neden yalnızca metin kullandığı.',
    },
    readme: ['§2', '§4', '§7'],
    sections: [
      {
        id: 'how-it-works',
        heading: { en: 'How it works', tr: 'Nasıl çalışır' },
        paragraphs: [
          {
            en: 'Browser-to-model WebRTC uses short-lived session credentials minted by the host. Turn routing, knowledge-tool selection, language handling and transcript-consent checks run on the server.',
            tr: 'Tarayıcıdan modele WebRTC, host’un ürettiği kısa ömürlü oturum kimlik bilgilerini kullanır. Konuşma sırası yönlendirmesi, bilgi aracı seçimi, dil işleme ve transkript onayı denetimleri sunucuda çalışır.',
          },
          {
            en: 'The voice client is plain JavaScript, and the voice endpoints are minimal APIs.',
            tr: 'Ses istemcisi düz JavaScript ile yazılmıştır; ses uç noktaları minimal API’lerdir.',
          },
        ],
      },
      {
        id: 'off-by-default',
        heading: { en: 'Off by default', tr: 'Varsayılan olarak kapalı' },
        paragraphs: [
          {
            en: 'Live voice is OFF BY DEFAULT and enabled per deployment; it is on in the hotel demo.',
            tr: 'Canlı ses OFF BY DEFAULT durumundadır ve her dağıtım için ayrı etkinleştirilir; otel demosunda açıktır.',
          },
        ],
      },
      {
        id: 'text-only-hosts',
        heading: { en: 'Why some hosts stay text-only', tr: 'Bazı host’lar neden yalnızca metin kullanır' },
        paragraphs: [
          {
            en: 'There is no code gate on spoken output, so hosts with a strict output boundary, such as healthcare, stay text-only by construction.',
            tr: 'Konuşma çıktısı üzerinde kodla çalışan bir kapı yoktur; bu yüzden sağlık gibi katı bir çıktı sınırı olan host’lar tasarım gereği yalnızca metin kullanır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'admin-agent',
    group: 'ai',
    title: { en: 'The internal multi-model admin agent', tr: 'Kurum içi çok modelli yönetim ajanı' },
    summary: {
      en: 'The model providers the admin agent supports, and what it can do.',
      tr: 'Yönetim ajanının desteklediği model sağlayıcıları ve yapabildikleri.',
    },
    readme: ['§2', '§4', '§7'],
    sections: [
      {
        id: 'providers',
        heading: { en: 'Model providers', tr: 'Model sağlayıcıları' },
        paragraphs: [
          {
            en: 'The internal admin agent has transports for Azure OpenAI, Microsoft Foundry, Anthropic and Google Gemini.',
            tr: 'Kurum içi yönetim ajanında Azure OpenAI, Microsoft Foundry, Anthropic ve Google Gemini için bağlantı katmanları vardır.',
          },
        ],
      },
      {
        id: 'what-it-supports',
        heading: { en: 'What it supports', tr: 'Neleri destekler' },
        paragraphs: [
          {
            en: 'It supports project-specific retrieval, bounded document attachments, guarded web research, streaming responses, token and cost accounting, and an optional second-model review in which a model never reviews its own draft.',
            tr: 'Projeye özgü erişimi, sınırlı belge eklerini, korumalı web araştırmasını, akışlı yanıtları, token ve maliyet hesabını ve bir modelin hiçbir zaman kendi taslağını incelemediği isteğe bağlı bir ikinci model incelemesini destekler.',
          },
        ],
      },
      {
        id: 'where-it-runs',
        heading: { en: 'Where it runs', tr: 'Nerede çalışır' },
        paragraphs: [
          {
            en: 'The admin agent is part of the commercial site, which is LIVE.',
            tr: 'Yönetim ajanı ticari sitenin bir parçasıdır; ticari site LIVE durumundadır.',
          },
        ],
      },
    ],
  },
];
