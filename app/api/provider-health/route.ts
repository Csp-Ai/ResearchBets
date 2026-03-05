import { NextResponse } from 'next/server';

import { getBoardData } from '@/src/core/board/boardService.server';
import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';
import { resolveOddsApiBaseUrl } from '@/src/core/providers/theoddsapi';

type OddsReasonCode =
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

type OddsCheck = {
  provider: 'odds';
  ok: boolean;
  reason: OddsReasonCode | null;
  statusCode: number | null;
  resolvedBaseHost: string | null;
  runtime: 'nodejs' | 'edge';
  errorName: string | null;
  safeMessage: string | null;
};

type DerivedOddsError = { reason: OddsReasonCode; statusCode: number | null; safeMessage: string; errorName: string | null };

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const TLS_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID'
]);

const timeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), timeoutMs));
  return Promise.race([promise, timeoutPromise]);
};

const normalizeCode = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim().toUpperCase();
  return null;
};

const safeErrorMessage = (value: string | undefined): string => {
  if (!value) return 'Odds provider unavailable';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Odds provider unavailable';
  return normalized.slice(0, 120);
};

const resolveBaseHost = (): { host: string | null; invalid: boolean } => {
  const baseUrl = resolveOddsApiBaseUrl(readString(CANONICAL_KEYS.ODDS_API_BASE_URL));
  try {
    return { host: new URL(baseUrl).hostname || null, invalid: false };
  } catch {
    return { host: null, invalid: true };
  }
};

const deriveOddsError = (error: unknown): DerivedOddsError => {
  const message = error instanceof Error ? error.message : undefined;
  const source = (message ?? '').toLowerCase();
  const errorName = error instanceof Error ? error.name : null;
  const typedError = error as { cause?: { code?: unknown; message?: unknown } | undefined; code?: unknown } | undefined;
  const code = normalizeCode(typedError?.code) ?? normalizeCode(typedError?.cause?.code);
  const causeMessage = typeof typedError?.cause?.message === 'string' ? typedError.cause.message.toLowerCase() : '';
  const text = `${source} ${causeMessage}`;

  const statusMatch = text.match(/\b(401|403|429)\b/);
  if (statusMatch) {
    const statusCode = Number(statusMatch[1]);
    if (statusCode === 401) {
      return { reason: 'http_401', statusCode, safeMessage: 'Unauthorized response from odds provider', errorName };
    }
    if (statusCode === 403) {
      return { reason: 'http_403', statusCode, safeMessage: 'Forbidden response from odds provider', errorName };
    }
    if (statusCode === 429) {
      return { reason: 'http_429', statusCode, safeMessage: 'Rate limited by odds provider', errorName };
    }
  }

  if (code && DNS_CODES.has(code)) {
    return { reason: 'dns', statusCode: null, safeMessage: 'DNS resolution failed for odds provider', errorName };
  }

  if (code && TLS_CODES.has(code)) {
    return { reason: 'tls', statusCode: null, safeMessage: 'TLS handshake failed for odds provider', errorName };
  }

  if (errorName === 'AbortError' || code === 'ETIMEDOUT' || text.includes('timeout') || text.includes('timed out')) {
    return { reason: 'timeout', statusCode: null, safeMessage: 'Odds provider request timed out', errorName };
  }

  if (text.includes('only absolute urls') || text.includes('invalid url') || text.includes('failed to parse url')) {
    return { reason: 'bad_base_url', statusCode: null, safeMessage: 'Odds provider base URL is invalid', errorName };
  }

  if (text.includes('edge runtime') && (text.includes('not supported') || text.includes('unsupported') || text.includes('blocked'))) {
    return { reason: 'edge_runtime_blocked', statusCode: null, safeMessage: 'Odds provider fetch blocked in edge runtime', errorName };
  }

  if (text.includes('fetch failed') || text.includes('network') || text.includes('socket')) {
    return { reason: 'network', statusCode: null, safeMessage: 'Network request to odds provider failed', errorName };
  }

  return {
    reason: 'unknown',
    statusCode: null,
    safeMessage: safeErrorMessage(message),
    errorName
  };
};

async function emitFallbackEvent(providerErrors: string[], startedAt: number) {
  await new DbEventEmitter().emit({
    event_name: 'live_poll_degraded',
    timestamp: new Date().toISOString(),
    request_id: 'provider-health',
    trace_id: 'provider-health',
    agent_id: 'provider-health',
    model_version: 'v1',
    properties: {
      providerErrors,
      latency_bucket: Date.now() - startedAt > 2000 ? 'slow' : 'fast'
    }
  });
}

export async function GET() {
  const startedAt = Date.now();
  const keyStatus = getLiveKeyStatus();
  const baseHost = resolveBaseHost();
  const runtime: 'nodejs' | 'edge' = 'nodejs';
  const checks = {
    odds: {
      provider: 'odds',
      ok: false,
      reason: baseHost.invalid ? 'bad_base_url' : 'unknown',
      statusCode: null,
      resolvedBaseHost: baseHost.host,
      runtime,
      errorName: null,
      safeMessage: baseHost.invalid ? 'Odds provider base URL is invalid' : null
    } as OddsCheck,
    stats: resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]) ? 'configured' : 'missing',
    liveModeEnv: readString(CANONICAL_KEYS.LIVE_MODE) ?? 'unset'
  };

  if (baseHost.invalid) {
    return NextResponse.json({
      ok: false,
      keyStatus,
      checks,
      mode: 'demo',
      reason: 'provider_unavailable',
      providerErrors: ['Odds provider base URL is invalid'],
      runtime,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? 'unset'
    });
  }

  try {
    const board = await timeout(getBoardData({ sport: 'NBA', tz: 'America/Phoenix' }), 3500);
    const primaryProviderError = board.providerErrors?.[0] ? new Error(board.providerErrors[0]) : undefined;
    const derived = deriveOddsError(primaryProviderError);

    checks.odds = {
      provider: 'odds',
      ok: board.mode === 'live',
      reason: board.mode === 'live' ? null : derived.reason,
      statusCode: board.mode === 'live' ? null : derived.statusCode,
      resolvedBaseHost: baseHost.host,
      runtime,
      errorName: board.mode === 'live' ? null : derived.errorName,
      safeMessage: board.mode === 'live' ? null : derived.safeMessage
    };

    if (keyStatus.requiredKeysPresent && keyStatus.liveModeEnabled && board.mode !== 'live') {
      await emitFallbackEvent(board.providerErrors ?? ['provider_unavailable'], startedAt);
    }

    return NextResponse.json({
      ok: board.mode === 'live',
      keyStatus,
      checks,
      mode: board.mode,
      reason: board.mode === 'live' ? board.reason : 'provider_unavailable',
      providerErrors: board.mode === 'live' ? board.providerErrors : [derived.safeMessage],
      runtime,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? 'unset'
    });
  } catch (error) {
    const derived = deriveOddsError(error);
    checks.odds = {
      provider: 'odds',
      ok: false,
      reason: derived.reason,
      statusCode: derived.statusCode,
      resolvedBaseHost: baseHost.host,
      runtime,
      errorName: derived.errorName,
      safeMessage: derived.safeMessage
    };

    const eventMessage = error instanceof Error ? error.message : 'provider_unavailable';
    await emitFallbackEvent([eventMessage], startedAt);
    return NextResponse.json({
      ok: false,
      keyStatus,
      checks,
      mode: 'demo',
      reason: 'provider_unavailable',
      providerErrors: [derived.safeMessage],
      runtime,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? 'unset'
    });
  }
}
