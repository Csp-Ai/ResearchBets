'use client';

type SystemCalibrationStripProps = {
  takeAccuracy: number;
  weakestLegAccuracy: number;
  runsAnalyzed: number;
  lastUpdated: string | null;
};

const asPercent = (value: number) => `${Math.round(value * 100)}%`;

export function SystemCalibrationStrip({
  takeAccuracy,
  weakestLegAccuracy,
  runsAnalyzed,
  lastUpdated
}: SystemCalibrationStripProps) {
  return (
    <section className="rounded-xl border border-white/15 bg-slate-950/50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">System Calibration</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
        <span>TAKE accuracy: <strong className="text-strong">{asPercent(takeAccuracy)}</strong></span>
        <span>Weakest leg accuracy: <strong className="text-strong">{asPercent(weakestLegAccuracy)}</strong></span>
        <span>Runs analyzed: <strong className="text-strong">{runsAnalyzed}</strong></span>
        <span>Last updated: <strong className="text-strong">{lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}</strong></span>
      </div>
    </section>
  );
}
