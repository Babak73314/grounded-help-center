import type { Capability, Facts } from './corpus';
import { containsTerm, fold } from './text';

/**
 * The names the help center knows: glossary terms (technologies) and the
 * capabilities of the delivery-status table. Router, evidence floor and
 * answer check all find them the same way — whole terms, case and accents
 * ignored — so a name the check verifies is a name the router recognises.
 */
export interface Mention {
  id: string;
  term: string;
  /** Where the term starts in the folded text. */
  index: number;
}

/** Every place `alias` occurs in `folded` as a whole term. */
function occurrences(folded: string, alias: string): number[] {
  const needle = fold(alias).trim();
  if (!needle) return [];
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}]|\\.[\\p{L}\\p{N}])`, 'gu');
  return [...folded.matchAll(pattern)].map((match) => match.index);
}

/** Keeps only the longest of overlapping names: "Azure OpenAI Realtime" over "Azure OpenAI" over "Azure". */
function longest(mentions: Mention[]): Mention[] {
  return mentions.filter(
    (mention) =>
      !mentions.some(
        (other) =>
          other !== mention &&
          other.term.length > mention.term.length &&
          other.index <= mention.index &&
          mention.index + mention.term.length <= other.index + other.term.length,
      ),
  );
}

function allMentions(text: string, entries: ReadonlyArray<{ id: string; aliases: readonly string[] }>): Mention[] {
  const folded = fold(text);
  const found: Mention[] = [];
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      for (const index of occurrences(folded, alias)) found.push({ id: entry.id, term: fold(alias), index });
    }
  }
  return longest(found).sort((a, b) => a.index - b.index);
}

function firstPerId(mentions: Mention[]): Mention[] {
  const byId = new Map<string, Mention>();
  for (const mention of mentions) if (!byId.has(mention.id)) byId.set(mention.id, mention);
  return [...byId.values()];
}

function capabilityEntries(facts: Facts) {
  return facts.capabilities.map((capability) => ({ id: capability.id, aliases: capabilityAliases(capability) }));
}

function capabilityAliases(capability: Capability): string[] {
  return [...new Set([...capability.aliases.en, ...capability.aliases.tr])];
}

/** The glossary terms a text names, each once. */
export function termsIn(text: string, facts: Facts): Mention[] {
  return firstPerId(allMentions(text, facts.glossary));
}

/** The capabilities a text names, in either language, each once at its first mention. */
export function capabilitiesIn(text: string, facts: Facts): Mention[] {
  return firstPerId(allMentions(text, capabilityEntries(facts)));
}

/** Every mention of every capability, in order — for pairing a status label with the name nearest to it. */
export function capabilityMentions(text: string, facts: Facts): Mention[] {
  return allMentions(text, capabilityEntries(facts));
}

/** Whether a text names a capability by any of its names. */
export function namesCapability(text: string, capability: Capability): boolean {
  return capabilityAliases(capability).some((alias) => containsTerm(text, alias));
}

/** The folded text with every capability name blanked out, so "live voice" is not read as "is it live?". */
export function foldedWithoutCapabilityNames(text: string, facts: Facts): string {
  let result = fold(text);
  for (const mention of capabilityMentions(text, facts)) {
    result = `${result.slice(0, mention.index)}${' '.repeat(mention.term.length)}${result.slice(mention.index + mention.term.length)}`;
  }
  return result;
}
