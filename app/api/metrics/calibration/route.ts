import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { computeCalibrationMetrics } from '@/src/core/metrics/calibration';

export async function GET() {
  const traceId = randomUUID();
  const runId = `calibration_${randomUUID()}`;
  const data = await computeCalibrationMetrics(traceId, runId);
  return NextResponse.json({ ok: true, data, source: 'live', degraded: false });
}
