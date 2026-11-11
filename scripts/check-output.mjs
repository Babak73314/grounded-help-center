#!/usr/bin/env node
/**
 * Checks the finished static export:
 *
 *   1. the files a static host needs exist — both languages, every article,
 *      the Ask page, the 404 page and the corpus the assistant loads;
 *   2. every internal link and asset resolves, `#anchors` included — so every
 *      citation the assistant can make points at a section that exists;
 *   3. every page declares its language and has a title and a description.
 *
 * Exits non-zero with a list of problems; prints a one-line summary otherwise.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT_DIR = 'out';

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** `/en/articles/x/` for `out/en/articles/x/index.html`. */
function urlPathOf(file) {
  const rel = relative(OUT_DIR, file).split(sep).join('/');
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
}

/** What the CDN serves for a path: the file, or null. A path without its trailing slash counts as broken. */
function resolvePath(path) {
  const clean = decodeURIComponent(path.split('?')[0]);
  const candidate = clean.endsWith('/') ? join(OUT_DIR, clean, 'index.html') : join(OUT_DIR, clean);
  const resolved = resolve(candidate);
  if (!resolved.startsWith(resolve(OUT_DIR))) return null;
  return existsSync(resolved) && statSync(resolved).isFile() ? resolved : null;
}

export function extractLinks(html) {
  return [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1].replace(/&amp;/g, '&'));
}

function idsOf(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
}

export function checkOutput() {
  const problems = [];
  const corpusFile = join(OUT_DIR, 'help', 'corpus.json');
  const required = ['index.html', '404.html', 'en/index.html', 'tr/index.html', 'en/ask/index.html', 'tr/ask/index.html', 'help/corpus.json'];
  for (const file of required) if (!existsSync(join(OUT_DIR, file))) problems.push(`missing: ${file}`);

  const corpus = existsSync(corpusFile) ? JSON.parse(readFileSync(corpusFile, 'utf8')) : { chunks: [] };
  const citable = new Set(corpus.chunks.map((chunk) => chunk.url));

  const htmlCache = new Map();
  const readHtml = (file) => {
    if (!htmlCache.has(file)) htmlCache.set(file, readFileSync(file, 'utf8'));
    return htmlCache.get(file);
  };

  const files = walk(OUT_DIR).filter((file) => extname(file) === '.html');
  let linksChecked = 0;
  const check = (link, where) => {
    linksChecked += 1;
    const [path, hash] = link.split('#');
    const file = resolvePath(path);
    if (!file) return problems.push(`broken link: ${link} (in ${where})`);
    if (hash && file.endsWith('.html') && !idsOf(readHtml(file)).has(hash)) problems.push(`missing anchor: ${link} (in ${where})`);
  };

  for (const file of files) {
    const html = readHtml(file);
    const pagePath = urlPathOf(file);
    for (const link of extractLinks(html)) if (link.startsWith('/') && !link.startsWith('//')) check(link, pagePath);

    const localeMatch = /^\/(en|tr)\//.exec(pagePath);
    if (localeMatch) {
      if (!html.includes(`<html lang="${localeMatch[1]}"`)) problems.push(`wrong <html lang> on ${pagePath}`);
      if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`no <title> on ${pagePath}`);
      if (!/<meta name="description" content="[^"]+"/.test(html)) problems.push(`no description on ${pagePath}`);
    }
  }
  // Every passage the assistant can cite is a section a reader can open.
  for (const url of citable) check(url, 'help/corpus.json');

  return { problems, pages: files.length, linksChecked, citable: citable.size };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { problems, pages, linksChecked, citable } = checkOutput();
  if (problems.length > 0) {
    console.error(`Output check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Output check passed: ${pages} HTML pages, ${linksChecked} internal links, ${citable} citable sections.`);
}
