'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';
import type { TodayProvenance } from '@/src/core/today/types';

type CalibrationSummary = {
  runsAnalyzed: number;
  takeAccuracy: number;
  weakestLegAccuracy: number;
  lastUpdated: string | null;
} | null;

type RunIntegrityPanelProps = {
  traceId: string;
  runProvenance?: ResearchProvenance;
  boardProvenance: TodayProvenance;
  traceHref: string;
};

const asPercent = (value: number) => `${Math.round(value * 100)}%`;

export function RunIntegrityPanel({ traceId, runProvenance, boardProvenance, traceHref }: RunIntegrityPanelProps) {
  const [calibration, setCalibration] = useState<CalibrationSummary>(null);

  useEffect(() => {
    if (!traceId) return;
    const controller = new AbortController();

    const loadCalibration = async () => {
      try {
        const response = await fetch('/api/metrics/calibration', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('calibration_unavailable');
        const payload = await response.json();
        const data = payload?.data;
        setCalibration({
          runsAnalyzed: typeof data?.runs_analyzed === 'number' ? data.runs_analyzed : 0,
          takeAccuracy: typeof data?.take_accuracy === 'number' ? data.take_accuracy : 0,
          weakestLegAccuracy: typeof data?.weakest_leg_accuracy === 'number' ? data.weakest_leg_accuracy : 0,
          lastUpdated: typeof data?.last_updated === 'string' ? data.last_updated : null
        });
      } catch {
        setCalibration(null);
      }
    };

    void loadCalibration();
    return () => controller.abort();
  }, [traceId]);

  const evidence = useMemo(() => {
    const degradedReason = runProvenance?.degraded_reason ?? boardProvenance.reason ?? 'provider_unavailable';
    const isRunLive = runProvenance?.source === 'LIVE' && !runProvenance.degraded;
    const isBoardLive = boardProvenance.mode === 'live';
    if (isRunLive && isBoardLive) {
      return { label: 'Evidence: odds feed OK', reason: 'Live odds source available for board and run.' };
    }
    return { label: 'Evidence: odds feed degraded', reason: degradedReason };
  }, [boardProvenance.mode, boardProvenance.reason, runProvenance]);

  const calibrationText = useMemo(() => {
    if (!calibration || calibration.runsAnalyzed < 1) {
      return 'Calibration: not enough outcomes yet';
    }
    const status = calibration.runsAnalyzed >= 10 ? 'stable' : 'limited data';
    const lastUpdated = calibration.lastUpdated ? new Date(calibration.lastUpdated).toLocaleString() : 'n/a';
    return `Calibration: ${status} · n=${calibration.runsAnalyzed} · take ${asPercent(calibration.takeAccuracy)} · weakest ${asPercent(calibration.weakestLegAccuracy)} · updated ${lastUpdated}`;
  }, [calibration]);

  return (
    <div className="run-integrity-panel" data-testid="run-integrity-panel">
      <p className="board-sub">{calibrationText}</p>
      <p className="board-sub" title={evidence.reason}>{evidence.label}</p>
      <Link className="board-sub" href={appendQuery(traceHref, { trace_id: traceId })}>Open trace</Link>
    </div>
  );
}
