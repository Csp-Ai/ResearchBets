import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';

import { resolveOddsApiBaseUrl } from './theoddsapi';

export type OddsReasonCode =
  | 'http_401'
  | 'http_403'
  | 'http_429'
  | 'timeout'
  | 'dns'
  | 'tls'
  | 'bad_base_url'
  | 'edge_runtime_blocked'
  | 'network'
  | 'unknown';

export type OddsProbeResult = {
  ok: boolean;
  runtime: 'nodejs';
  reason: OddsReasonCode | null;
  resolvedBaseHost: string | null;
  urlPath: '/v4/sports';
  queryKeys: ['apiKey'];
  status: number | null;
  statusText: string | null;
  contentType: string | null;
  bodySnippet: string | null;
  errorName: string | null;
  errorCode: string | null;
  safeMessage: string;
};

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const TLS_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID'
]);

const normalizeCode = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim().toUpperCase();
  return null;
};

const toSafeMessage = (value: string | undefined): string => {
  if (!value) return 'Odds provider unavailable';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Odds provider unavailable';
  return compact.slice(0, 140);
};

const sanitizeSnippet = (text: string, apiKey: string): string =>
  text
    .replaceAll(apiKey, '[redacted]')
    .replace(/apiKey=[^&\s]+/gi, 'apiKey=[redacted]')
    .slice(0, 200);

const classifyError = (error: unknown): Pick<OddsProbeResult, 'reason' | 'errorName' | 'errorCode' | 'safeMessage'> => {
  const typedError = error as { cause?: { code?: unknown; message?: unknown } | undefined; code?: unknown } | undefined;
  const message = error instanceof Error ? error.message : undefined;
  const errorName = error instanceof Error ? error.name : null;
  const errorCode = normalizeCode(typedError?.code) ?? normalizeCode(typedError?.cause?.code);
  const causeMessage = typeof typedError?.cause?.message === 'string' ? typedError.cause.message.toLowerCase() : '';
  const text = `${(message ?? '').toLowerCase()} ${causeMessage}`;

  if (errorCode && DNS_CODES.has(errorCode)) {
    return { reason: 'dns', errorName, errorCode, safeMessage: 'DNS resolution failed for odds provider' };
  }
  if (errorCode && TLS_CODES.has(errorCode)) {
    return { reason: 'tls', errorName, errorCode, safeMessage: 'TLS handshake failed for odds provider' };
  }
  if (errorName === 'AbortError' || errorCode === 'ETIMEDOUT' || text.includes('timeout') || text.includes('timed out')) {
    return { reason: 'timeout', errorName, errorCode, safeMessage: 'Odds provider request timed out' };
  }
  if (text.includes('edge runtime') && (text.includes('not supported') || text.includes('unsupported') || text.includes('blocked'))) {
    return { reason: 'edge_runtime_blocked', errorName, errorCode, safeMessage: 'Odds provider fetch blocked in edge runtime' };
  }
  if (text.includes('fetch failed') || text.includes('network') || text.includes('socket')) {
    return { reason: 'network', errorName, errorCode, safeMessage: 'Network request to odds provider failed' };
  }
  return { reason: 'unknown', errorName, errorCode, safeMessage: toSafeMessage(message) };
};

const mapHttpReason = (status: number): OddsReasonCode | null => {
  if (status === 401) return 'http_401';
  if (status === 403) return 'http_403';
  if (status === 429) return 'http_429';
  return null;
};

const buildProbeRequest = (): { url: string; host: string | null; apiKey: string } | { error: OddsProbeResult } => {
  const apiKey = resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]);
  const baseUrl = resolveOddsApiBaseUrl(readString(CANONICAL_KEYS.ODDS_API_BASE_URL));

  if (!apiKey) {
    return {
      error: {
        ok: false,
        runtime: 'nodejs',
        reason: 'unknown',
        resolvedBaseHost: null,
        urlPath: '/v4/sports',
        queryKeys: ['apiKey'],
        status: null,
        statusText: null,
        contentType: null,
        bodySnippet: null,
        errorName: null,
        errorCode: null,
        safeMessage: 'ODDS_API_KEY is not configured'
      }
    };
  }

  try {
    const parsed = new URL(baseUrl);
    const path = parsed.pathname.replace(/\/+$/, '');
    const withoutVersion = path.endsWith('/v4') ? path.slice(0, -3) : path;
    parsed.pathname = `${withoutVersion}/v4/sports`.replace(/\/+/g, '/');
    parsed.search = '';
    parsed.searchParams.set('apiKey', apiKey);
    return { url: parsed.toString(), host: parsed.hostname || null, apiKey };
  } catch {
    return {
      error: {
        ok: false,
        runtime: 'nodejs',
        reason: 'bad_base_url',
        resolvedBaseHost: null,
        urlPath: '/v4/sports',
        queryKeys: ['apiKey'],
        status: null,
        statusText: null,
        contentType: null,
        bodySnippet: null,
        errorName: null,
        errorCode: null,
        safeMessage: 'Odds provider base URL is invalid'
      }
    };
  }
};

export async function runOddsProbe(): Promise<OddsProbeResult> {
  const request = buildProbeRequest();
  if ('error' in request) return request.error;

  const { url, host, apiKey } = request;
  try {
    const response = await fetch(url, { method: 'GET' });
    const reason = mapHttpReason(response.status);
    const contentType = response.headers.get('content-type');
    const bodySnippet = !response.ok ? sanitizeSnippet(await response.text(), apiKey) : null;

    return {
      ok: response.ok,
      runtime: 'nodejs',
      reason,
      resolvedBaseHost: host,
      urlPath: '/v4/sports',
      queryKeys: ['apiKey'],
      status: response.status,
      statusText: response.statusText || null,
      contentType,
      bodySnippet,
      errorName: null,
      errorCode: null,
      safeMessage: response.ok ? 'Odds provider reachable' : `Odds provider returned HTTP ${response.status}`
    };
  } catch (error) {
    const classified = classifyError(error);
    return {
      ok: false,
      runtime: 'nodejs',
      reason: classified.reason,
      resolvedBaseHost: host,
      urlPath: '/v4/sports',
      queryKeys: ['apiKey'],
      status: null,
      statusText: null,
      contentType: null,
      bodySnippet: null,
      errorName: classified.errorName,
      errorCode: classified.errorCode,
      safeMessage: classified.safeMessage
    };
  }
}
