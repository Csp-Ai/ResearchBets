import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';

import { buildOddsEventsUrl, resolveOddsApiBaseUrl } from './theoddsapi';

export type EventsProbeResult = {
  ok: boolean;
  reason: string | null;
  status: number | null;
  resolvedBaseHost: string | null;
  safeMessage: string;
  safeDetail?: string;
};

const sanitizeMessage = (value: string | undefined): string => {
  if (!value) return 'Events provider unavailable';
  return value.replace(/https?:\/\/\S+/gi, '[redacted-url]').replace(/\s+/g, ' ').trim().slice(0, 140) || 'Events provider unavailable';
};

const sanitizeDetailSnippet = (value: string, apiKey: string): string =>
  value
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replaceAll(apiKey, '[redacted]')
    .replace(/apiKey\s*[=:]\s*[^\s&]+/gi, 'apiKey=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

const buildRequest = (sport: string): { url: string; host: string | null; apiKey: string } | { error: EventsProbeResult } => {
  const apiKey = resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]);
  if (!apiKey) {
    return { error: { ok: false, reason: 'missing_key', status: null, resolvedBaseHost: null, safeMessage: 'ODDS_API_KEY is not configured' } };
  }

  const baseUrl = resolveOddsApiBaseUrl(readString(CANONICAL_KEYS.ODDS_API_BASE_URL));
  try {
    const parsed = new URL(baseUrl);
    const url = buildOddsEventsUrl({ baseUrl, sport, apiKey });
    return { url, host: parsed.hostname || null, apiKey };
  } catch {
    return { error: { ok: false, reason: 'bad_base_url', status: null, resolvedBaseHost: null, safeMessage: 'Odds provider base URL is invalid' } };
  }
};

export async function runEventsProbe(input: { sport: string } = { sport: 'NBA' }): Promise<EventsProbeResult> {
  const request = buildRequest(input.sport);
  if ('error' in request) return request.error;
  try {
    const response = await fetch(request.url, { method: 'GET' });
    const safeDetail = response.ok
      ? undefined
      : sanitizeDetailSnippet(await response.text().catch(() => ''), request.apiKey) || undefined;

    return {
      ok: response.ok,
      reason: response.ok ? null : `http_${response.status}`,
      status: response.status,
      resolvedBaseHost: request.host,
      safeMessage: response.ok ? 'Events provider reachable' : `Events provider returned HTTP ${response.status}`,
      ...(safeDetail ? { safeDetail } : {})
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'network',
      status: null,
      resolvedBaseHost: request.host,
      safeMessage: sanitizeMessage(error instanceof Error ? error.message : undefined),
    };
  }
}
