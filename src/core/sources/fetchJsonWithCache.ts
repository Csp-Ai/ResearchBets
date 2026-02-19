import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getRuntimeStore } from '../persistence/runtimeStoreProvider';
import { waitForRateLimit } from './rateLimit';

interface FetchJsonWithCacheOptions {
  ttlMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
  source: string;
  rateLimit?: { capacity: number; refillPerSecond: number };
  headers?: Record<string, string>;
  cacheDir?: string;
}

const buildUrl = (url: string, params?: FetchJsonWithCacheOptions['params']): string => {
  if (!params) return url;
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) parsed.searchParams.set(key, String(value));
  });
  return parsed.toString();
};

const fileCachePath = (cacheDir: string, key: string): string => path.join(cacheDir, `${key}.json`);

export const fetchJsonWithCache = async <T>(
  url: string,
  options: FetchJsonWithCacheOptions
): Promise<{ data: T; cacheHit: boolean; retrievedAt: string; url: string }> => {
  const ttlMs = options.ttlMs ?? 60_000;
  const requestUrl = buildUrl(url, options.params);
  const nowMs = Date.now();
  const runtimeStore = getRuntimeStore();

  const cached = await runtimeStore.getLatestWebCacheByUrl(requestUrl);
  if (cached?.responseBody) {
    const age = nowMs - new Date(cached.fetchedAt).getTime();
    if (age <= ttlMs) {
      return {
        data: JSON.parse(cached.responseBody) as T,
        cacheHit: true,
        retrievedAt: cached.fetchedAt,
        url: requestUrl
      };
    }
  }

  if (options.cacheDir) {
    const cacheKey = createHash('sha1').update(requestUrl).digest('hex');
    const target = fileCachePath(options.cacheDir, cacheKey);
    try {
      const text = await fs.readFile(target, 'utf8');
      const parsed = JSON.parse(text) as { fetchedAt: string; body: T };
      if (nowMs - new Date(parsed.fetchedAt).getTime() <= ttlMs) {
        return { data: parsed.body, cacheHit: true, retrievedAt: parsed.fetchedAt, url: requestUrl };
      }
    } catch {
      // no-op
    }
  }

  await waitForRateLimit(options.source, options.rateLimit);
  const response = await fetch(requestUrl, { headers: options.headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`fetchJsonWithCache failed (${response.status}) for ${requestUrl}`);
  }

  const retrievedAt = new Date().toISOString();
  await runtimeStore.saveWebCache({
    id: `cache_${randomUUID()}`,
    url: requestUrl,
    domain: new URL(requestUrl).hostname,
    fetchedAt: retrievedAt,
    status: response.status,
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    contentHash: createHash('sha1').update(text).digest('hex'),
    responseBody: text,
    expiresAt: new Date(Date.now() + ttlMs).toISOString()
  });

  if (options.cacheDir) {
    await fs.mkdir(options.cacheDir, { recursive: true });
    const cacheKey = createHash('sha1').update(requestUrl).digest('hex');
    await fs.writeFile(
      fileCachePath(options.cacheDir, cacheKey),
      JSON.stringify({ fetchedAt: retrievedAt, body: JSON.parse(text) }, null, 2),
      'utf8'
    );
  }

  return { data: JSON.parse(text) as T, cacheHit: false, retrievedAt, url: requestUrl };
};
