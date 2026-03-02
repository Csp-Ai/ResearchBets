import type { Spine } from '@/src/core/nervous/spine';

export type Lineage = {
  trace_id: string;
  run_id: string;
  slip_id?: string;
  ticketId?: string;
  anon_session_id?: string;
  sport?: string;
  tz?: string;
  date?: string;
  mode?: string;
};

type LineageInput = Partial<Lineage> & { trace_id: string };

export function normalizeLineage(input: LineageInput): Lineage {
  const trace_id = input.trace_id;
  return {
    trace_id,
    run_id: trace_id,
    slip_id: input.slip_id,
    ticketId: input.ticketId,
    anon_session_id: input.anon_session_id,
    sport: input.sport,
    tz: input.tz,
    date: input.date,
    mode: input.mode,
  };
}

export function withTrace(lineage: Partial<Lineage>, trace_id: string): Lineage {
  return normalizeLineage({ ...lineage, trace_id });
}

export function attachTicket(lineage: Lineage, ticketId: string): Lineage {
  return normalizeLineage({ ...lineage, ticketId });
}

export function attachSlip(lineage: Lineage, slip_id: string): Lineage {
  return normalizeLineage({ ...lineage, slip_id });
}

export function lineageFromSpine(spine: Partial<Spine>, trace_id: string, anon_session_id?: string): Lineage {
  return normalizeLineage({
    trace_id,
    anon_session_id,
    sport: spine.sport,
    tz: spine.tz,
    date: spine.date,
    mode: spine.mode,
  });
}
