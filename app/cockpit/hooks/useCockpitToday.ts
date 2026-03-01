'use client';

import { useEffect, useMemo, useState } from 'react';

import { todayToBoard, type CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { appendQuery } from '@/src/components/landing/navigation';
import type { QuerySpine } from '@/src/core/nervous/spine';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import type { TodayPayload } from '@/src/core/today/types';

const EMPTY_TODAY: TodayPayload = {
  mode: 'demo',
  generatedAt: new Date(0).toISOString(),
  reason: 'provider_unavailable',
  leagues: [],
  games: [],
  board: []
};

export function useCockpitToday(spine: Pick<QuerySpine, 'sport' | 'tz' | 'date' | 'mode' | 'trace_id'>) {
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const href = appendQuery('/api/today', {
          sport: spine.sport,
          tz: spine.tz,
          date: spine.date,
          mode: spine.mode,
          trace_id: spine.trace_id
        });
        const response = await fetch(href, { cache: 'no-store', signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        const parsed = parseTodayEnvelope(payload);
        const candidate = (parsed.success && parsed.data.ok ? parsed.data.data : EMPTY_TODAY) as TodayPayload;
        setToday(candidate);
      } catch {
        setToday(EMPTY_TODAY);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [spine.date, spine.mode, spine.sport, spine.tz, spine.trace_id]);

  const board = useMemo(() => todayToBoard(today), [today]);

  const neutralStatus = useMemo(() => {
    if (today.mode === 'demo') return 'Demo mode (live feeds off)';
    if (today.mode === 'cache') return 'Using cached slate';
    return 'Live slate';
  }, [today.mode]);

  return { today, board: board as CockpitBoardLeg[], loading, neutralStatus };
}
