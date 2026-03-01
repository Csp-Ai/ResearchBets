'use client';

import { useEffect, useMemo, useState } from 'react';

import type { TodayPayload, TodayProvenance } from '@/src/core/today/types';

type LiveCredibilityStripProps = {
  provenance: TodayProvenance;
  today: TodayPayload;
  strictLiveUnavailable: boolean;
  boardUpdateTick: number;
  onRefresh: () => void;
};

const agoLabel = (timestamp: string) => {
  const asMs = Date.parse(timestamp);
  if (!Number.isFinite(asMs)) return 'Updated —';
  const seconds = Math.max(0, Math.round((Date.now() - asMs) / 1000));
  return `Updated ${seconds}s ago`;
};

const statusLabelFromToday = (today: TodayPayload) => {
  if (today.status === 'market_closed') return 'Market closed';
  if (today.status === 'active' || today.status === 'next') return 'Market open';

  const now = Date.now();
  const hasFutureGame = today.games.some((game) => {
    const start = Date.parse(game.startTime);
    return Number.isFinite(start) && start >= now;
  });

  return hasFutureGame ? 'Market open' : 'Market closed';
};

export function LiveCredibilityStrip({ provenance, today, strictLiveUnavailable, boardUpdateTick, onRefresh }: LiveCredibilityStripProps) {
  const [nowTick, setNowTick] = useState(0);
  const [showUpdatedTick, setShowUpdatedTick] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick((tick) => tick + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (boardUpdateTick <= 0) return;
    setShowUpdatedTick(true);
    const timer = window.setTimeout(() => setShowUpdatedTick(false), 3_000);
    return () => window.clearTimeout(timer);
  }, [boardUpdateTick]);

  const freshnessSource = provenance.generatedAt || today.generatedAt;
  const freshness = useMemo(() => agoLabel(freshnessSource), [freshnessSource, nowTick]);
  const boardStatus = useMemo(() => statusLabelFromToday(today), [today]);

  const feedsChip = strictLiveUnavailable || provenance.mode !== 'live'
    ? { label: 'Feeds degraded', reason: provenance.reason ?? 'provider status unavailable' }
    : { label: 'Feeds OK', reason: provenance.reason ?? 'live provider healthy' };

  return (
    <div className="live-credibility-strip" role="status" aria-label="Live credibility strip">
      <span className={`cred-chip mode-${provenance.mode}`}>Mode {provenance.mode === 'live' ? 'Live' : provenance.mode === 'cache' ? 'Cache' : 'Demo'}</span>
      <span className={`cred-chip freshness ${showUpdatedTick ? 'updated' : ''}`}>{freshness}</span>
      <span className="cred-chip">{boardStatus}</span>
      <span className="cred-chip" title={feedsChip.reason}>{feedsChip.label}</span>
      {showUpdatedTick ? <span className="cred-chip cred-updated">Updated</span> : null}
      <button className="btn-secondary credibility-refresh" onClick={onRefresh} type="button">Refresh</button>
    </div>
  );
}
