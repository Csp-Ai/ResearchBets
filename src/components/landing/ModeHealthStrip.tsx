'use client';

import { getModePresentation } from '@/src/core/mode';
import React from 'react';

type FeedState = 'ok' | 'warn';

type Feed = {
  label: string;
  state: FeedState;
  hint?: string;
};

type ModeHealthStripProps = {
  mode: 'live' | 'demo' | 'cache';
  asOf: Date;
  feeds: Feed[];
};

const formatAsOf = (value: Date): string => {
  if (Number.isNaN(value.getTime())) return '—';
  return value.toLocaleTimeString([], { hour12: false });
};

const chipClass = 'rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-200';

export function ModeHealthStrip({ mode, asOf, feeds }: ModeHealthStripProps) {
  const hasWarn = feeds.some((feed) => feed.state === 'warn');
  const isDemo = mode === 'demo';

  const modeLabel = isDemo
    ? getModePresentation('demo').label
    : hasWarn
      ? 'Live mode (some feeds unavailable)'
      : getModePresentation('live').label;

  const modeTooltip = isDemo
    ? 'Live feeds are disabled. You can still build, run risk, and review using demo data.'
    : hasWarn
      ? 'Some live feeds are currently unavailable. The board remains usable with partial/fallback data.'
      : 'Live feeds are healthy.';

  return (
    <section aria-label="mode-health-strip" className="flex flex-wrap items-center justify-end gap-2 text-xs font-medium text-slate-300">
      <span className={chipClass} title={modeTooltip}>
        {isDemo ? 'DEMO' : 'LIVE'}
      </span>
      <span className={chipClass} title={modeTooltip}>{modeLabel}</span>
      <span className={chipClass}>As of {formatAsOf(asOf)}</span>
      {feeds.map((feed) => (
        <span
          key={feed.label}
          title={feed.hint}
          className={`${chipClass} ${feed.state === 'ok' ? 'text-emerald-200/90' : 'text-amber-100/90'}`}
        >
          {feed.label}: {feed.state}
        </span>
      ))}
    </section>
  );
}
