export type TelemetrySummary = {
  mode: 'live' | 'demo';
  reason: string;
  window: '24h';
  last_24h: { slips: number; traces: number; agent_steps: number };
  perf: { p50_ms?: number; p95_ms?: number };
  risk?: { most_common_flag?: string; count?: number };
  updatedAt: string;
};
