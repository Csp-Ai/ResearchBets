export type TodayPayloadClient = {
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  generatedAt?: string;
  trace_id?: string;
  traceId?: string;
  provenance?: {
    mode: 'live' | 'cache' | 'demo';
    reason?: string;
    generatedAt: string;
  };
  status?: 'active' | 'next' | 'market_closed';
  nextAvailableStartTime?: string;
  providerHealth?: Array<{ provider: string; ok: boolean; message?: string; missingKey?: boolean }>;
  games: Array<{ id: string; matchup: string; startTime: string }>;
  board: Array<{ id: string; gameId: string; player: string; market: string; line: string; odds: string } & Record<string, unknown>>;
};

export type TodayEnvelopeClient =
  | {
    ok: true;
    data: TodayPayloadClient;
    provenance?: { mode: 'live' | 'cache' | 'demo'; reason?: string; generatedAt: string };
    trace_id: string;
    landing?: Record<string, unknown>;
  }
  | {
    ok: false;
    error: { code: string; message: string };
    provenance?: { mode: 'live' | 'cache' | 'demo'; reason?: string; generatedAt: string };
    trace_id?: string;
  };

export type EventEnvelopeClient = {
  trace_id: string;
  phase: 'BEFORE' | 'DURING' | 'AFTER';
  type: string;
  payload: unknown;
  timestamp: string;
};

const MODES = new Set(['live', 'cache', 'demo']);
const PHASES = new Set(['BEFORE', 'DURING', 'AFTER']);

export function parseTodayEnvelopeClient(payload: unknown): TodayEnvelopeClient | null {
  if (!payload || typeof payload !== 'object') return null;
  const input = payload as Record<string, unknown>;
  if (input.ok === true) {
    if (!isTodayPayloadClient(input.data)) return null;
    if (typeof input.trace_id !== 'string' || input.trace_id.length === 0) return null;
    return {
      ok: true,
      data: input.data,
      trace_id: input.trace_id,
      provenance: isProvenance(input.provenance) ? input.provenance : undefined,
      landing: isObject(input.landing) ? input.landing : undefined,
    };
  }

  if (input.ok === false) {
    const error = isObject(input.error) ? input.error : null;
    if (!error || typeof error.code !== 'string' || typeof error.message !== 'string') return null;
    return {
      ok: false,
      error: { code: error.code, message: error.message },
      trace_id: typeof input.trace_id === 'string' && input.trace_id.length > 0 ? input.trace_id : undefined,
      provenance: isProvenance(input.provenance) ? input.provenance : undefined,
    };
  }

  return null;
}

export function parseTodayPayloadClient(payload: unknown): TodayPayloadClient | null {
  return isTodayPayloadClient(payload) ? payload : null;
}

export function parseEventEnvelopeClient(payload: unknown): EventEnvelopeClient | null {
  if (!isObject(payload)) return null;
  if (typeof payload.trace_id !== 'string' || payload.trace_id.length === 0) return null;
  if (typeof payload.type !== 'string' || payload.type.length === 0) return null;
  if (typeof payload.timestamp !== 'string' || payload.timestamp.length === 0) return null;
  if (typeof payload.phase !== 'string' || !PHASES.has(payload.phase)) return null;
  return {
    trace_id: payload.trace_id,
    phase: payload.phase as EventEnvelopeClient['phase'],
    type: payload.type,
    payload: payload.payload,
    timestamp: payload.timestamp,
  };
}

function isTodayPayloadClient(payload: unknown): payload is TodayPayloadClient {
  if (!isObject(payload)) return false;
  if (typeof payload.mode !== 'string' || !MODES.has(payload.mode)) return false;
  if (!Array.isArray(payload.games) || !Array.isArray(payload.board)) return false;
  return true;
}

function isProvenance(input: unknown): input is { mode: 'live' | 'cache' | 'demo'; reason?: string; generatedAt: string } {
  if (!isObject(input)) return false;
  if (typeof input.mode !== 'string' || !MODES.has(input.mode)) return false;
  if (typeof input.generatedAt !== 'string' || input.generatedAt.length === 0) return false;
  if (input.reason !== undefined && typeof input.reason !== 'string') return false;
  return true;
}

function isObject(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === 'object';
}
