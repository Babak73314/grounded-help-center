import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { viewerRequestCode } from '../lib/help-center-stack';

type Header = { value: string };
interface CloudFrontRequest {
  uri: string;
  headers: Record<string, Header>;
  cookies?: Record<string, Header>;
  querystring: Record<string, { value: string; multiValue?: Array<{ value: string }> }>;
}
interface CloudFrontResponse {
  statusCode: number;
  headers: Record<string, Header>;
}

const source = readFileSync(fileURLToPath(new URL('../lib/viewer-request.js', import.meta.url)), 'utf8');

/** Loads the function the way CloudFront runs it: a script defining `handler`. */
function load(canonicalHost: string) {
  const code = viewerRequestCode(canonicalHost === '' ? undefined : canonicalHost);
  return new Function(`${code}\nreturn handler;`)() as (event: { request: CloudFrontRequest }) => CloudFrontRequest | CloudFrontResponse;
}

function request(uri: string, headers: Record<string, string> = {}, cookies: Record<string, string> = {}): CloudFrontRequest {
  return {
    uri,
    headers: Object.fromEntries(Object.entries({ host: 'help-center.example', ...headers }).map(([k, v]) => [k, { value: v }])),
    cookies: Object.fromEntries(Object.entries(cookies).map(([k, v]) => [k, { value: v }])),
    querystring: {},
  };
}

/** A reserved example name (it can never resolve), standing in for a custom domain. */
const HOST = 'help-center.example';
const handler = load(HOST);

function location(result: CloudFrontRequest | CloudFrontResponse) {
  return 'statusCode' in result ? [result.statusCode, result.headers.location?.value] : ['request', result.uri];
}

describe('viewer-request function', () => {
  it('serves a directory from its index.html', () => {
    expect(location(handler({ request: request('/en/articles/') }))).toEqual(['request', '/en/articles/index.html']);
  });

  it('leaves files alone', () => {
    expect(location(handler({ request: request('/help/corpus.json') }))).toEqual(['request', '/help/corpus.json']);
    expect(location(handler({ request: request('/_next/static/chunks/a.js') }))).toEqual(['request', '/_next/static/chunks/a.js']);
  });

  it('adds the trailing slash, keeping the query string', () => {
    const r = request('/en/articles');
    r.querystring = { ref: { value: 'home' } };
    expect(location(handler({ request: r }))).toEqual([301, '/en/articles/?ref=home']);
  });

  it('sends / to the language the browser prefers', () => {
    expect(location(handler({ request: request('/', { 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8' }) }))).toEqual([302, '/tr/']);
    expect(location(handler({ request: request('/', { 'accept-language': 'en-GB,en;q=0.9,tr;q=0.5' }) }))).toEqual([302, '/en/']);
    expect(location(handler({ request: request('/', { 'accept-language': 'de-DE,de;q=0.9,tr;q=0.4' }) }))).toEqual([302, '/tr/']);
    expect(location(handler({ request: request('/', { 'accept-language': 'de-DE,fr;q=0.9' }) }))).toEqual([302, '/en/']);
    expect(location(handler({ request: request('/', { 'accept-language': 'tr;q=0' }) }))).toEqual([302, '/en/']);
    expect(location(handler({ request: request('/') }))).toEqual([302, '/en/']);
  });

  it('prefers a remembered choice over the browser', () => {
    const r = request('/', { 'accept-language': 'en-US' }, { 'preferred-locale': 'tr' });
    expect(location(handler({ request: r }))).toEqual([302, '/tr/']);
    const bogus = request('/', { 'accept-language': 'tr' }, { 'preferred-locale': 'xx' });
    expect(location(handler({ request: bogus }))).toEqual([302, '/tr/']);
  });

  it('sends every other host to the canonical domain', () => {
    expect(location(handler({ request: request('/en/', { host: 'www.help-center.example' }) }))).toEqual([301, `https://${HOST}/en/`]);
    expect(location(handler({ request: request('/en/', { host: 'distribution.example' }) }))).toEqual([301, `https://${HOST}/en/`]);
  });

  it('never redirects to another site', () => {
    expect(location(handler({ request: request('//other-host.example') }))).toEqual([301, '/other-host.example']);
    expect(location(handler({ request: request('/en//x') }))).toEqual([301, '/en/x']);
  });

  it('refuses a domain that is not a plain host name', () => {
    expect(() => viewerRequestCode("help-center.example'; alert(1); '")).toThrow(/host name/);
    expect(() => viewerRequestCode('Help-Center.Example')).toThrow(/lower-case/);
    expect(source).toContain('function handler(event)');
  });

  it('works without a custom domain', () => {
    const plain = load('');
    expect(location(plain({ request: request('/en/', { host: 'distribution.example' }) }))).toEqual(['request', '/en/index.html']);
  });
});
