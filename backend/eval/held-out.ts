import type { EvalQuestion } from './questions';

/**
 * The held-out set: eight answerable questions, each in English and Turkish,
 * written after the ranking analysis on the original set (`questions.ts`) and
 * before any change to retrieval, then committed on their own. Each asks
 * about a section that no answer to the original set cites. The expected
 * articles follow the same rule as the original set: where the architecture
 * overview states the same fact in two articles, both are accepted.
 *
 * They are not tuned: neither the questions nor the expected articles are
 * changed after seeing a result.
 */
export const heldOut: EvalQuestion[] = [
  {
    // accounting#imports; extending-the-platform#customer-integrations states the same import paths.
    id: 'H1',
    en: 'How can data be brought into the accounting application, and what happens to it after an import?',
    tr: 'Muhasebe uygulamasına veriler nasıl aktarılabilir ve içe aktarılan verilere sonra ne olur?',
    expect: { kind: 'answer', articles: ['accounting', 'extending-the-platform'] },
  },
  {
    // data-and-audit#concurrency
    id: 'H2',
    en: 'What stops two people from overwriting each other’s edits, and how are duplicates detected?',
    tr: 'İki kişinin birbirinin değişikliklerinin üzerine yazması nasıl önleniyor ve yinelenen kayıtlar nasıl tespit ediliyor?',
    expect: { kind: 'answer', articles: ['data-and-audit'] },
  },
  {
    // extending-the-platform#steps
    id: 'H3',
    en: 'What steps does adding a new vertical to the architecture involve?',
    tr: 'Mimariye yeni bir dikey eklemek için hangi adımlar izlenir?',
    expect: { kind: 'answer', articles: ['extending-the-platform'] },
  },
  {
    // real-estate#search-in-code; figures-by-code#in-each-application states that the search runs in code.
    id: 'H4',
    en: 'When a visitor describes the flat they want, how does the real-estate advisor find matching listings?',
    tr: 'Bir ziyaretçi istediği daireyi tarif ettiğinde, gayrimenkul danışmanı uygun ilanları nasıl buluyor?',
    expect: { kind: 'answer', articles: ['real-estate', 'figures-by-code'] },
  },
  {
    // sales-website#sales-assistant
    id: 'H5',
    en: 'What can the assistant on the sales website do?',
    tr: 'Satış web sitesindeki asistan neler yapabiliyor?',
    expect: { kind: 'answer', articles: ['sales-website'] },
  },
  {
    // security#secrets
    id: 'H6',
    en: 'Where are secrets stored?',
    tr: 'Gizli bilgiler nerede saklanıyor?',
    expect: { kind: 'answer', articles: ['security'] },
  },
  {
    // healthcare#safety-checks
    id: 'H7',
    en: 'What happens when someone describes a medical emergency to the healthcare assistant?',
    tr: 'Sağlık asistanına acil bir tıbbi sorun yazıldığında ne olur?',
    expect: { kind: 'answer', articles: ['healthcare'] },
  },
  {
    // engineering-practice#documentation
    id: 'H8',
    en: 'How is each product documented?',
    tr: 'Her ürün nasıl belgeleniyor?',
    expect: { kind: 'answer', articles: ['engineering-practice'] },
  },
];
