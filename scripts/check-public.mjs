#!/usr/bin/env node
/**
 * The publication guard: scans every file the repository tracks for what a
 * public repository must not contain — e-mail addresses, telephone numbers,
 * URLs (other than links to the author's own GitHub repositories and the
 * local server's loopback address), domain names, AWS account ids, ARNs,
 * access keys, environment files and CDK context files.
 *
 * The patterns are generic on purpose: a list of specific names to look for
 * would itself publish those names.
 *
 * Lockfiles are package metadata written by npm (integrity hashes and the
 * packages' own funding links); they are listed, not scanned.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * The author's GitHub repositories, the local server's loopback address, and
 * a scheme in front of a value filled in at run time (`https://${domainName}`),
 * which names no address itself.
 */
const ALLOWED_URL = /^(https:\/\/github\.com\/Babak73314\/[A-Za-z0-9._-]+|https?:\/\/(127\.0\.0\.1|localhost)(?![\w.-])|https?:\/\/(www\.)?\$\{)/;
const ALLOWED_DOMAINS = new Set(['github.com', 'asp.net']);

export const RULES = [
  {
    id: 'e-mail address',
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    id: 'telephone number',
    pattern: /\+?\d[\d\s().-]{8,}\d/g,
    keep: (match) => match.replace(/\D/g, '').length >= 10 && /[\s().-]|^\+/.test(match),
  },
  { id: 'AWS account id', pattern: /(?<![\w.-])\d{12}(?![\w.-])/g },
  { id: 'ARN', pattern: /\barn:aws[a-z-]*:[a-z0-9-]*:/g },
  { id: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    id: 'URL',
    pattern: /\b(?:https?|ftp):\/\/[^\s"'`)<>\]]+/g,
    keep: (match) => !ALLOWED_URL.test(match),
  },
  {
    id: 'domain name',
    // Common top-level domains. Country codes that are also property names in this code (`tr`, `de`) are left out;
    // a domain under a country code is still caught by its second level (`com`, `co`).
    pattern: /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|ai|cloud|co|uk|eu|info|biz)\b/gi,
    keep: (match, text, index) => {
      const lower = match.toLowerCase();
      if (ALLOWED_DOMAINS.has(lower)) return false;
      // A domain that is part of an allowed URL was judged with the URL.
      const start = text.lastIndexOf('://', index);
      const before = start >= 0 ? text.slice(Math.max(0, text.lastIndexOf(' ', start) + 1), index) : '';
      return !ALLOWED_URL.test(`${before}${match}`);
    },
  },
];

const FORBIDDEN_FILES = [/(^|\/)\.env(?!\.example$)[^/]*$/, /(^|\/)cdk\.context\.json$/, /\.(pem|key|p12|pfx)$/];
const LOCKFILE = /(^|\/)package-lock\.json$/;
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|pdf|zip)$/i;

/** Every problem in one text: `{ rule, match, line }`. */
export function findProblems(text) {
  const problems = [];
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.keep && !rule.keep(match[0], text, match.index)) continue;
      problems.push({ rule: rule.id, match: match[0], line: text.slice(0, match.index).split('\n').length });
    }
  }
  return problems;
}

export function trackedFiles(root = '.') {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .filter((file) => existsSync(file) && statSync(file).isFile());
}

export function checkPublic(files) {
  const problems = [];
  const lockfiles = [];
  for (const file of files) {
    if (FORBIDDEN_FILES.some((pattern) => pattern.test(file))) problems.push(`${file}: a file that must not be published`);
    if (LOCKFILE.test(file)) {
      lockfiles.push(file);
      continue;
    }
    if (BINARY.test(file)) continue;
    for (const problem of findProblems(readFileSync(file, 'utf8'))) {
      problems.push(`${file}:${problem.line}: ${problem.rule} "${problem.match}"`);
    }
  }
  return { problems, scanned: files.length - lockfiles.length, lockfiles };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { problems, scanned, lockfiles } = checkPublic(trackedFiles());
  if (problems.length > 0) {
    console.error(`Publication check failed (${problems.length}):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Publication check passed: ${scanned} files scanned; lockfiles listed, not scanned: ${lockfiles.join(', ')}.`);
}
