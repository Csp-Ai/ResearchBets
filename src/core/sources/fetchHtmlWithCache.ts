import { createHash, randomUUID } from 'node:crypto';

import { getRuntimeStore } from '../persistence/runtimeStoreProvider';
import { waitForRateLimit } from './rateLimit';

export const fetchHtmlWithCache = async (
  url: string,
  options: { ttlMs?: number; source: string; headers?: Record<string, string> }
): Promise<{ html: string; cacheHit: boolean; retrievedAt: string }> => {
  const ttlMs = options.ttlMs ?? 60_000;
  const runtimeStore = getRuntimeStore();
  const cached = await runtimeStore.getLatestWebCacheByUrl(url);
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age <= ttlMs) {
      return { html: cached.responseBody, cacheHit: true, retrievedAt: cached.fetchedAt };
    }
  }

  await waitForRateLimit(options.source);
  const response = await fetch(url, { headers: options.headers });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`fetchHtmlWithCache failed (${response.status})`);
  }

  const fetchedAt = new Date().toISOString();
  await runtimeStore.saveWebCache({
    id: `cache_${randomUUID()}`,
    url,
    domain: new URL(url).hostname,
    fetchedAt,
    status: response.status,
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    contentHash: createHash('sha1').update(html).digest('hex'),
    responseBody: html,
    expiresAt: new Date(Date.now() + ttlMs).toISOString()
  });

  return { html, cacheHit: false, retrievedAt: fetchedAt };
};
