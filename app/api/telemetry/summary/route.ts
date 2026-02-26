import { NextResponse } from 'next/server';

import type { TelemetrySummary } from '@/src/core/telemetry/types';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_SUMMARY: TelemetrySummary = {
  mode: 'demo',
  reason: 'runtime_store_unavailable',
  window: '24h',
  last_24h: { slips: 142, traces: 61, agent_steps: 488 },
  perf: { p50_ms: 820, p95_ms: 1740 },
  risk: { most_common_flag: 'correlation_warn', count: 32 },
  updatedAt: new Date().toISOString()
};

const percentile = (sorted: number[], pct: number): number | undefined => {
  if (sorted.length === 0) return undefined;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((pct / 100) * (sorted.length - 1))));
  return sorted[index];
};

export async function GET() {
  try {
    const allEvents = await getRuntimeStore().listEvents({ limit: 1000 });
    const cutoff = Date.now() - DAY_MS;
    const events24h = allEvents.filter((event) => {
      const ts = new Date(event.timestamp).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    });

    if (events24h.length === 0) {
      return NextResponse.json({ ...DEMO_SUMMARY, reason: 'no_recent_events' } satisfies TelemetrySummary);
    }

    const traces = new Set(events24h.map((event) => event.trace_id)).size;
    const slips = events24h.filter((event) => event.event_name === 'slip_submitted').length;
    const durationMs = events24h
      .map((event) => {
        const raw = event.properties?.duration_ms;
        return typeof raw === 'number' ? raw : undefined;
      })
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);

    const riskCounts = events24h.reduce<Record<string, number>>((acc, event) => {
      const rawFlag = event.properties?.risk_flag;
      const fallback = event.event_name === 'consensus_conflict' ? 'consensus_conflict' : undefined;
      const key = typeof rawFlag === 'string' ? rawFlag : fallback;
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const [mostCommonFlag, count] = Object.entries(riskCounts).sort((a, b) => b[1] - a[1])[0] ?? [];

    const summary: TelemetrySummary = {
      mode: 'live',
      reason: 'runtime_events',
      window: '24h',
      last_24h: {
        slips,
        traces,
        agent_steps: events24h.length
      },
      perf: {
        p50_ms: percentile(durationMs, 50),
        p95_ms: percentile(durationMs, 95)
      },
      risk: mostCommonFlag ? { most_common_flag: mostCommonFlag, count } : undefined,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json(DEMO_SUMMARY);
  }
}
