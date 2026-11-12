import type { Article } from '../types';

export const practiceArticles: Article[] = [
  {
    slug: 'engineering-practice',
    group: 'practice',
    title: { en: 'Engineering practice', tr: 'Mühendislik pratiği' },
    summary: {
      en: 'How changes are recorded, reviewed, tested and documented.',
      tr: 'Değişikliklerin nasıl kaydedildiği, incelendiği, test edildiği ve belgelendiği.',
    },
    readme: ['§8'],
    sections: [
      {
        id: 'evidence-vocabulary',
        heading: { en: 'Evidence vocabulary', tr: 'Kanıt sözlüğü' },
        paragraphs: [
          {
            en: 'Every change is recorded as PASS, FAIL, NOT RUN or BLOCKED. “Engineering complete” is kept apart from integration, CI, deployment, runtime validation, user acceptance and go-live. A feature is described at the level it was actually validated.',
            tr: 'Her değişiklik PASS, FAIL, NOT RUN veya BLOCKED olarak kaydedilir. “Mühendislik açısından tamamlanmış” olmak; entegrasyondan, CI’dan, yayına almadan, çalışma zamanı doğrulamasından, kullanıcı kabulünden ve canlıya geçişten ayrı tutulur. Bir özellik, gerçekte doğrulandığı düzeyde anlatılır.',
          },
        ],
      },
      {
        id: 'ai-assisted-development',
        heading: { en: 'AI-assisted development under review', tr: 'İnceleme altında yapay zekâ destekli geliştirme' },
        paragraphs: [
          {
            en: 'The author codes and debugs hands-on and uses AI coding tools for implementation support, automated testing and independent review. The author sets the scope and the acceptance criteria, reviews every change and its test evidence, and keeps responsibility for the architecture, the code quality and every merge and deployment decision.',
            tr: 'Yazar kodu bizzat yazar ve hata ayıklar; yapay zekâ kodlama araçlarını geliştirme desteği, otomatik test ve bağımsız inceleme için kullanır. Kapsamı ve kabul ölçütlerini yazar belirler, her değişikliği ve test kanıtını inceler; mimarinin, kod kalitesinin ve her birleştirme ile dağıtım kararının sorumluluğu yazardadır.',
          },
        ],
      },
      {
        id: 'continuous-integration',
        heading: { en: 'Continuous integration', tr: 'Sürekli entegrasyon' },
        paragraphs: [
          {
            en: 'GitHub Actions builds the solution and runs the C# and JavaScript suites on every pull request. The SQL Server suites (for example 165 gated finance tests and 141 commerce engine tests) run in separate jobs against a throwaway engine, so no engine-dependent test can be silently skipped. Paid live-model evaluations are opt-in and recorded separately.',
            tr: 'GitHub Actions her pull request’te çözümü derler ve C# ile JavaScript test paketlerini çalıştırır. SQL Server test paketleri (örneğin 165 koşullu finans testi ve 141 e-ticaret motoru testi) geçici bir motora karşı ayrı işlerde çalışır; böylece motora bağlı hiçbir test sessizce atlanamaz. Ücretli canlı model değerlendirmeleri isteğe bağlıdır ve ayrı kaydedilir.',
          },
        ],
      },
      {
        id: 'documentation',
        heading: { en: 'Documentation discipline', tr: 'Dokümantasyon disiplini' },
        paragraphs: [
          {
            en: 'Each product has a guide and a dated status register. Architecture decisions, review findings and what was deliberately not run are written down with the revision they refer to.',
            tr: 'Her ürünün bir kılavuzu ve tarihli bir durum kaydı vardır. Mimari kararlar, inceleme bulguları ve bilerek çalıştırılmayanlar, ilgili oldukları revizyonla birlikte yazılır.',
          },
        ],
      },
    ],
  },
  {
    slug: 'client-projects',
    group: 'practice',
    title: { en: 'What this means for a client project', tr: 'Bir müşteri projesi için bunun anlamı' },
    summary: {
      en: 'What a new project starts from, what transfers, and what remains integration work.',
      tr: 'Yeni bir projenin neyle başladığı, neyin aktarıldığı ve neyin entegrasyon işi olarak kaldığı.',
    },
    readme: ['§9'],
    sections: [
      {
        id: 'reusable-foundation',
        heading: { en: 'A reusable foundation', tr: 'Yeniden kullanılabilir bir temel' },
        paragraphs: [
          {
            en: 'Grounded chat, live voice, administration, quotas, fencing and database infrastructure exist once and are composed per application. A new assistant or copilot starts from tested parts.',
            tr: 'Kaynağa dayalı sohbet, canlı ses, yönetim, kotalar, içerik yalıtma ve veritabanı altyapısı tek bir yerde bulunur ve her uygulama için ayrı ayrı bir araya getirilir. Yeni bir asistan veya yardımcı, test edilmiş parçalardan başlar.',
          },
        ],
      },
      {
        id: 'trustworthy-figures',
        heading: { en: 'Trustworthy figures', tr: 'Güvenilir rakamlar' },
        paragraphs: [
          {
            en: 'The pattern of code-owned calculations, typed tools, claim validation and human approvals transfers directly to finance, operations, pricing and any domain where a model’s number could be acted on.',
            tr: 'Hesaplamaları koda bırakan ve tipli araçlar, iddia doğrulaması ile insan onayları kullanan desen; finansa, operasyonlara, fiyatlandırmaya ve bir modelin verdiği sayıya göre hareket edilebilecek her alana doğrudan aktarılır.',
          },
        ],
      },
      {
        id: 'governed-ai',
        heading: { en: 'Governed AI', tr: 'Denetimli yapay zekâ' },
        paragraphs: [
          {
            en: 'Server-side allow-lists, untrusted-content fencing, output gates, audit trails and switched-off defaults are platform features, not per-project promises.',
            tr: 'Sunucu tarafı izin listeleri, güvenilmeyen içeriğin yalıtılması, çıktı kapıları, denetim izleri ve kapalı varsayılanlar, proje başına verilen sözler değil, platform özellikleridir.',
          },
        ],
      },
      {
        id: 'honest-scope',
        heading: { en: 'Honest scope', tr: 'Dürüst kapsam' },
        paragraphs: [
          {
            en: 'Branding, tone, safety rules, knowledge content, switches and cloud resources are configuration. A new vertical, host or adapter is bounded code.',
            tr: 'Marka görünümü, üslup, güvenlik kuralları, bilgi içeriği, anahtarlar ve bulut kaynakları yapılandırmadır. Yeni bir dikey, host veya adaptör ise kapsamı belirli bir kod parçasıdır.',
          },
          {
            en: 'Connecting a real hotel, ERP, hospital or banking system is scoped integration work with its own testing and compliance obligations. The platform makes the first part cheap and the second part bounded; it does not make it zero.',
            tr: 'Gerçek bir otel, ERP, hastane veya bankacılık sistemine bağlanmak; kendi test ve uyum yükümlülükleri olan, kapsamı belirli bir entegrasyon işidir. Platform ilk kısmı ucuzlatır, ikinci kısmı sınırlar; ama sıfıra indirmez.',
          },
        ],
      },
    ],
  },
];
