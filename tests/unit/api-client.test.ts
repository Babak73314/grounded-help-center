import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWarming, postJsonWhileWarming, wait } from '@/lib/api-client';

/** The browser side of the database's idle pause: a 503 "warming" answer is waited out and the request repeated. */
function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

afterEach(() => vi.unstubAllGlobals());

describe('postJsonWhileWarming', () => {
  it('asks again after the wait the API names, says so each time, and returns the real answer', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply(503, { error: 'warming', retryAfter: 10 }, { 'retry-after': '10' }))
      .mockResolvedValueOnce(reply(503, { error: 'warming', retryAfter: 3 }, { 'retry-after': '3' }))
      .mockResolvedValueOnce(reply(200, { answer: { kind: 'location' } }));
    vi.stubGlobal('fetch', fetch);
    const slept: number[] = [];
    const warmings: number[] = [];
    const response = await postJsonWhileWarming<{ answer: { kind: string } }>('/api/ask', { question: 'Where?', locale: 'en' }, {
      onWarming: () => void warmings.push(1),
      sleep: async (ms) => void slept.push(ms),
    });
    expect(response.status).toBe(200);
    expect(response.body?.answer.kind).toBe('location');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(slept).toEqual([10_000, 3_000]);
    expect(warmings).toHaveLength(2);
    // The same body and its SHA-256 go out every time.
    const bodies = fetch.mock.calls.map(([, init]) => init?.body);
    expect(new Set(bodies).size).toBe(1);
  });

  it('keeps the wait between 1 and 15 seconds whatever the API says, and gives up after the retries allowed', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => reply(503, { error: 'warming' }, { 'retry-after': '600' }));
    vi.stubGlobal('fetch', fetch);
    const slept: number[] = [];
    const response = await postJsonWhileWarming('/api/contact', {}, { maxRetries: 2, sleep: async (ms) => void slept.push(ms) });
    expect(isWarming(response)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(slept).toEqual([15_000, 15_000]);
  });

  it('returns any other answer at once — an outage is not a warm-up', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(reply(503, { error: 'unavailable' }));
    vi.stubGlobal('fetch', fetch);
    const sleep = vi.fn(async () => undefined);
    const response = await postJsonWhileWarming('/api/ask', {}, { sleep });
    expect(response.status).toBe(503);
    expect(isWarming(response)).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('stops waiting when the visitor moves on', async () => {
    const controller = new AbortController();
    const pending = wait(60_000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(wait(60_000, AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' });
    await expect(wait(1)).resolves.toBeUndefined();
  });
});
