'use client';

import React from 'react';

import { Chip, IconButton, MicroBar, Panel, SlipRow } from '@/src/components/landing/ui';

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

const riskCopy = (riskTag?: string) => {
  if (!riskTag) return 'Balanced';
  return riskTag[0]?.toUpperCase() + riskTag.slice(1);
};

export function ExpandableGamePanel({ gameId, matchup, startTime, props, inSlip, onToggleLeg }: ExpandableGamePanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [pulsePropId, setPulsePropId] = React.useState<string | null>(null);

  const underdog = moneylineUnderdog(props);
  const spread = props.find((prop) => prop.market.toLowerCase().includes('spread'));
  const total = props.find((prop) => prop.market.toLowerCase().includes('total'));
  const sorted = [...props].sort((left, right) => confidenceFromProp(right) - confidenceFromProp(left));
  const visible = expanded ? sorted : sorted.slice(0, 3);

  return (
    <Panel className="p-2.5" >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-100">{matchup.replace('@', 'vs')}</p>
          <p className="text-xs text-white/60">{startTime}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {underdog ? <Chip variant="good">Dog {underdog.odds}</Chip> : null}
          {spread ? <Chip>Spread {spread.line}</Chip> : null}
          {total ? <Chip>Total {total.line}</Chip> : null}
        </div>
      </div>

      <div className="mt-2 space-y-1.5" data-testid="value-props-grid">
        {visible.map((prop) => {
          const selected = inSlip(prop.id);
          const confidence = confidenceFromProp(prop);
          const l10 = typeof prop.hitRateL10 === 'number' ? `${Math.round(prop.hitRateL10 / 10)}/10` : '—';
          return (
            <SlipRow
              key={prop.id}
              className={`transition ${pulsePropId === prop.id ? 'border-cyan-300/60 bg-cyan-300/10' : ''}`}
              leftPrimary={<span>{prop.player} • {prop.market.toUpperCase()}</span>}
              leftSecondary={`Line ${prop.line} • Hit ${l10} • ${riskCopy(prop.riskTag)}`}
              right={(
                <div className="flex items-center gap-1.5">
                  {prop.odds ? <span className="text-xs text-white/70">{prop.odds}</span> : null}
                  <Chip className="px-2 py-0.5 text-[10px]">{confidence}%</Chip>
                  <IconButton
                    type="button"
                    className="h-8 w-8"
                    aria-label={`${selected ? 'Remove' : 'Add'} ${prop.player} ${prop.market} ${prop.line}`}
                    onClick={() => {
                      onToggleLeg(prop);
                      setPulsePropId(prop.id);
                      window.setTimeout(() => setPulsePropId((current) => (current === prop.id ? null : current)), 280);
                    }}
                  >
                    {selected ? '−' : '+'}
                  </IconButton>
                </div>
              )}
            />
          );
        })}
      </div>

      <MicroBar className="mt-2 w-full" value={Math.max(40, Math.round(sorted.reduce((acc, prop) => acc + confidenceFromProp(prop), 0) / Math.max(1, sorted.length)))} />

      {sorted.length > 3 ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-xs text-cyan-100 underline-offset-2 transition hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
          aria-expanded={expanded}
          aria-controls={`more-props-${gameId}`}
        >
          {expanded ? 'Show fewer props' : `Show more props (${sorted.length - 3})`}
        </button>
      ) : null}
      <div id={`more-props-${gameId}`} className="sr-only" />
    </Panel>
  );
}
