import { CANONICAL_KEYS } from '@/src/core/env/keys';
import { normalizeSpine } from '@/src/core/nervous/spine';

import type { RedirectSearchParams } from './preserveQueryRedirect';

const DEMO_TRACE_ID = 'trace_demo_cockpit';

const isLiveModeEnabled = (value: string | undefined) => ['1', 'true', 'yes'].includes((value ?? '').toLowerCase());

const readFirst = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const toTodayIso = () => new Date().toISOString().slice(0, 10);

export function buildCockpitEntryHref(searchParams?: RedirectSearchParams): string {
  const liveMode = isLiveModeEnabled(process.env[CANONICAL_KEYS.LIVE_MODE]);
  const defaults = {
    sport: 'NBA',
    tz: 'America/Phoenix',
    date: toTodayIso(),
    mode: liveMode ? 'live' : 'demo',
    trace_id: liveMode ? undefined : DEMO_TRACE_ID
  } as const;

  const normalized = normalizeSpine({
    sport: readFirst(searchParams?.sport) ?? defaults.sport,
    tz: readFirst(searchParams?.tz) ?? defaults.tz,
    date: readFirst(searchParams?.date) ?? defaults.date,
    mode: readFirst(searchParams?.mode) ?? defaults.mode,
    trace_id: readFirst(searchParams?.trace_id) ?? defaults.trace_id,
  });

  const query = new URLSearchParams();
  query.set('sport', normalized.sport);
  query.set('tz', normalized.tz);
  query.set('date', normalized.date);
  query.set('mode', normalized.mode);
  if (normalized.trace_id) query.set('trace_id', normalized.trace_id);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'sport' || key === 'tz' || key === 'date' || key === 'mode' || key === 'trace_id') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') query.append(key, item);
        }
        continue;
      }
      if (typeof value === 'string') query.set(key, value);
    }
  }

  return `/cockpit?${query.toString()}`;
}
