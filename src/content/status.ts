import type { Capability } from './types';

/**
 * The delivery-status table of the architecture overview (§7), row by row.
 * The help center's "is X live?" answers are written from it by code, and
 * the answer check refuses any sentence that gives a capability another
 * label. The "author" is the author of the overview.
 */
export const capabilities: Capability[] = [
  {
    id: 'sales-website',
    name: { en: 'Commercial site (assistant, admin agent, lead pipeline)', tr: 'Ticari site (asistan, yönetim ajanı, potansiyel müşteri akışı)' },
    aliases: {
      en: ['sales website', 'sales site', 'sales assistant', 'commercial site'],
      tr: ['satış web sitesi', 'satış sitesi', 'satış asistanı', 'ticari site'],
    },
    labels: ['LIVE'],
    state: { en: 'LIVE', tr: 'LIVE' },
    meaning: {
      en: 'Published to the author’s own Azure environment; deployment workflow with OIDC login and provenance checks',
      tr: 'Yazarın kendi Azure ortamında yayımlanıyor; OIDC ile oturum açan ve kaynak denetimi yapan bir dağıtım iş akışı',
    },
    article: 'sales-website',
  },
  {
    id: 'hotel',
    name: { en: 'Hotel demo', tr: 'Otel demosu' },
    aliases: { en: ['hotel demo', 'hotel concierge', 'hotel'], tr: ['otel demosu', 'otel konsiyerji', 'otel'] },
    labels: ['DEMO'],
    state: { en: 'DEMO, public Azure deployment', tr: 'DEMO, herkese açık Azure dağıtımı' },
    meaning: {
      en: 'Fictional property, synthetic data; live voice on; no property-management system; no customer',
      tr: 'Kurgusal tesis, sentetik veri; canlı ses açık; mülk yönetim sistemi yok; müşteri yok',
    },
    article: 'hotel-concierge',
  },
  {
    id: 'healthcare',
    name: { en: 'Healthcare demo', tr: 'Sağlık demosu' },
    aliases: { en: ['healthcare demo', 'healthcare assistant', 'healthcare'], tr: ['sağlık demosu', 'sağlık asistanı', 'sağlık'] },
    labels: ['DEMO'],
    state: { en: 'DEMO, local, text-only', tr: 'DEMO, yerel, yalnızca metin' },
    meaning: {
      en: 'One live model red-flag evaluation (September 2026); not a clinical system; no hospital system',
      tr: 'Tek bir canlı model kırmızı bayrak değerlendirmesi (Eylül 2026); klinik bir sistem değil; hastane sistemi yok',
    },
    article: 'healthcare',
  },
  {
    id: 'real-estate',
    name: { en: 'Real-estate demo', tr: 'Gayrimenkul demosu' },
    aliases: { en: ['real-estate demo', 'real-estate advisor', 'real-estate', 'real estate'], tr: ['gayrimenkul demosu', 'gayrimenkul danışmanı', 'gayrimenkul'] },
    labels: ['DEMO'],
    state: { en: 'DEMO, local', tr: 'DEMO, yerel' },
    meaning: {
      en: 'Demo inventory; text and voice assistant; no listing-service integration',
      tr: 'Demo envanteri; metin ve ses asistanı; ilan servisi entegrasyonu yok',
    },
    article: 'real-estate',
  },
  {
    id: 'commerce',
    name: { en: 'Commerce demo', tr: 'E-ticaret demosu' },
    aliases: {
      en: ['commerce demo', 'commerce storefront', 'commerce', 'storefront', 'shopping assistant'],
      tr: ['e-ticaret demosu', 'e-ticaret mağazası', 'e-ticaret', 'mağaza', 'alışveriş asistanı'],
    },
    labels: ['DEMO'],
    state: { en: 'DEMO, local', tr: 'DEMO, yerel' },
    meaning: {
      en: 'Simulated checkout; AI features off; nothing deployed',
      tr: 'Simüle edilmiş ödeme adımı; yapay zekâ özellikleri kapalı; hiçbir şey yayına alınmamış',
    },
    article: 'commerce',
  },
  {
    id: 'accounting',
    name: { en: 'Finance and accounting', tr: 'Finans ve muhasebe' },
    aliases: {
      en: ['finance and accounting', 'accounting application', 'finance copilot', 'accounting', 'finance', 'general ledger'],
      tr: ['finans ve muhasebe', 'muhasebe uygulaması', 'finans asistanı', 'muhasebe', 'finans', 'muhasebe defteri'],
    },
    labels: ['LOCAL'],
    state: { en: 'LOCAL', tr: 'LOCAL' },
    meaning: {
      en: 'Engineering-complete; gated SQL Server suites run in CI; one controlled live copilot smoke run; never deployed; no statutory certification',
      tr: 'Mühendislik açısından tamamlanmış; kapılı SQL Server test paketleri CI’da çalışıyor; tek bir kontrollü canlı asistan duman testi; hiç yayına alınmamış; yasal sertifika yok',
    },
    article: 'accounting',
  },
  {
    id: 'marketing',
    name: { en: 'Marketing module', tr: 'Pazarlama modülü' },
    aliases: { en: ['marketing module', 'marketing workspace', 'marketing'], tr: ['pazarlama modülü', 'pazarlama çalışma alanı', 'pazarlama'] },
    labels: ['OFF BY DEFAULT'],
    state: { en: 'OFF BY DEFAULT', tr: 'OFF BY DEFAULT' },
    meaning: {
      en: 'Every switch off; one authorized live image-generation call',
      tr: 'Tüm anahtarlar kapalı; yetkilendirilmiş tek bir canlı görsel üretimi çağrısı',
    },
    article: 'marketing',
  },
  {
    id: 'live-voice',
    name: { en: 'Live voice (shared)', tr: 'Canlı ses (ortak)' },
    aliases: { en: ['live voice', 'voice'], tr: ['canlı ses', 'sesli', 'ses'] },
    labels: ['OFF BY DEFAULT'],
    state: { en: 'OFF BY DEFAULT', tr: 'OFF BY DEFAULT' },
    meaning: {
      en: 'Enabled per deployment (on in the hotel demo); no deterministic gate on spoken output, so the healthcare host stays text-only',
      tr: 'Her dağıtım için ayrı etkinleştirilir (otel demosunda açık); konuşma çıktısında deterministik bir kapı yok, bu yüzden sağlık host’u yalnızca metin kullanır',
    },
    article: 'live-voice',
  },
  {
    id: 'integrations',
    name: { en: 'Integrations (hotel, hospital, ERP, bank feeds)', tr: 'Entegrasyonlar (otel, hastane, ERP, banka akışları)' },
    aliases: { en: ['integrations', 'integration'], tr: ['entegrasyonlar', 'entegrasyon'] },
    labels: [],
    state: { en: 'Contracts only', tr: 'Yalnızca sözleşmeler' },
    meaning: { en: 'Preview-then-draft paths exist; nothing is connected', tr: 'Önizleme-sonra-taslak yolları var; hiçbir şey bağlı değil' },
  },
  {
    id: 'scale-out',
    name: { en: 'Scale-out', tr: 'Ölçeklendirme' },
    aliases: { en: ['scale-out', 'scale out', 'single instance'], tr: ['ölçeklendirme', 'tek örnek'] },
    labels: [],
    state: { en: 'Single instance', tr: 'Tek örnek' },
    meaning: {
      en: 'Quotas and caps are per process, sized for single-instance App Services',
      tr: 'Kotalar ve sınırlar süreç başına; tek örnekli App Service’lere göre boyutlandırılmış',
    },
  },
];
