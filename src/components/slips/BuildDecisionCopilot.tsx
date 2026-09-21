'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/button';
import { CardSurface } from '@/src/components/ui/CardSurface';
import {
  buildBuildCopilotRead,
  type BuildCopilotIntent,
  type BuildCopilotMarketState,
} from '@/src/core/copilot/buildDecision';
import type { BuildThresholdIdea } from '@/src/core/slips/buildThresholdAdvisor';
import {
  fingerprintCopilotTicket,
  saveCopilotDecision,
} from '@/src/core/copilot/decisionStore';
import {
  emitCopilotActionApplied,
  emitCopilotDecisionPresented,
  type CopilotTelemetryContext,
} from '@/src/core/copilot/telemetry';
import {
  applyBuildThresholdMove,
} from '@/src/core/slips/buildThresholdAdvisor';
import { fetchTodayIdeasShared } from '@/src/core/ideas/todayIdeasClient';

type IdeasResponse = {
  ok?: boolean;
  data?: {
    mode?: 'live-market' | 'unavailable';
    ideas?: BuildThresholdIdea[];
  };
};

const INTENTS: Array<{ id: BuildCopilotIntent; label: string }> = [
  { id: 'best_move', label: 'Best move' },
  { id: 'make_safer', label: 'Make safer' },
  { id: 'selective_push', label: 'Where can I push?' },
  { id: 'explain_ticket', label: 'Explain ticket' },
];

const stateLabel = (state: BuildCopilotMarketState) => {
  if (state === 'live') return 'Verified live market';
  if (state === 'cache') return 'Cached market context';
  if (state === 'demo') return 'Demo structure only';
  return 'Structure only';
};

export function BuildDecisionCopilot({
  legs,
  onApply,
  onAnalyze,
  traceId,
  slipId,
}: {
  legs: SlipBuilderLeg[];
  onApply: (legs: SlipBuilderLeg[]) => void;
  onAnalyze: () => void;
  traceId?: string;
  slipId?: string;
}) {
  const nervous = useNervousSystem();
  const [intent, setIntent] = useState<BuildCopilotIntent>('best_move');
  const [ideas, setIdeas] = useState<BuildThresholdIdea[]>([]);
  const [marketState, setMarketState] = useState<BuildCopilotMarketState>('unavailable');
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<'idle' | 'applied'>('idle');
  const presented = useRef(new Set<string>());

  useEffect(() => {
    if (legs.length === 0) {
      setIdeas([]);
      setMarketState('unavailable');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetchTodayIdeasShared<IdeasResponse>({
      sport: 'NFL',
      date: nervous.date,
      tz: nervous.tz,
      signal: controller.signal,
    })
      .then((payload) => {
        setIdeas(payload.ok ? payload.data?.ideas ?? [] : []);
        setMarketState(payload.data?.mode === 'live-market' ? 'live' : 'unavailable');
      })
      .catch((error) => {
        if ((error as Error).name === 'AbortError') return;
        setIdeas([]);
        setMarketState('unavailable');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [legs.length, nervous.date, nervous.tz]);

  const read = useMemo(
    () => buildBuildCopilotRead({ legs, ideas, intent, marketState }),
    [ideas, intent, legs, marketState],
  );
  const fingerprint = useMemo(() => fingerprintCopilotTicket(legs), [legs]);
  const resolvedTraceId = traceId ?? nervous.trace_id;
  const resolvedSlipId = slipId ?? nervous.slip_id;

  const context = useMemo<CopilotTelemetryContext | null>(() => {
    if (!resolvedTraceId) return null;
    return {
      traceId: resolvedTraceId,
      slipId: resolvedSlipId,
      sport: nervous.sport,
      tz: nervous.tz,
      date: nervous.date,
      mode: nervous.mode,
    };
  }, [
    nervous.date,
    nervous.mode,
    nervous.sport,
    nervous.tz,
    resolvedSlipId,
    resolvedTraceId,
  ]);

  useEffect(() => {
    if (!context || loading || legs.length === 0) return;
    const record = saveCopilotDecision({
      traceId: context.traceId,
      slipId: context.slipId,
      ticketFingerprint: fingerprint,
      read,
      state: 'presented',
    });
    if (presented.current.has(record.decisionId)) return;
    presented.current.add(record.decisionId);
    void emitCopilotDecisionPresented({ record, read, context });
  }, [context, fingerprint, legs.length, loading, read]);

  useEffect(() => {
    setActionState('idle');
  }, [fingerprint, intent]);

  if (legs.length === 0) return null;

  const applyAction = () => {
    if (!context) {
      if (read.action.kind === 'apply_threshold') {
        const move = read.action.move;
        onApply(read.enrichedLegs.map((leg) => applyBuildThresholdMove(leg, move)));
      } else if (read.action.kind === 'xray') {
        onAnalyze();
      }
      return;
    }

    const record = saveCopilotDecision({
      traceId: context.traceId,
      slipId: context.slipId,
      ticketFingerprint: fingerprint,
      read,
      state: 'applied',
    });
    void emitCopilotActionApplied({ record, context });

    if (read.action.kind === 'apply_threshold') {
      const move = read.action.move;
      onApply(read.enrichedLegs.map((leg) => applyBuildThresholdMove(leg, move)));
      setActionState('applied');
      return;
    }
    if (read.action.kind === 'xray') {
      onAnalyze();
      return;
    }
    setActionState('applied');
  };

  return (
    <CardSurface className="relative overflow-hidden p-4 sm:p-5" data-testid="build-decision-copilot">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/[0.05] blur-[80px]" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-100/55">
              ResearchBets Copilot
            </div>
            <h3 className="mt-1 text-[21px] font-semibold tracking-[-0.035em] text-slate-100">
              Ask the ticket one useful question.
            </h3>
            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">
              Copilot uses the same construction and threshold engines as X-Ray. It will not invent a market move when fresh evidence is missing.
            </p>
          </div>
          <Badge
            variant={marketState === 'live' ? 'success' : 'warning'}
            size="sm"
          >
            {loading ? 'Checking market' : stateLabel(marketState)}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Copilot question">
          {INTENTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                intent === option.id
                  ? 'rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold text-cyan-100'
                  : 'rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-400 hover:text-slate-200'
              }
              onClick={() => setIntent(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Copilot read</div>
          <div className="mt-1 text-[15px] font-semibold text-slate-100">{read.headline}</div>
          <p className="mt-2 text-[11px] leading-5 text-slate-300">{read.answer}</p>
          <div className="mt-3 rounded-xl border border-amber-200/[0.08] bg-amber-300/[0.025] p-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-amber-100/55">
              Primary pressure
            </div>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">{read.pressure}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {read.evidence.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2 py-1 text-[9px] text-slate-500"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            intent={read.action.kind === 'apply_threshold' ? 'primary' : 'secondary'}
            className="min-h-0 px-4 py-2 text-xs"
            onClick={applyAction}
            disabled={loading}
          >
            {actionState === 'applied' && read.action.kind !== 'xray'
              ? 'Decision saved ✓'
              : read.action.label}
          </Button>
          {read.optionalMove && read.action.kind !== 'apply_threshold' ? (
            <span className="text-[9px] text-slate-600">
              Optional verified move: {read.optionalMove.player} {read.optionalMove.currentLine} → {read.optionalMove.targetLine}
            </span>
          ) : null}
        </div>
      </div>
    </CardSurface>
  );
}
