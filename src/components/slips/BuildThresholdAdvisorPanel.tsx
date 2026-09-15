'use client';

import { useEffect, useMemo, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/button';
import { CardSurface } from '@/src/components/ui/CardSurface';
import {
  applyBuildThresholdMove,
  buildBuildThresholdAdvice,
  enrichBuildSlipFromIdeas,
  type BuildThresholdIdea,
  type BuildThresholdMove,
  type TicketRiskSnapshot,
} from '@/src/core/slips/buildThresholdAdvisor';

type IdeasResponse = {
  ok?: boolean;
  data?: {
    mode?: 'live-market' | 'unavailable';
    generatedAt?: string;
    ideas?: BuildThresholdIdea[];
  };
};

const pct = (value: number | null) =>
  value === null ? '—' : `${(value * 100).toFixed(1)}%`;

const signedPts = (value: number) => {
  const points = Math.round(value * 100);
  return `${points >= 0 ? '+' : ''}${points} pts`;
};

const snapshotLabel = (snapshot: TicketRiskSnapshot) =>
  `${snapshot.pushedCount}/${snapshot.pushBudget} push slots · ${snapshot.status}`;

const proxyCoverage = (snapshot: TicketRiskSnapshot) =>
  snapshot.priceStackComplete
    ? 'all legs priced'
    : `${snapshot.pricedLegCount}/${snapshot.totalLegs} legs priced`;

function RiskComparison({ move }: { move: BuildThresholdMove }) {
  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-500">
        Before → after
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5">
          <div className="text-slate-600">Current</div>
          <div className="mt-1 font-semibold text-slate-200">{snapshotLabel(move.before)}</div>
          <div className="mt-1 text-slate-500">
            Price-stack proxy {pct(move.before.priceStackProbability)}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5">
          <div className="text-slate-600">With move</div>
          <div className="mt-1 font-semibold text-slate-200">{snapshotLabel(move.after)}</div>
          <div className="mt-1 text-slate-500">
            Price-stack proxy {pct(move.after.priceStackProbability)}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[9px] leading-4 text-slate-600">
        Independent sportsbook-price proxy only ({proxyCoverage(move.after)}). It is not a ResearchBets win-probability prediction and does not model same-game correlation.
      </div>
    </div>
  );
}

