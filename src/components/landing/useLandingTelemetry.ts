'use client';

import { useEffect, useMemo, useState } from 'react';

import type { TelemetrySummary } from '@/src/core/telemetry/types';

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

export function useLandingTelemetry(mode: 'demo' | 'live') {
  const [summary, setSummary] = useState<TelemetrySummary>(DEMO_TELEMETRY);
  const [today, setToday] = useState<LandingSnapshotResponse['landing'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [summaryRes, todayRes] = await Promise.all([
          fetch('/api/telemetry/summary'),
          fetch(mode === 'demo' ? '/api/today?demo=1' : '/api/today')
        ]);

        if (!active) return;

        const summaryBody = summaryRes.ok ? ((await summaryRes.json()) as TelemetrySummary) : DEMO_TELEMETRY;
        const todayBody = todayRes.ok ? ((await todayRes.json()) as LandingSnapshotResponse) : {};

        setSummary(summaryBody);
        setToday(todayBody.landing ?? null);
      } catch {
        if (!active) return;
        setSummary(DEMO_TELEMETRY);
        setToday(null);
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
  }, [mode]);

  const freshnessMinutes = useMemo(() => {
    const updatedAt = today?.lastUpdatedAt ?? summary.updatedAt;
    const ms = Date.now() - new Date(updatedAt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 0;
    return Math.floor(ms / 60000);
  }, [summary.updatedAt, today?.lastUpdatedAt]);

  return { summary, today, loading, freshnessMinutes };
}
