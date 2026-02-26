import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EventEnvelopeSchema } from '@/src/core/contracts/envelopes';
import { contractParityCheck } from '@/src/core/governor/checks/contractParityCheck';
import { clientServerBoundaryCheck } from '@/src/core/governor/checks/clientServerBoundaryCheck';
import { demoTruthfulnessCheck } from '@/src/core/governor/checks/demoTruthfulnessCheck';
import { eventIntegrityCheck } from '@/src/core/governor/checks/eventIntegrityCheck';
import { traceContinuityCheck } from '@/src/core/governor/checks/traceContinuityCheck';
import type { GovernorReport } from '@/src/core/governor/types';

export const runGovernor = async (input: {
  trace_id: string;
  todayPayload: unknown;
  slipSubmitResult: unknown;
  slipExtractResult: unknown;
  boundaryViolations: string[];
}): Promise<GovernorReport> => {
  const landingFiles = [
    'src/components/landing/ModeHealthStrip.tsx',
    'src/components/landing/LiveSnapshot.tsx',
    'src/components/today/TodayPageClient.tsx',
  ];
  const copyBlob = landingFiles
    .map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
    .join('\n');

  const checks = [
    contractParityCheck(input),
    traceContinuityCheck(input.trace_id),
    demoTruthfulnessCheck(copyBlob),
    clientServerBoundaryCheck(input.boundaryViolations),
    eventIntegrityCheck(EventEnvelopeSchema.parse({
      trace_id: input.trace_id,
      phase: 'DURING',
      type: 'governor_probe',
      payload: { source: 'governor' },
      timestamp: new Date().toISOString(),
    })),
  ];

  return { ok: checks.every((check) => check.pass || check.level !== 'error'), trace_id: input.trace_id, checks };
};
