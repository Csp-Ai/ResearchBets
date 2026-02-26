import type { QuerySpine } from '@/src/core/nervous/spine';

type HealthResult = {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
};

export async function runLoopHealthCheck(spine: QuerySpine): Promise<HealthResult> {
  const checks: HealthResult['checks'] = [];

  const todayRes = await fetch(`/api/today?sport=${encodeURIComponent(spine.sport)}&tz=${encodeURIComponent(spine.tz)}&date=${encodeURIComponent(spine.date)}&demo=1`, {
    headers: { 'x-live-mode': '0' },
  }).then((res) => res.json()).catch(() => null) as { board?: unknown[] } | null;

  checks.push({
    name: 'today_demo_board',
    ok: Array.isArray(todayRes?.board) && todayRes.board.length > 0,
    detail: Array.isArray(todayRes?.board) ? `board=${todayRes.board.length}` : 'no payload'
  });

  const submitRes = await fetch('/api/slips/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anon_id: 'health-check-anon',
      spine: { sport: spine.sport, tz: spine.tz, date: spine.date, mode: 'demo', anon_id: 'health-check-anon', user_id: null },
      legs: [{ id: 'health-leg-1', player: 'Health Check', marketType: 'points', line: '1.5', odds: '-110' }]
    })
  }).then((res) => res.json()).catch(() => null) as { trace_id?: string } | null;

  checks.push({
    name: 'submit_trace',
    ok: typeof submitRes?.trace_id === 'string' && submitRes.trace_id.length > 0,
    detail: submitRes?.trace_id ? 'trace_id_present' : 'missing_trace_id'
  });

  return { ok: checks.every((check) => check.ok), checks };
}
