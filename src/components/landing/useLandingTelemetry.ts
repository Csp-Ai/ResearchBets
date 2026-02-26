'use client';

import { useEffect, useMemo, useState } from 'react';

import type { TelemetrySummary } from '@/src/core/telemetry/types';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';

type ProviderHealth = { ok: boolean; mode: 'live' | 'demo' | 'cache'; reason?: string; providerErrors?: string[] };

type LandingSnapshotResponse = {
  landing?: {
    mode: 'live' | 'demo';
    reason: 'live_ok' | 'demo_requested' | 'live_mode_disabled' | 'missing_keys' | 'provider_unavailable';
    gamesCount: number;
    lastUpdatedAt: string;
    headlineMatchup?: string;
  };
};

const DEMO_TELEMETRY: TelemetrySummary = {
  mode: 'demo',
  reason: 'telemetry_fetch_failed',
  window: '24h',
  last_24h: { slips: 0, traces: 0, agent_steps: 0 },
  updatedAt: new Date(0).toISOString(),
  perf: {}
};

export function useLandingTelemetry({ mode, sport, tz, date }: { mode: 'demo' | 'live'; sport: string; tz: string; date: string }) {
  const [summary, setSummary] = useState<TelemetrySummary>(DEMO_TELEMETRY);
  const [today, setToday] = useState<LandingSnapshotResponse['landing'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const todayQuery = new URLSearchParams({ sport, tz, date });
        if (mode === 'demo') todayQuery.set('demo', '1');

        const [summaryRes, todayRes, healthRes] = await Promise.all([
          fetch('/api/telemetry/summary'),
          fetch(`/api/today?${todayQuery.toString()}`),
          fetch('/api/provider-health')
        ]);

        if (!active) return;

        const summaryBody = summaryRes.ok ? ((await summaryRes.json()) as TelemetrySummary) : DEMO_TELEMETRY;
        const todayBody = todayRes.ok ? await todayRes.json() : {};
        const todayEnvelope = parseTodayEnvelope(todayBody);

        setSummary(summaryBody);
        setToday(todayEnvelope.success && todayEnvelope.data.ok ? (todayEnvelope.data.landing as LandingSnapshotResponse['landing'] ?? null) : null);
        setProviderHealth(healthRes.ok ? (await healthRes.json()) as ProviderHealth : null);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[landing] live telemetry unavailable, showing demo slate.', error);
        }
        if (!active) return;
        setSummary(DEMO_TELEMETRY);
        setToday(null);
        setProviderHealth(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    const id = window.setInterval(() => void run(), 60_000);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [date, mode, sport, tz]);

  const freshnessMinutes = useMemo(() => {
    const updatedAt = today?.lastUpdatedAt ?? summary.updatedAt;
    const ms = Date.now() - new Date(updatedAt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 0;
    return Math.floor(ms / 60000);
  }, [summary.updatedAt, today?.lastUpdatedAt]);

  return { summary, today, loading, freshnessMinutes, providerHealth };
}
