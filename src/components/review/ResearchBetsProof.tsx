'use client';

import { useEffect, useMemo, useState } from 'react';

type CalibrationMetrics = {
  weakest_leg_accuracy: number;
  weakest_leg_runs_analyzed: number;
  runs_analyzed: number;
  last_updated: string | null;
};

type CalibrationResponse = {
  ok?: boolean;
  data?: CalibrationMetrics;
  source?: 'live' | 'fallback';
  degraded?: boolean;
};

const MIN_VERIFIED_WEAKEST_LEG_RUNS = 10;

const formatUpdated = (value: string | null | undefined) => {
  if (!value) return 'Not enough verified evidence yet';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'Recently updated';
  }
};

export function ResearchBetsProof() {
  const [response, setResponse] = useState<CalibrationResponse>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/metrics/calibration', { cache: 'no-store', signal: controller.signal })
      .then(async (result) => {
        const body = (await result.json()) as CalibrationResponse;
        if (!result.ok || !body.ok) throw new Error('calibration_unavailable');
        setResponse(body);
      })
      .catch(() => setResponse({ ok: false, degraded: true, source: 'fallback' }))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const metrics = response?.data;
  const verifiedRuns = metrics?.weakest_leg_runs_analyzed ?? 0;
  const ready = verifiedRuns >= MIN_VERIFIED_WEAKEST_LEG_RUNS && !response?.degraded;
  const progress = useMemo(
    () => Math.min(100, Math.round((verifiedRuns / MIN_VERIFIED_WEAKEST_LEG_RUNS) * 100)),
    [verifiedRuns],
  );

  if (loading) {
    return <div className="h-44 animate-pulse rounded-[28px] border border-white/[0.06] bg-white/[0.02]" />;
  }

  if (response?.degraded || !metrics) {
    return (
      <section className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-600">ResearchBets Proof</div>
        <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-200">Proof is temporarily unavailable.</h2>
        <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-500">
          ResearchBets will not show cached or fallback accuracy percentages when the settled-outcome store cannot be verified.
        </p>
      </section>
    );
  }

  if (!ready) {
    return (
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/[0.10] bg-[linear-gradient(150deg,rgba(34,211,238,.035),rgba(255,255,255,.015))] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/[0.05] blur-[90px]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-100/50">ResearchBets Proof</div>
            <div className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.12em] text-slate-500">Evidence building</div>
          </div>
          <h2 className="mt-3 text-[25px] font-semibold tracking-[-0.045em] text-slate-100">Earn the number before showing the number.</h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-500">
            Weakest-leg accuracy stays hidden until at least {MIN_VERIFIED_WEAKEST_LEG_RUNS} settlements explicitly verify whether the pregame weakest leg actually failed. Generic ticket losses do not count as correct calls.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="flex items-center justify-between text-[9px] text-slate-600">
                <span>Verified weakest-leg settlements</span>
                <span>{verifiedRuns}/{MIN_VERIFIED_WEAKEST_LEG_RUNS}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="text-[9px] text-slate-600">{metrics.runs_analyzed} total settled records</div>
          </div>
        </div>
      </section>
    );
  }

  const accuracyPct = Math.round(metrics.weakest_leg_accuracy * 100);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-300/[0.13] bg-[linear-gradient(150deg,rgba(52,211,153,.045),rgba(255,255,255,.015))] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-300/[0.055] blur-[90px]" />
      <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-emerald-100/50">ResearchBets Proof</div>
          <h2 className="mt-3 text-[27px] font-semibold tracking-[-0.045em] text-slate-100">Did X-Ray identify the leg that actually broke?</h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-500">
            This score uses only settlements with explicit weakest-leg attribution. It is a historical process metric, not a guarantee that the next ticket will behave the same way.
          </p>
          <div className="mt-4 text-[9px] text-slate-600">Updated {formatUpdated(metrics.last_updated)} · {metrics.runs_analyzed} total settled records</div>
        </div>

        <div className="min-w-[170px] rounded-[22px] border border-emerald-200/[0.10] bg-black/20 p-4 text-right">
          <div className="text-[8px] uppercase tracking-[0.14em] text-emerald-100/45">Weakest-leg accuracy</div>
          <div className="mt-1 text-[42px] font-semibold tracking-[-0.065em] text-emerald-100">{accuracyPct}%</div>
          <div className="mt-1 text-[9px] text-slate-600">{verifiedRuns} verified settlements</div>
        </div>
      </div>
    </section>
  );
}
