import { statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export type StaticResult = { status: 200 | 404; file: string } | { status: 301; location: string };

/**
 * Maps a request path to what the CDN answers for the static export:
 * `/path/` serves `/path/index.html`, `/path` (no extension) redirects to
 * `/path/`, anything missing — or outside the folder — answers 404.
 */
export function resolveStatic(root: string, rawPath: string): StaticResult {
  const absoluteRoot = resolve(root);
  const notFound: StaticResult = { status: 404, file: join(absoluteRoot, '404.html') };
  const query = /\?[^#]*/.exec(rawPath)?.[0] ?? '';
  let path: string;
  try {
    path = decodeURIComponent(rawPath.split(/[?#]/)[0] || '/');
  } catch {
    return notFound;
  }
  if (path.includes('\0') || !path.startsWith('/') || path.startsWith('//') || path.split(/[\\/]/).includes('..')) return notFound;

  let candidate: string;
  if (path.endsWith('/')) candidate = join(absoluteRoot, path, 'index.html');
  else if (extname(path) === '') return { status: 301, location: `${path}/${query}` };
  else candidate = join(absoluteRoot, path);

  const resolved = resolve(candidate);
  if (resolved !== absoluteRoot && !resolved.startsWith(absoluteRoot + sep)) return notFound;
  return isFile(resolved) ? { status: 200, file: resolved } : notFound;
}
