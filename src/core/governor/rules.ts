export const CANONICAL_DEMO_LABEL = 'Demo mode (live feeds off)';

export const GOVERNOR_RULES = {
  contractParity: 'API outputs must conform to canonical Zod envelopes.',
  traceContinuity: 'Responses and event envelopes include trace_id.',
  demoTruthfulness: 'No alarmed env copy while demo mode is functional.',
  clientServerBoundary: 'Client bundles must not import server-only modules.',
  eventIntegrity: 'Event envelopes include phase and trace_id.',
} as const;
