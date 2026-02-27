'use client';

import React from 'react';

type BoardProp = {
  id: string;
  player: string;
  market: string;
  line: string;
  odds: string;
  hitRateL10?: number;
  hitRateL5?: number;
  confidencePct?: number;
  riskTag?: string;
};

type ExpandableGamePanelProps = {
  gameId: string;
  matchup: string;
  startTime: string;
  props: BoardProp[];
  inSlip: (propId: string) => boolean;
  onToggleLeg: (prop: BoardProp) => void;
};

export function ExpandableGamePanel({ gameId, matchup, startTime, props, inSlip, onToggleLeg }: ExpandableGamePanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState<string | null>(null);
  const topSignals = props.slice(0, 2).map((prop) => `${prop.player} ${prop.market} ${prop.line}`);

  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/70 p-2" data-testid={`game-panel-${gameId}`}>
      <div className="grid grid-cols-[1fr_auto] items-start gap-2">
        <div>
          <p className="text-sm font-medium text-slate-100">{matchup}</p>
          <p className="text-[11px] text-slate-400">{startTime} · {props.length} props · {topSignals.join(' | ')}</p>
        </div>
        <button type="button" onClick={() => setExpanded((current) => !current)} className="rounded border border-white/20 px-2 py-1 text-[11px]" aria-expanded={expanded}>
          {expanded ? 'Collapse props' : 'Expand props'}
        </button>
      </div>
      {expanded ? (
        <div className="mt-1.5 divide-y divide-white/10 rounded border border-white/10 bg-slate-950/60" data-testid="terminal-prop-rows">
          {props.map((prop) => {
            const selected = inSlip(prop.id);
            return (
              <div key={prop.id} className="px-2 py-1">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-2 text-[11px]">
                  <span className="truncate text-slate-100">{prop.player}</span>
                  <span className="truncate font-mono text-slate-300">{prop.market} {prop.line}</span>
                  <span className="font-mono text-slate-300">{prop.odds}</span>
                  <button type="button" onClick={() => setOpenDetails((current) => (current === prop.id ? null : prop.id))} className="rounded border border-white/20 px-1 text-[10px]">Details</button>
                  <button type="button" onClick={() => onToggleLeg(prop)} className="rounded border border-white/20 px-1 text-[10px] text-cyan-100">{selected ? '−' : '+'}</button>
                </div>
                {openDetails === prop.id ? <div className="mt-1 rounded border border-cyan-300/20 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-200">L5 {prop.hitRateL5 ?? '—'} · L10 {prop.hitRateL10 ?? '—'} · Volatility {String(prop.riskTag ?? 'watch')} · Confidence {prop.confidencePct ?? '—'}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
