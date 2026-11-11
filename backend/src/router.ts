import type { Facts } from './corpus';
import { fold } from './text';
import { capabilitiesIn, foldedWithoutCapabilityNames } from './vocabulary';

/**
 * Decides, before any retrieval or writer is involved, how a question is
 * answered:
 *
 * - questions the help center has no content for by design — prices,
 *   support channels, account actions, release plans — are declined by code;
 * - "is X live / deployed / a demo?" is answered by code from the
 *   delivery-status table, exactly as the table states it;
 * - everything else goes to retrieval, the evidence floor and the writer.
 *
 * The patterns are deliberately narrow: a question routed to retrieval by
 * mistake still gets a checked answer or a refusal, while a question wrongly
 * routed to a fixed answer gets the wrong one.
 */
export type OutOfScopeTopic = 'pricing' | 'contact' | 'account' | 'roadmap';

export type Route = { kind: 'out-of-scope'; topic: OutOfScopeTopic } | { kind: 'status'; capabilities: string[] } | { kind: 'grounded' };

const OUT_OF_SCOPE: Array<[OutOfScopeTopic, RegExp]> = [
  [
    'pricing',
    /(how much (does|do|is|would|will)\b.*\b(cost|charge|pay)|\bpricing\b|\bsubscriptions?\b|\blicen[cs]e (fee|cost|price)s?\b|\b(price|cost) of (the )?(platform|license|licence|subscription|it)\b|what does (the platform|it) cost|kac para|fiyatlandirma\w*|abonelik\w*|platformun (fiyati|ucreti|maliyeti)|(fiyati|ucreti|maliyeti) ne kadar|lisans (ucreti|bedeli))/,
  ],
  [
    'contact',
    /(\bphone\b|\btelephone\b|\be-?mail\b|\bcontact\b|customer service|help ?desk|support (team|channel|line|number|address)|how (can|do) i reach|\btelefon\w*|e-?posta\w*|iletisim\w*|musteri hizmetleri|destek (ekibi|hatti|numara\w*|adres\w*|kanal\w*)|nasil ulas\w*)/,
  ],
  [
    'account',
    /(password|passcode|reset my|my account|create an account|\bsign[ -]?up\b|how (do|can) i (log|sign) ?(in|on)\b|\bsifre\w*|\bparola\w*|hesabim\w*|hesap (olustur|ac)\w*|nasil giris yap\w*)/,
  ],
  [
    'roadmap',
    /(next (version|release)|(new|upcoming|future) (version|release|feature)s?|release date|roadmap|when (will|is|does)\b.*\b(release|launch|ship|come out)|sonraki surum\w*|yeni surum\w*|yol harita\w*|ne zaman (yayim|cik|gel)\w*|(yayim|cikis) tarih\w*)/,
  ],
];

/** "Is it live / deployed / a demo / on?" — asked of a named capability. Applied with the capability names blanked out. */
const STATUS =
  /(\blive\b|\bdeploy\w*|\bproduction\b|\bstatus\b|\bstate\b|\brunning\b|\blaunched\b|\bdemo\b|\blocal\b|by default|\bswitched (on|off)\b|\bturned (on|off)\b|\benabled\b|\byayinda\b|\byayina\b|\bcanli\b|\bdagit\w*|\bdurum\w*|\bdemo\w*|\byerel\b|\bvarsayilan\w*|\betkin\b|\bacik mi\b|\bkapali\b)/;
/** Questions that ask how or why want the explanation in an article, not the table row. */
const EXPLAIN = /(^|[^a-z])(how|why|explain|describe|nasil|neden|niye|acikla\w*|anlat\w*)([^a-z]|$)/;

export function route(question: string, facts: Facts): Route {
  const q = fold(question);
  for (const [topic, pattern] of OUT_OF_SCOPE) if (pattern.test(q)) return { kind: 'out-of-scope', topic };

  const capabilities = capabilitiesIn(question, facts).map((mention) => mention.id);
  if (capabilities.length > 0 && !EXPLAIN.test(q) && STATUS.test(foldedWithoutCapabilityNames(question, facts))) {
    return { kind: 'status', capabilities: capabilities.slice(0, 2) };
  }
  return { kind: 'grounded' };
}
