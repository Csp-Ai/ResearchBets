import type { GovernorCheck } from '@/src/core/governor/types';

export const traceContinuityCheck = (trace_id: string): GovernorCheck => ({
  id: 'TraceContinuityCheck',
  level: trace_id ? 'info' : 'error',
  pass: Boolean(trace_id),
  message: trace_id ? `trace_id present (${trace_id}).` : 'Missing trace_id in current context.',
});
