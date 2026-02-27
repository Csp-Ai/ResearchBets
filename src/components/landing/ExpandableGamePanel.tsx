'use client';

import React from 'react';

type BoardProp = {
  id: string;
  player: string;
  market: string;
  line: string;
  odds: string;
  team?: string;
  hitRateL10?: number;
  hitRateL5?: number;
  confidencePct?: number;
  riskTag?: string;
  edgeDelta?: number;
};

type ExpandableGamePanelProps = {
  gameId: string;
  matchup: string;
  startTime: string;
  props: BoardProp[];
  inSlip: (propId: string) => boolean;
  onToggleLeg: (prop: BoardProp) => void;
};

const confidenceFromProp = (prop: BoardProp): number => {
  if (typeof prop.confidencePct === 'number') return Math.max(0, Math.min(100, Math.round(prop.confidencePct)));
  if (typeof prop.hitRateL10 === 'number') return Math.max(0, Math.min(100, Math.round(prop.hitRateL10)));
  if (typeof prop.hitRateL5 === 'number') return Math.max(0, Math.min(100, Math.round(prop.hitRateL5)));
  return 50;
};

const moneylineUnderdog = (props: BoardProp[]): BoardProp | null => {
  const candidates = props.filter((prop) => prop.market.toLowerCase().includes('moneyline'));
  const plusMoney = candidates
    .filter((prop) => prop.odds.trim().startsWith('+'))
    .sort((left, right) => Number.parseInt(right.odds, 10) - Number.parseInt(left.odds, 10));
  return plusMoney[0] ?? candidates[0] ?? null;
};

export function ExpandableGamePanel({ gameId, matchup, startTime, props, inSlip, onToggleLeg }: ExpandableGamePanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [pulsePropId, setPulsePropId] = React.useState<string | null>(null);
  const [away, home] = matchup.split('@').map((part) => part.trim());

  const underdog = moneylineUnderdog(props);
  const spread = props.find((prop) => prop.market.toLowerCase().includes('spread'));
  const total = props.find((prop) => prop.market.toLowerCase().includes('total'));
  const topProps = [...props]
    .sort((left, right) => confidenceFromProp(right) - confidenceFromProp(left))
    .slice(0, 4);

  const teamMap = new Map<string, BoardProp[]>();
  topProps.forEach((prop, index) => {
    const fallbackTeam = index % 2 === 0 ? away || 'Away' : home || 'Home';
    const team = prop.team ?? fallbackTeam;
    teamMap.set(team, [...(teamMap.get(team) ?? []), prop]);
  });

  const whyLine = topProps[0]
    ? `${topProps[0].player} projects strongest (${confidenceFromProp(topProps[0])}% confidence) with ${topProps[0].riskTag ?? 'balanced'} volatility.`
    : 'No prop edges posted yet.';

  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/70 p-3" data-testid={`game-panel-${gameId}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-100">{matchup}</p>
          <p className="text-[11px] text-slate-400">{startTime}</p>
        </div>
        <button type="button" onClick={() => setExpanded((current) => !current)} className="rounded border border-white/20 px-2 py-1 text-[11px]" aria-expanded={expanded}>
          {expanded ? 'Hide props' : 'Scan props'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-200">
        {underdog ? <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5">Underdog {underdog.player} {underdog.odds}</span> : null}
        {spread ? <span className="rounded-full border border-white/20 px-2 py-0.5">Spread {spread.line}</span> : null}
        {total ? <span className="rounded-full border border-white/20 px-2 py-0.5">Total {total.line}</span> : null}
      </div>

      <p className="mt-2 text-[11px] text-slate-300">{whyLine}</p>

      <div className="mt-2 grid gap-2 md:grid-cols-2" data-testid="value-props-grid">
        {Array.from(teamMap.entries()).map(([team, teamProps]) => (
          <div key={team} className="rounded border border-white/10 bg-slate-950/70 p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{team} top props</p>
            <div className="mt-1 space-y-1.5">
              {teamProps.slice(0, 2).map((prop) => {
                const selected = inSlip(prop.id);
                const confidence = confidenceFromProp(prop);
                return (
                  <div key={prop.id} className={`rounded border px-2 py-1 transition ${pulsePropId === prop.id ? 'border-cyan-300/70 bg-cyan-300/10' : 'border-white/10 bg-slate-900/70'}`}>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-slate-100">{prop.player} {prop.market} {prop.line}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleLeg(prop);
                          setPulsePropId(prop.id);
                          window.setTimeout(() => setPulsePropId((current) => (current === prop.id ? null : current)), 260);
                        }}
                        className="rounded border border-cyan-300/40 px-1.5 py-0.5 text-cyan-100"
                      >
                        {selected ? '−' : '+'}
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{prop.odds}</span>
                      <span>Hit L10 {prop.hitRateL10 ?? '—'}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded bg-white/10">
                      <div className="h-1.5 rounded bg-cyan-300/80" style={{ width: `${confidence}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {expanded ? (
        <div className="mt-2 divide-y divide-white/10 rounded border border-white/10 bg-slate-950/60" data-testid="terminal-prop-rows">
          {props.map((prop) => (
            <div key={prop.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-2 py-1 text-[11px]">
              <span className="truncate text-slate-100">{prop.player} · {prop.market} {prop.line}</span>
              <span className="font-mono text-slate-400">{prop.odds}</span>
              <button type="button" onClick={() => onToggleLeg(prop)} className="rounded border border-white/20 px-1 text-[10px] text-cyan-100">{inSlip(prop.id) ? '−' : '+'}</button>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
