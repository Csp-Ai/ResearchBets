import { createHash, randomUUID } from 'node:crypto';

import type { RuntimeStore, WebCacheRecord } from '../persistence/runtimeStore';

import { walConfig } from './config';

const domainLastHit = new Map<string, number>();

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hashBody = (body: string): string => createHash('sha256').update(body).digest('hex');

export interface FetchResponse {
  url: string;
  domain: string;
  status: number;
  body: string;
  fetchedAt: string;
  etag: string | null;
  lastModified: string | null;
  contentHash: string;
}

const normalizeDomain = (url: string): string => new URL(url).hostname.toLowerCase();

const enforceDomainPolicy = (domain: string): void => {
  if (walConfig.blocklist.includes(domain)) throw new Error(`domain_blocked:${domain}`);
  if (walConfig.allowlist.length > 0 && !walConfig.allowlist.includes(domain)) {
    throw new Error(`domain_not_allowlisted:${domain}`);
  }
};

const enforceRateLimit = async (domain: string): Promise<void> => {
  const limit = walConfig.rateLimitsMs[domain] ?? 1000;
  const last = domainLastHit.get(domain) ?? 0;
  const jitter = Math.floor(Math.random() * 200);
  const waitMs = last + limit + jitter - Date.now();
  if (waitMs > 0) await wait(waitMs);
  domainLastHit.set(domain, Date.now());
};

export const fetchWithCache = async (url: string, store: RuntimeStore): Promise<FetchResponse> => {
  const domain = normalizeDomain(url);
  enforceDomainPolicy(domain);
  await enforceRateLimit(domain);

  const cached = await store.getLatestWebCacheByUrl(url);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  let attempt = 0;
  while (attempt < walConfig.maxRetries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), walConfig.timeoutMs);
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 304 && cached) {
        return {
          url,
          domain,
          status: 304,
          body: cached.responseBody,
          fetchedAt: new Date().toISOString(),
          etag: cached.etag,
          lastModified: cached.lastModified,
          contentHash: cached.contentHash,
        };
      }

      const body = await response.text();
      const fetchedAt = new Date().toISOString();
      const record: WebCacheRecord = {
        id: randomUUID(),
        url,
        domain,
        fetchedAt,
        status: response.status,
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        contentHash: hashBody(body),
        responseBody: body,
        expiresAt: null,
      };
      await store.saveWebCache(record);

      return {
        url,
        domain,
        status: response.status,
        body,
        fetchedAt,
        etag: record.etag,
        lastModified: record.lastModified,
        contentHash: record.contentHash,
      };
    } catch (error) {
      attempt += 1;
      if (attempt >= walConfig.maxRetries) throw error;
      await wait(attempt * 250);
    }
  }

  throw new Error('unreachable');
};
