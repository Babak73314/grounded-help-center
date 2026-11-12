import type { Locale } from './corpus';

/**
 * Folds case and diacritics, so "cozum" finds "Çözüm" and "İstanbul" finds
 * "istanbul". Turkish casing comes first: dotted and dotless i both end up as
 * a plain "i".
 */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

const STOP_WORDS = new Set([
  // English
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'for',
  'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'many', 'may', 'me', 'might',
  'much', 'my', 'of', 'on', 'or', 'our', 'should', 'so', 'tell', 'that', 'the', 'their', 'there', 'they', 'this',
  'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
  'about', 'also', 'not', 'no', 'yes',
  // Turkish (folded)
  've', 'veya', 'bir', 'bu', 'su', 'mi', 'mu', 'midir', 'ne', 'nedir', 'neler', 'nelerdir', 'nasil', 'neden', 'niye',
  'icin', 'ile', 'da', 'de', 'ki', 'hangi', 'hangisi', 'var', 'yok', 'kac', 'o', 'olan', 'olarak', 'gibi', 'daha',
  'cok', 'en', 'hakkinda', 'mudur', 'misin', 'musun', 'ben', 'biz', 'sen', 'siz',
]);

/** Words for search: folded, letters and digits only, no stop words, at least two characters. */
export function searchWords(text: string): string[] {
  const words = fold(text).match(/[a-z0-9#+.]+/g) ?? [];
  return [
    ...new Set(
      words
        .map((word) => word.replace(/^\.+|\.+$/g, ''))
        .filter((word) => word.length >= 2 && !STOP_WORDS.has(word)),
    ),
  ];
}

/**
 * The prefix a word is matched by. English and Turkish both build words by
 * adding endings (deploy → deployed, çözüm → çözümde), so a word longer than
 * four letters is matched by its first letters, up to six, leaving at least
 * two off: "deployed" → "deploy", "çözümde" → "cozum", "anahtarları" →
 * "anahta". Shorter words are matched whole.
 */
export function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.slice(0, Math.max(4, Math.min(6, word.length - 2)));
}

/** The stem of every searchable word in a text, in order and with repeats: letters and digits only, no stop words. */
export function stemSequence(text: string): string[] {
  return (fold(text).match(/[a-z0-9#+.]+/g) ?? [])
    .map((word) => word.replace(/^\.+|\.+$/g, ''))
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
    .map((word) => stem(word.replace(/[^a-z0-9]/g, '')))
    .filter((word) => word.length >= 2);
}

/** The distinct stems of the searchable words in a text. */
export function stems(text: string): string[] {
  return [...new Set(stemSequence(text))];
}

/**
 * A `to_tsquery('simple', …)` expression matching any of the question's
 * stems as a prefix (`deploy:* | cozum:*`). Only `[a-z0-9]` survive into it,
 * so nothing a visitor types can be tsquery syntax. Empty when nothing
 * searchable is left.
 */
export function prefixQuery(text: string): string {
  return prefixTerms(stems(text)).join(' | ');
}

/** One `to_tsquery('simple', …)` prefix term per stem (`deploy:*`), at most 24, and only stems of `[a-z0-9]`. */
export function prefixTerms(terms: readonly string[]): string[] {
  return terms
    .filter((term) => /^[a-z0-9]+$/.test(term))
    .slice(0, 24)
    .map((term) => `${term}:*`);
}

/** Whether a stem starts any word of an already folded text. */
export function hasStem(foldedText: string, term: string): boolean {
  return new RegExp(`(?<![a-z0-9])${term.replace(/[^a-z0-9]/g, '')}`).test(foldedText);
}

/**
 * Splits an answer into sentences. A short fragment without a citation
 * ("e.g.", a version number) is joined to the fragment after it, so it does
 * not count as a sentence of its own. A fragment that carries a citation is
 * always a sentence of its own, and nothing is ever joined to the sentence
 * before it — otherwise a short cited sentence could carry an uncited claim
 * through the check.
 */
/** Where one sentence ends and the next begins: after a full stop, question or exclamation mark and a space. */
export const SENTENCE_BREAK = /(?<=[.!?…])\s+(?=[^\s])/;

export function sentences(text: string): string[] {
  const pieces = text.replace(/\s+/g, ' ').trim().split(SENTENCE_BREAK);
  const result: string[] = [];
  let carry = '';
  for (const piece of pieces) {
    const joined = carry ? `${carry} ${piece}` : piece;
    if (!/\[\d+\]/.test(joined) && joined.trim().length < 20) {
      carry = joined;
      continue;
    }
    result.push(joined);
    carry = '';
  }
  if (carry) result.push(carry);
  return result.filter((sentence) => sentence.trim() !== '');
}

const ENGLISH_MARKERS = new Set(['the', 'and', 'with', 'for', 'of', 'is', 'are', 'was', 'has', 'on', 'in', 'a', 'an', 'to', 'that', 'it', 'as', 'from', 'by', 'which', 'its', 'every', 'never', 'no', 'not']);
const TURKISH_MARKERS = new Set(['ve', 'bir', 'bu', 'ile', 'icin', 'olarak', 'da', 'de', 'olan', 'gibi', 'ise', 'veya', 'her', 'hic', 'degil', 'yok', 'uzerinde', 'tarafindan', 'kadar', 'sonra', 'once']);

/** Which of the two languages a text is written in, by its function words. */
export function detectLocale(text: string): Locale | 'unknown' {
  // Lower-cased without Turkish rules, so an English "I" does not become the Turkish dotless "ı".
  const raw = text.toLowerCase();
  const words = fold(text).match(/[a-z]+/g) ?? [];
  let english = 0;
  let turkish = /[çğışöü]/.test(raw) ? 2 : 0;
  for (const word of words) {
    if (ENGLISH_MARKERS.has(word)) english += 1;
    if (TURKISH_MARKERS.has(word)) turkish += 1;
  }
  if (english === turkish) return 'unknown';
  return english > turkish ? 'en' : 'tr';
}

/** Whether `needle` occurs in `haystack` as a whole term (not inside a longer word), ignoring case and accents. */
export function containsTerm(haystack: string, needle: string): boolean {
  return termIndex(haystack, needle) !== -1;
}

/** Where `needle` first occurs in `haystack` as a whole term, in the folded text, or -1. */
export function termIndex(haystack: string, needle: string): number {
  const folded = fold(needle).trim();
  if (!folded) return -1;
  const escaped = folded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}]|\\.[\\p{L}\\p{N}])`, 'u').exec(fold(haystack));
  return match ? match.index : -1;
}
