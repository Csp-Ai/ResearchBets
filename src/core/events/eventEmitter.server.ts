import 'server-only';

import type { Spine } from '@/src/core/nervous/spine';
import { getSupabaseServiceClient } from '@/src/core/supabase/service';

export type RunEventType = 'run_created' | 'stage_before_complete' | 'stage_analyze_started' | 'analysis_ready' | 'stage_analyze_complete';

export async function emitRunEvent(args: { trace_id: string; spine: Spine; type: RunEventType; payload?: Record<string, unknown> | null }): Promise<boolean> {
  const client = getSupabaseServiceClient();
  const { error } = await client.from('run_events').insert({
    trace_id: args.trace_id,
    type: args.type,
    payload: args.payload ?? null,
    spine: args.spine
  });
  return !error;
}

export async function emitRunEvents(args: { trace_id: string; spine: Spine; events: Array<{ type: RunEventType; payload?: Record<string, unknown> | null }> }): Promise<number> {
  const client = getSupabaseServiceClient();
  const rows = args.events.map((event) => ({
    trace_id: args.trace_id,
    type: event.type,
    payload: event.payload ?? null,
    spine: args.spine
  }));
  const { error } = await client.from('run_events').insert(rows);
  if (error) return 0;
  return rows.length;
}
