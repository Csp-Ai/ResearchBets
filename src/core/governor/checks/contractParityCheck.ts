import { SlipExtractResultSchema, SlipSubmitResultSchema, TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import type { GovernorCheck } from '@/src/core/governor/types';

export const contractParityCheck = (input: {
  todayPayload: unknown;
  slipSubmitResult: unknown;
  slipExtractResult: unknown;
}): GovernorCheck => {
  const today = TodayPayloadSchema.safeParse(input.todayPayload).success;
  const submit = SlipSubmitResultSchema.safeParse(input.slipSubmitResult).success;
  const extract = SlipExtractResultSchema.safeParse(input.slipExtractResult).success;
  const pass = today && submit && extract;
  return {
    id: 'ContractParityCheck',
    level: pass ? 'info' : 'error',
    pass,
    message: pass ? 'Canonical route contracts validated.' : 'One or more canonical route contracts failed validation.',
  };
};
