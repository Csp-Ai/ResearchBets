import type { ZodType, ZodTypeDef } from 'zod';

import { AgentErrorCode, AgentRuntimeError } from './errors';

export const validateWithSchema = <T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown, phase: 'input' | 'output'): T => {
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  const code = phase === 'input' ? AgentErrorCode.INVALID_INPUT : AgentErrorCode.INVALID_OUTPUT;

  throw new AgentRuntimeError(code, 'validation', parsed.error.message, false, parsed.error);
};
