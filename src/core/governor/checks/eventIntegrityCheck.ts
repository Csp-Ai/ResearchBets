import { EventEnvelopeSchema } from '@/src/core/contracts/envelopes';
import type { GovernorCheck } from '@/src/core/governor/types';

export const eventIntegrityCheck = (event: unknown): GovernorCheck => {
  const valid = EventEnvelopeSchema.safeParse(event).success;
  return {
    id: 'EventIntegrityCheck',
    level: valid ? 'info' : 'error',
    pass: valid,
    message: valid ? 'Event envelope includes phase + trace_id.' : 'Event envelope missing phase and/or trace_id.',
  };
};
