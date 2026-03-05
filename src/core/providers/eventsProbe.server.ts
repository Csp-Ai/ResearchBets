import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';

import { resolveOddsApiBaseUrl } from './theoddsapi';

export type EventsProbeResult = {
  ok: boolean;
  reason: string | null;
  status: number | null;
  resolvedBaseHost: string | null;
  safeMessage: string;
};

const sanitize = (value: string | undefined): string => {
  if (!value) return 'Events provider unavailable';
  return value.replace(/https?:\/\/\S+/gi, '[redacted-url]').replace(/\s+/g, ' ').trim().slice(0, 140) || 'Events provider unavailable';
};

const buildRequest = (): { url: string; host: string | null } | { error: EventsProbeResult } => {
  const apiKey = resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]);
  if (!apiKey) {
    return { error: { ok: false, reason: 'missing_key', status: null, resolvedBaseHost: null, safeMessage: 'ODDS_API_KEY is not configured' } };
  }

  const baseUrl = resolveOddsApiBaseUrl(readString(CANONICAL_KEYS.ODDS_API_BASE_URL));
  try {
    const parsed = new URL(baseUrl);
    const basePath = parsed.pathname.replace(/\/+$/, '');
    const withoutVersion = basePath.endsWith('/v4') ? basePath.slice(0, -3) : basePath;
    parsed.pathname = `${withoutVersion}/v4/sports/basketball_nba/events`.replace(/\/+/g, '/');
    parsed.search = '';
    parsed.searchParams.set('apiKey', apiKey);
    parsed.searchParams.set('dateFormat', 'iso');
    parsed.searchParams.set('commenceTimeFrom', new Date().toISOString());
    return { url: parsed.toString(), host: parsed.hostname || null };
  } catch {
    return { error: { ok: false, reason: 'bad_base_url', status: null, resolvedBaseHost: null, safeMessage: 'Odds provider base URL is invalid' } };
  }
};

export async function runEventsProbe(): Promise<EventsProbeResult> {
  const request = buildRequest();
  if ('error' in request) return request.error;
  try {
    const response = await fetch(request.url, { method: 'GET' });
    return {
      ok: response.ok,
      reason: response.ok ? null : `http_${response.status}`,
      status: response.status,
      resolvedBaseHost: request.host,
      safeMessage: response.ok ? 'Events provider reachable' : `Events provider returned HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'network',
      status: null,
      resolvedBaseHost: request.host,
      safeMessage: sanitize(error instanceof Error ? error.message : undefined),
    };
  }
}