function MoveCard({
  move,
  title,
  badge,
  actionLabel,
  onApply,
}: {
  move: BuildThresholdMove;
  title: string;
  badge: string;
  actionLabel: string;
  onApply: () => void;
}) {
  const probabilityDirection = move.kind === 'safety' ? 1 : -1;
  const delta = move.probabilityDelta * probabilityDirection;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</div>
          <div className="mt-1.5 text-[14px] font-semibold text-slate-100">{move.player}</div>
          <div className="mt-1 text-[10px] text-slate-500">
            {move.marketType.replace(/_/g, ' ')} · {move.currentLine} → {move.targetLine}
          </div>
        </div>
        <Badge variant={move.kind === 'safety' ? 'success' : 'info'} size="sm">{badge}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl border border-white/[0.05] bg-black/20 p-2.5">
          <div className="text-slate-600">Sportsbook implied</div>
          <div className="mt-1 font-semibold text-slate-200">
            {Math.round(move.currentProbability * 100)}% → {Math.round(move.targetProbability * 100)}%
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.05] bg-black/20 p-2.5">
          <div className="text-slate-600">Probability trade</div>
          <div className={`mt-1 font-semibold ${delta >= 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
            {signedPts(delta)}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-400">{move.reason}</p>
      <div className="mt-2 text-[9px] text-slate-600">
        Posted target price: {move.bestPrice} best · {move.consensusPrice} consensus
      </div>
      <RiskComparison move={move} />
      <Button
        intent={move.kind === 'safety' ? 'secondary' : 'primary'}
        className="mt-3 w-full text-xs"
        onClick={onApply}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export function BuildThresholdAdvisorPanel({
  legs,
  onApply,
}: {
  legs: SlipBuilderLeg[];
  onApply: (nextLegs: SlipBuilderLeg[]) => void;
}) {
  const nervous = useNervousSystem();
  const [ideas, setIdeas] = useState<BuildThresholdIdea[]>([]);
  const [marketState, setMarketState] = useState<'loading' | 'live' | 'unavailable'>('loading');
  const legSignature = useMemo(
    () => legs.map((leg) => [leg.id, leg.player, leg.marketType, leg.line, leg.game ?? ''].join(':')).join('|'),
    [legs],
  );

  useEffect(() => {
    if (legs.length === 0) {
      setIdeas([]);
      setMarketState('unavailable');
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ sport: 'NFL', date: nervous.date, tz: nervous.tz });
    setIdeas([]);
    setMarketState('loading');

    fetch(`/api/ideas/today?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('ideas_unavailable');
        const payload = (await response.json()) as IdeasResponse;
        const rows = payload.ok ? payload.data?.ideas ?? [] : [];
        setIdeas(rows);
        setMarketState(payload.data?.mode === 'live-market' ? 'live' : 'unavailable');
      })
      .catch((error) => {
        if ((error as Error).name === 'AbortError') return;
        setIdeas([]);
        setMarketState('unavailable');
      });

    return () => controller.abort();
  }, [legSignature, legs.length, nervous.date, nervous.tz]);

  const enrichedLegs = useMemo(
    () => enrichBuildSlipFromIdeas(legs, ideas),
    [ideas, legs],
  );
  const advice = useMemo(
    () => buildBuildThresholdAdvice(enrichedLegs),
    [enrichedLegs],
  );

  if (legs.length === 0) return null;

  const safety = marketState === 'live' ? advice.safety : null;
  const escalation = marketState === 'live' ? advice.escalation : null;

  const applyMove = (move: BuildThresholdMove) => {
    if (marketState !== 'live') return;
    onApply(enrichedLegs.map((leg) => applyBuildThresholdMove(leg, move)));
  };

  return (
    <CardSurface className="space-y-3 p-4" data-testid="build-threshold-advisor">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-100/55">
            Threshold Advisor
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-100">Optimize the ticket, not every leg.</h3>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            One verified safety move and one selective escalation, using adjacent live market tiers when available.
          </p>
        </div>
        <Badge variant={marketState === 'live' ? 'success' : marketState === 'loading' ? 'info' : 'warning'} size="sm">
          {marketState === 'live' ? 'Live tiers' : marketState === 'loading' ? 'Scanning' : 'No live tiers'}
        </Badge>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 text-[10px] text-slate-400">
        Ticket now: <span className="font-semibold text-slate-200">{snapshotLabel(advice.baseline)}</span>
        <span className="text-slate-600"> · </span>
        price-stack proxy <span className="font-semibold text-slate-300">{pct(advice.baseline.priceStackProbability)}</span>
        <div className="mt-1 text-[9px] text-slate-600">
          {proxyCoverage(advice.baseline)} · pricing proxy, not a calibrated hit-rate forecast
        </div>
      </div>

      {marketState === 'loading' ? (
        <div className="rounded-2xl border border-cyan-300/[0.08] bg-cyan-300/[0.02] p-4 text-[10px] text-slate-400">
          Checking the current alternate-market ladder before recommending a move.
        </div>
      ) : null}

      {marketState === 'unavailable' ? (
        <div className="rounded-2xl border border-amber-300/[0.09] bg-amber-300/[0.02] p-4 text-[10px] leading-5 text-slate-400">
          <span className="font-semibold text-amber-100/75">Threshold actions unavailable.</span> ResearchBets is failing closed because a fresh live ladder could not be verified.
        </div>
      ) : null}

      {marketState === 'live' ? (
        <div className="space-y-3">
          {safety ? (
            <MoveCard
              move={safety}
              title="Best safety move"
              badge="Safer"
              actionLabel={`Apply ${safety.targetLine}+`}
              onApply={() => applyMove(safety)}
            />
          ) : (
            <div className="rounded-2xl border border-emerald-300/[0.09] bg-emerald-300/[0.02] p-4 text-[10px] leading-5 text-slate-400">
              <span className="font-semibold text-emerald-100/75">No verified safety move.</span> ResearchBets will not invent a lower tier when the live scanner does not have one.
            </div>
          )}

          {escalation ? (
            <MoveCard
              move={escalation}
              title="Best selective escalation"
              badge="Push budget"
              actionLabel={`Escalate to ${escalation.targetLine}+`}
              onApply={() => applyMove(escalation)}
            />
          ) : (
            <div className="rounded-2xl border border-amber-300/[0.09] bg-amber-300/[0.02] p-4 text-[10px] leading-5 text-slate-400">
              <span className="font-semibold text-amber-100/75">Hold the current asks.</span>{' '}
              {advice.report.budgetRemaining <= 0
                ? 'The ticket has no unused push budget for another escalation.'
                : 'No verified higher tier clears the selective-escalation guardrails.'}
            </div>
          )}
        </div>
      ) : null}
    </CardSurface>
  );
}
