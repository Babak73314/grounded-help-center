/**
 * POSTs JSON to the help center's own `/api/*`. In AWS, CloudFront signs the request to the
 * Lambda function URL behind it (Origin Access Control), and for a request
 * with a body that signature needs the body's SHA-256 from the browser, in
 * `x-amz-content-sha256`. The local server ignores the header.
 */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface ApiResponse<T> {
  status: number;
  body: T | undefined;
  retryAfter?: number;
}

export async function postJson<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
  const body = JSON.stringify(payload);
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-amz-content-sha256': await sha256Hex(body) },
    body,
    signal,
  });
  let parsed: T | undefined;
  try {
    parsed = (await response.json()) as T;
  } catch {
    parsed = undefined;
  }
  const retryAfter = Number(response.headers.get('retry-after'));
  return { status: response.status, body: parsed, ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfter } : {}) };
}

/** The API's answer while its database resumes from its idle pause: 503 with `{ error: 'warming' }` and a `Retry-After`. */
export function isWarming(response: ApiResponse<unknown>): boolean {
  return response.status === 503 && typeof response.body === 'object' && response.body !== null && (response.body as { error?: unknown }).error === 'warming';
}

/** A pause that ends early, with the signal's reason, when the signal aborts. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abortError = () => (signal?.reason as unknown) ?? new DOMException('Aborted', 'AbortError');
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface WarmingOptions {
  signal?: AbortSignal;
  /** Called each time the API says it is still waking up, so the page can say so. */
  onWarming?: () => void;
  /** How many times to ask again; the last warming answer is returned as it is. */
  maxRetries?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * POSTs, and while the API answers that its database is resuming (the first
 * request after a quiet spell; about 15 seconds), waits as long as the API
 * says — between 1 and 15 seconds — and asks again.
 */
export async function postJsonWhileWarming<T>(path: string, payload: unknown, { signal, onWarming, maxRetries = 4, sleep = wait }: WarmingOptions = {}): Promise<ApiResponse<T>> {
  for (let attempt = 0; ; attempt++) {
    const response = await postJson<T>(path, payload, signal);
    if (!isWarming(response) || attempt >= maxRetries) return response;
    onWarming?.();
    await sleep(Math.min(Math.max(response.retryAfter ?? 10, 1), 15) * 1000, signal);
  }
}
