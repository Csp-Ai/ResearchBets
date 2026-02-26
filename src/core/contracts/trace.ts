import type { ContextSpine } from './contextSpine';

export type TraceMeta = {
  trace_id: string;
  mode: 'live' | 'cache' | 'demo';
  reason?: string;
  provenance: 'provider' | 'fallback' | 'user' | 'pipeline';
};

export function ensureTraceMeta(spine: ContextSpine, provenance: TraceMeta['provenance'], trace_id?: string): TraceMeta {
  return {
    trace_id: trace_id ?? spine.trace_id ?? crypto.randomUUID(),
    mode: spine.mode,
    reason: spine.reason,
    provenance,
  };
}
