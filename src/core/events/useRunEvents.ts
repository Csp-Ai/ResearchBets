'use client';

import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/src/core/supabase/browser';

type EventRow = { type: string; ts: string; payload?: Record<string, unknown> | null };
type Stage = 'idle' | 'created' | 'analyzing' | 'ready' | 'complete';

const stageFromType = (type: string): Stage => {
  if (type === 'run_created') return 'created';
  if (type === 'stage_analyze_started') return 'analyzing';
  if (type === 'analysis_ready') return 'ready';
  if (type === 'stage_analyze_complete') return 'complete';
  return 'idle';
};

export function useRunEvents(trace_id: string | null | undefined) {
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    setEvents([]);
    if (!trace_id) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let isMounted = true;
    void client.from('run_events').select('type,ts,payload').eq('trace_id', trace_id).order('ts', { ascending: true }).then(({ data }) => {
      if (!isMounted || !Array.isArray(data)) return;
      setEvents(data as EventRow[]);
    });

    const channel = client
      .channel(`run-events-${trace_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'run_events', filter: `trace_id=eq.${trace_id}` }, (payload) => {
        const row = payload.new as EventRow;
        setEvents((prev) => [...prev, row]);
      })
      .subscribe();

    return () => {
      isMounted = false;
      void client.removeChannel(channel);
    };
  }, [trace_id]);

  const latestStage = useMemo<Stage>(() => {
    if (events.length === 0) return 'idle';
    return stageFromType(events[events.length - 1]?.type ?? '');
  }, [events]);

  const statusText = useMemo(() => {
    if (latestStage === 'idle') return 'Awaiting run events';
    if (latestStage === 'created') return 'Run created';
    if (latestStage === 'analyzing') return 'Analyzing slip';
    if (latestStage === 'ready') return 'Analysis ready';
    return 'Analysis complete';
  }, [latestStage]);

  return { events, latestStage, statusText };
}
