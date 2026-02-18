import { createHash, randomUUID } from 'node:crypto';

export const createDeterministicRunId = (seedParts: Array<string | number | boolean | null | undefined>): string => {
  const seed = seedParts.map((part) => String(part ?? '')).join('|');
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 24);

  return `run_${digest}`;
};

export const createTraceId = (): string => `trace_${randomUUID().replace(/-/g, '')}`;
