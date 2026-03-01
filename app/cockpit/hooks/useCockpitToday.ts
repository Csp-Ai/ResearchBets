'use client';

import { useEffect, useMemo, useState } from 'react';

import { todayToBoard, type CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { appendQuery } from '@/src/components/landing/navigation';
import type { QuerySpine } from '@/src/core/nervous/spine';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import type { TodayPayload, TodayProvenance } from '@/src/core/today/types';

const EMPTY_TODAY: TodayPayload = {
  mode: 'demo',
  generatedAt: new Date(0).toISOString(),
  reason: 'provider_unavailable',
  leagues: [],
  games: [],
  board: []
};

const EMPTY_PROVENANCE: TodayProvenance = {
  mode: 'demo',
  reason: 'provider_unavailable',
  generatedAt: new Date(0).toISOString()
};

const resolveIntentMode = (mode: QuerySpine['mode']) => {
  if (!mode || mode.length === 0) return process.env.NODE_ENV === 'production' ? 'live' : 'demo';
  return mode;
};

export function useCockpitToday(spine: Pick<QuerySpine, 'sport' | 'tz' | 'date' | 'mode' | 'trace_id'>) {
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [provenance, setProvenance] = useState<TodayProvenance>(EMPTY_PROVENANCE);
  const [loading, setLoading] = useState(true);
  const intentMode = resolveIntentMode(spine.mode);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const href = appendQuery('/api/today', {
          sport: spine.sport,
          tz: spine.tz,
          date: spine.date,
          mode: intentMode,
          trace_id: spine.trace_id
        });
        const response = await fetch(href, { cache: 'no-store', signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        const parsed = parseTodayEnvelope(payload);
        const candidate = (parsed.success && parsed.data.ok ? parsed.data.data : EMPTY_TODAY) as TodayPayload;
        const candidateProvenance = parsed.success && parsed.data.ok
          ? (parsed.data.provenance ?? candidate.provenance ?? { mode: candidate.mode, reason: candidate.reason, generatedAt: candidate.generatedAt })
          : EMPTY_PROVENANCE;
        setToday(candidate);
        setProvenance(candidateProvenance);
      } catch {
        setToday(EMPTY_TODAY);
        setProvenance(EMPTY_PROVENANCE);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [spine.date, intentMode, spine.sport, spine.tz, spine.trace_id]);

  const board = useMemo(() => todayToBoard(today, spine.sport), [today, spine.sport]);

  const neutralStatus = useMemo(() => {
    if (provenance.mode === 'demo') return 'Demo mode (live feeds off)';
    if (provenance.mode === 'cache') return 'Using cached slate';
    if (provenance.reason === 'provider_unavailable' && today.games.length === 0) return 'Live requested — feeds unavailable';
    return 'Live slate';
  }, [provenance.mode, provenance.reason, today.games.length]);

  return { today, board: board as CockpitBoardLeg[], loading, neutralStatus, intentMode };
}
