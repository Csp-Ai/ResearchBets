'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { todayToBoard, type CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { spineFetch } from '@/src/core/nervous/spineNavigation';
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

const LIVE_POLL_INTERVAL_MS = 25_000;

export function useCockpitToday(spine: Pick<QuerySpine, 'sport' | 'tz' | 'date' | 'mode' | 'trace_id'>) {
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [provenance, setProvenance] = useState<TodayProvenance>(EMPTY_PROVENANCE);
  const [loading, setLoading] = useState(true);
  const [boardUpdateTick, setBoardUpdateTick] = useState(0);
  const etagRef = useRef<string | null>(null);
  const currentStampRef = useRef<string | null>(null);
  const intentMode = spine.mode;

  const strictLiveUnavailable = provenance.reason === 'strict_live_unavailable';
  const effectiveMode = today.effective?.mode ?? provenance.mode;
  const effectiveReason = today.effective?.reason ?? provenance.reason ?? today.reason;
  const canPollLive = intentMode === 'live' && effectiveMode === 'live' && !strictLiveUnavailable;

  const loadToday = useCallback(async ({ forceRefresh = false, signal }: { forceRefresh?: boolean; signal?: AbortSignal } = {}) => {
    try {
      const response = await spineFetch('/api/today', {
        spine: {
          sport: spine.sport,
          tz: spine.tz,
          date: spine.date,
          mode: intentMode,
          trace_id: spine.trace_id,
        },
        query: {
          refresh: forceRefresh ? '1' : undefined
        },
        signal,
        headers: etagRef.current ? { 'If-None-Match': etagRef.current } : undefined
      });

      if ('status' in response && response.status === 304) return;

      const payload = response.ok ? await response.json() : null;
      const parsed = parseTodayEnvelope(payload);
      const candidate = (parsed.success && parsed.data.ok ? parsed.data.data : EMPTY_TODAY) as TodayPayload;
      const candidateProvenance = parsed.success && parsed.data.ok
        ? (parsed.data.provenance ?? candidate.provenance ?? { mode: candidate.mode, reason: candidate.reason, generatedAt: candidate.generatedAt })
        : EMPTY_PROVENANCE;

      const nextStamp = candidateProvenance.generatedAt || candidate.generatedAt;
      const previousStamp = currentStampRef.current;
      const responseEtag = response.headers?.get?.('etag') ?? null;
      if (responseEtag) etagRef.current = responseEtag;

      if (!forceRefresh && previousStamp && nextStamp === previousStamp) return;

      currentStampRef.current = nextStamp;
      setToday(candidate);
      setProvenance(candidateProvenance);
      if (previousStamp && nextStamp !== previousStamp) {
        setBoardUpdateTick((tick) => tick + 1);
      }
    } catch {
      setToday(EMPTY_TODAY);
      setProvenance(EMPTY_PROVENANCE);
    } finally {
      setLoading(false);
    }
  }, [intentMode, spine.date, spine.sport, spine.tz, spine.trace_id]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        await loadToday({ signal: controller.signal });
      } catch {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [loadToday]);

  useEffect(() => {
    if (!canPollLive) return;

    const timer = window.setInterval(() => {
      void loadToday();
    }, LIVE_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [canPollLive, loadToday]);

  const board = useMemo(() => todayToBoard(today, spine.sport), [today, spine.sport]);

  const neutralStatus = useMemo(() => {
    if (effectiveMode === 'demo') return 'Demo mode (live feeds off)';
    if (effectiveMode === 'cache') return 'Using cached slate';
    if (effectiveReason === 'provider_unavailable' && today.games.length === 0) return 'Live requested — feeds unavailable';
    return 'Live slate';
  }, [effectiveMode, effectiveReason, today.games.length]);

  return {
    today,
    provenance,
    board: board as CockpitBoardLeg[],
    loading,
    neutralStatus,
    intentMode,
    canPollLive,
    strictLiveUnavailable,
    boardUpdateTick,
    refreshToday: () => loadToday({ forceRefresh: true })
  };
}
