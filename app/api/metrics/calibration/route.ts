import { NextResponse } from 'next/server';

import { computeCalibrationMetricsFromOutcomes } from '@/src/core/metrics/calibrationEngine';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const store = getRuntimeStore();
    const outcomes = await store.listSlipOutcomes();
    const data = computeCalibrationMetricsFromOutcomes(outcomes);
    return NextResponse.json({ ok: true, data, source: 'live', degraded: false });
  } catch {
    const data = computeCalibrationMetricsFromOutcomes([]);
    return NextResponse.json({ ok: true, data, source: 'fallback', degraded: true });
  }
}
