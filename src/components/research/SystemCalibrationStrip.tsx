'use client';

type SystemCalibrationStripProps = {
  takeAccuracy: number;
  weakestLegAccuracy: number;
  runsAnalyzed: number;
  lastUpdated: string | null;
};

const asPercent = (value: number) => `${Math.round(value * 100)}%`;
const MIN_CALIBRATION_N = 10;

export function SystemCalibrationStrip({
  takeAccuracy,
  weakestLegAccuracy,
  runsAnalyzed,
  lastUpdated
}: SystemCalibrationStripProps) {
  const showAccuracy = runsAnalyzed >= MIN_CALIBRATION_N;

  return (
    <section className="rounded-xl border border-white/15 bg-slate-950/50 px-3 py-2" data-testid="system-calibration-strip">
      <div className="flex items-center gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted">System Calibration</p>
        <span
          className="cursor-help text-[10px] text-muted"
          title="Calibration tracks how often verdict calls and weakest-leg flags match settled outcomes. Accuracy appears after enough sample size."
          aria-label="What is this?"
        >
          What is this?
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
        {showAccuracy ? (
          <>
            <span>TAKE accuracy: <strong className="text-strong">{asPercent(takeAccuracy)}</strong></span>
            <span>Weakest leg accuracy: <strong className="text-strong">{asPercent(weakestLegAccuracy)}</strong></span>
          </>
        ) : (
          <span>Learning starts after your first settled slip.</span>
        )}
        <span>Runs analyzed: <strong className="text-strong">{runsAnalyzed}</strong></span>
        {lastUpdated ? <span>Last updated: <strong className="text-strong">{new Date(lastUpdated).toLocaleString()}</strong></span> : <span>Last updated: <strong className="text-strong">Just now</strong></span>}
      </div>
    </section>
  );
}
