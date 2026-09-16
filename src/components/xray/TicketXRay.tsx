'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { emitHabitUsefulAnswer } from '@/src/core/analytics/habitLoop';
import {
  getBettorMistakePatternSummary,
  getDraftLearningAdvisory,
} from '@/src/core/postmortem/patternSource';
import {
  buildSlipStructureReport,
  computeSlipIntelligence,
  type SlipIntelLeg,
} from '@/src/core/slips/slipIntelligence';
import {
  deriveTicketMemoryPulse,
  type TicketMemoryPulse,
} from '@/src/core/slips/ticketMemoryPulse';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const parseLine = (value: string): string | undefined => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match?.[0];
};

const shortLabel = (value: string, max = 14) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const marketLabel = (value?: string) =>
  (value ?? 'market')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const flagLabel = (flag: string) => {
  const labels: Record<string, string> = {
    aggressive_line: 'Aggressive threshold',
    longshot_odds: 'Longshot price',
    plus_money: 'Plus-money dependency',
    same_player_dependency: 'Same-player dependency',
    same_game_script: 'Shared game script',
  };
  return labels[flag] ?? flag.replace(/_/g, ' ');
};

const repairForFlags = (flags: string[]) => {
  if (flags.includes('same_player_dependency')) {
    return 'Break one same-player dependency so a single player cannot collapse multiple legs at once.';
  }
  if (flags.includes('same_game_script')) {
    return 'Move one leg to a different game if you want less shared game-script exposure.';
  }
  if (flags.includes('aggressive_line')) {
    return 'Keep the player read, but lower the threshold before adding another leg.';
  }
  if (flags.includes('longshot_odds') || flags.includes('plus_money')) {
    return 'Consider a lower-variance version of this market instead of asking this leg to carry payout.';
  }
  return 'This is the current weakest structural point. Trimming it is the cleanest way to reduce ticket fragility.';
};

type Position = { x: number; y: number };

const nodePosition = (index: number, count: number): Position => {
  if (count === 1) return { x: 50, y: 50 };
  const radius = count <= 4 ? 33 : count <= 6 ? 36 : 38;
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180);
  return {
    x: clamp(50 + Math.cos(angle) * radius, 11, 89),
    y: clamp(50 + Math.sin(angle) * radius, 11, 89),
  };
};

const edgeClass = (severity: 'low' | 'med' | 'high') => {
  if (severity === 'high') return 'stroke-amber-300/70';
  if (severity === 'med') return 'stroke-cyan-300/55';
  return 'stroke-slate-500/35';
};

const memoryTone = (pulse?: TicketMemoryPulse) => {
  if (!pulse || pulse.level === 'learning') {
    return 'border-white/[0.07] bg-white/[0.02] text-slate-400';
  }
  if (pulse.level === 'high') {
    return 'border-fuchsia-300/[0.22] bg-fuchsia-300/[0.065] text-fuchsia-100';
  }
  if (pulse.level === 'medium') {
    return 'border-violet-300/[0.18] bg-violet-300/[0.055] text-violet-100';
  }
  if (pulse.level === 'low') {
    return 'border-indigo-300/[0.14] bg-indigo-300/[0.04] text-indigo-100';
  }
  return 'border-emerald-300/[0.13] bg-emerald-300/[0.035] text-emerald-100';
};

export function TicketXRay() {
  const nervous = useNervousSystem();
  const { slip, removeLeg, isHydrated } = useDraftSlip();

  const normalized = useMemo<SlipIntelLeg[]>(
    () =>
      slip.map((leg) => ({
        id: leg.id,
        player: leg.player,
        selection: `${leg.player} ${leg.line}`,
        marketType: leg.marketType,
        market: leg.marketType,
        line: parseLine(leg.line),
        odds: leg.odds,
        game: leg.game,
        matchup: leg.game,
      })),
    [slip],
  );

  const report = useMemo(
    () => buildSlipStructureReport(normalized, { mode: nervous.mode }),
    [normalized, nervous.mode],
  );
  const intelligence = useMemo(() => computeSlipIntelligence(normalized), [normalized]);
  const [selectedId, setSelectedId] = useState<string>();
  const [memoryPulse, setMemoryPulse] = useState<TicketMemoryPulse>();

  useEffect(() => {
    if (report.weakest_leg_id) setSelectedId(report.weakest_leg_id);
    else if (report.legs[0]?.leg_id) setSelectedId(report.legs[0].leg_id);
    else setSelectedId(undefined);
  }, [report.weakest_leg_id, report.legs]);

  useEffect(() => {
    if (!isHydrated) return;
    const patternSummary = getBettorMistakePatternSummary();
    const learningAdvisory = getDraftLearningAdvisory(slip);
    setMemoryPulse(
      deriveTicketMemoryPulse({
        slip,
        patternSummary,
        learningAdvisory,
      }),
    );
  }, [isHydrated, slip]);

  useEffect(() => {
    if (!isHydrated || report.legs.length === 0) return;
    void emitHabitUsefulAnswer({
      stage: 'xray',
      route: '/stress-test',
      spine: nervous,
      answerType: 'structural_risk',
      properties: {
        leg_count: report.legs.length,
        primary_pressure_leg_id: report.weakest_leg_id ?? null,
      },
    });
  }, [
    isHydrated,
    nervous,
    report.legs.length,
    report.weakest_leg_id,
  ]);

  const positions = useMemo(
    () => new Map(report.legs.map((leg, index) => [leg.leg_id, nodePosition(index, report.legs.length)])),
    [report.legs],
  );

  const affectedByMemory = useMemo(
    () => new Set(memoryPulse?.affected_leg_ids ?? []),
    [memoryPulse?.affected_leg_ids],
  );

  const selected = report.legs.find((leg) => leg.leg_id === selectedId) ?? report.legs[0];
  const weakest = report.legs.find((leg) => leg.leg_id === report.weakest_leg_id);
  const avgFragility = report.legs.length
    ? Math.round(report.legs.reduce((sum, leg) => sum + (leg.fragility_score ?? 0), 0) / report.legs.length)
    : 0;
  const memoryMatch = selected
    ? memoryPulse?.matches.find((match) => match.affected_leg_ids.includes(selected.leg_id))
    : undefined;
  const memoryFix = selected
    ? memoryPulse?.fixes.find((fix) => fix.affected_leg_ids.includes(selected.leg_id))
    : undefined;
  const repair = memoryFix?.action ?? (selected ? repairForFlags(selected.flags ?? []) : '');

  if (!isHydrated) {
    return (
      <section className="rounded-[30px] border border-white/[0.07] bg-[#060a10] p-5 text-slate-400">
        Loading Ticket X-Ray…
      </section>
    );
  }

  if (slip.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(10,16,25,.96),rgba(4,7,12,.98))] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/[0.08] blur-[100px]" />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">Ticket X-Ray</div>
          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em] sm:text-[48px]">Give me a ticket to dissect.</h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-500">
            Add ideas from today&apos;s slate or paste a sportsbook slip. X-Ray will map dependencies, surface the weakest leg, and show the cleanest repair.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={nervous.toHref('/')} className="rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015]">Browse today&apos;s ideas</Link>
            <Link href={nervous.toHref('/ingest')} className="rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-[11px] font-semibold text-slate-200">Scan / paste slip</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(10,16,25,.97),rgba(3,6,11,.99))] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
      <style jsx>{`
        .xray-ring { animation: xraySpin 34s linear infinite; transform-origin: 50% 50%; }
        .xray-ring-reverse { animation: xraySpinReverse 26s linear infinite; transform-origin: 50% 50%; }
        .xray-scan { animation: xrayScan 3.6s ease-in-out infinite; }
        .weak-pulse { animation: weakPulse 2.2s ease-in-out infinite; }
        .memory-pulse { animation: memoryPulse 3.4s ease-in-out infinite; }
        @keyframes xraySpin { to { transform: rotate(360deg); } }
        @keyframes xraySpinReverse { to { transform: rotate(-360deg); } }
        @keyframes xrayScan { 0%,100% { transform: translateY(-120%); opacity: 0; } 15% { opacity: .6; } 50% { opacity: .85; } 85% { opacity: .35; } 100% { transform: translateY(420%); opacity: 0; } }
        @keyframes weakPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,.12), 0 0 28px rgba(251,191,36,.08); } 50% { box-shadow: 0 0 0 9px rgba(251,191,36,0), 0 0 42px rgba(251,191,36,.18); } }
        @keyframes memoryPulse { 0%,100% { box-shadow: 0 0 22px rgba(217,70,239,.06); } 50% { box-shadow: 0 0 42px rgba(167,139,250,.18); } }
        @media (prefers-reduced-motion: reduce) {
          .xray-ring,.xray-ring-reverse,.xray-scan,.weak-pulse,.memory-pulse { animation:none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-cyan-300/[0.065] blur-[120px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-indigo-400/[0.055] blur-[130px]" />
      </div>

      <div className="relative border-b border-white/[0.065] px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/65">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-45" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              Ticket X-Ray · live structure scan
            </div>
            <h1 className="mt-2 text-[31px] font-semibold tracking-[-0.055em] sm:text-[42px]">See what can break the ticket.</h1>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">
              The constellation is generated from ResearchBets&apos; real slip-structure engine, then Bettor Memory checks whether the shape resembles your reviewed history.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            <div className="rounded-xl border border-white/[0.065] bg-black/20 px-3 py-2.5">
              <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Fragility</div>
              <div className="mt-1 text-[18px] font-semibold">{intelligence.fragilityScore}</div>
            </div>
            <div className="rounded-xl border border-white/[0.065] bg-black/20 px-3 py-2.5">
              <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Correlation</div>
              <div className="mt-1 text-[18px] font-semibold">{intelligence.correlationScore}</div>
            </div>
            <div className="rounded-xl border border-white/[0.065] bg-black/20 px-3 py-2.5">
              <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Memory</div>
              <div className="mt-1 truncate text-[11px] font-semibold capitalize text-slate-300">{memoryPulse?.level ?? 'scan'}</div>
            </div>
          </div>
        </div>

        {memoryPulse ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 ${memoryTone(memoryPulse)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-65">Bettor Memory</div>
              <div className="text-[9px] opacity-55">
                {memoryPulse.sample_size > 0 ? `${memoryPulse.sample_size} reviewed · ${memoryPulse.confidence} confidence` : 'building history'}
              </div>
            </div>
            <div className="mt-1 text-[13px] font-semibold">{memoryPulse.headline}</div>
            <p className="mt-1 max-w-3xl text-[10px] leading-5 opacity-70">{memoryPulse.summary}</p>
          </div>
        ) : null}
      </div>

      <div className="relative grid gap-0 lg:grid-cols-[1.2fr_.8fr]">
        <div className="relative min-h-[430px] overflow-hidden border-b border-white/[0.065] lg:min-h-[560px] lg:border-b-0 lg:border-r">
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <g fill="none" stroke="rgba(255,255,255,.035)" strokeWidth=".22">
              <circle cx="50" cy="50" r="36" className="xray-ring" />
              <circle cx="50" cy="50" r="27" className="xray-ring-reverse" />
              <circle cx="50" cy="50" r="18" />
              <path d="M50 14 L81 68 L19 68 Z" className="xray-ring" />
              <path d="M50 86 L81 32 L19 32 Z" className="xray-ring-reverse" />
            </g>

            {report.correlation_edges.map((edge, index) => {
              const a = positions.get(edge.a_leg_id);
              const b = positions.get(edge.b_leg_id);
              if (!a || !b) return null;
              return (
                <line
                  key={`${edge.a_leg_id}:${edge.b_leg_id}:${index}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  vectorEffect="non-scaling-stroke"
                  className={edgeClass(edge.severity)}
                  strokeWidth={edge.severity === 'high' ? 1.4 : edge.severity === 'med' ? 1.05 : 0.8}
                  strokeDasharray={edge.severity === 'low' ? '3 3' : undefined}
                />
              );
            })}
          </svg>

          <div className="xray-scan pointer-events-none absolute inset-x-[8%] top-0 h-24 bg-gradient-to-b from-transparent via-cyan-200/[0.055] to-transparent blur-md" />

          <div className="absolute left-1/2 top-1/2 z-10 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-100/[0.12] bg-[#071019]/85 shadow-[0_0_55px_rgba(34,211,238,.12)] backdrop-blur-xl">
            <div className="text-center">
              <div className="text-[19px] font-semibold tracking-[-0.05em]">{avgFragility}</div>
              <div className="mt-0.5 text-[7px] uppercase tracking-[0.16em] text-slate-600">avg fragility</div>
            </div>
          </div>

          {report.legs.map((leg) => {
            const pos = positions.get(leg.leg_id) ?? { x: 50, y: 50 };
            const isWeak = leg.leg_id === report.weakest_leg_id;
            const isSelected = leg.leg_id === selected?.leg_id;
            const isMemory = affectedByMemory.has(leg.leg_id);
            const score = leg.fragility_score ?? 0;
            return (
              <button
                key={leg.leg_id}
                type="button"
                onClick={() => setSelectedId(leg.leg_id)}
                className={`absolute z-20 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full border p-2 text-center backdrop-blur-xl transition duration-300 ${
                  isWeak
                    ? 'weak-pulse border-amber-300/[0.35] bg-amber-300/[0.075]'
                    : isMemory
                      ? 'memory-pulse border-fuchsia-300/[0.24] bg-fuchsia-300/[0.055]'
                      : isSelected
                        ? 'border-cyan-200/[0.28] bg-cyan-300/[0.075] shadow-[0_0_34px_rgba(34,211,238,.10)]'
                        : 'border-white/[0.10] bg-[#091018]/88 hover:border-white/[0.22]'
                }`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                aria-label={`Inspect ${leg.player ?? 'ticket leg'}`}
              >
                <div className={`mx-auto mb-1 h-1.5 w-1.5 rounded-full ${isWeak ? 'bg-amber-300' : isMemory ? 'bg-fuchsia-300' : 'bg-cyan-300/75'}`} />
                <div className="truncate text-[10px] font-semibold text-slate-100">{shortLabel(leg.player ?? leg.notes ?? 'Leg')}</div>
                <div className="mt-0.5 truncate text-[8px] text-slate-500">{shortLabel(marketLabel(leg.market), 12)}</div>
                <div className={`mt-1 text-[11px] font-semibold ${isWeak ? 'text-amber-200' : isMemory ? 'text-fuchsia-200' : 'text-slate-300'}`}>{score}</div>
                {isMemory ? <div className="mt-0.5 text-[6px] font-semibold uppercase tracking-[0.12em] text-fuchsia-200/70">memory</div> : null}
              </button>
            );
          })}

          <div className="absolute bottom-4 left-4 z-30 flex flex-wrap gap-2 text-[8px] uppercase tracking-[0.12em] text-slate-600">
            <span className="rounded-full border border-amber-300/[0.15] bg-black/25 px-2 py-1">Amber = weakest</span>
            <span className="rounded-full border border-fuchsia-300/[0.14] bg-black/25 px-2 py-1">Violet = memory match</span>
            <span className="rounded-full border border-cyan-300/[0.12] bg-black/25 px-2 py-1">Lines = dependencies</span>
          </div>
        </div>

        <aside className="relative p-5 sm:p-6">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-600">Selected node</div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {memoryMatch ? (
                    <span className="rounded-full border border-fuchsia-300/[0.16] bg-fuchsia-300/[0.055] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-fuchsia-200">Memory match</span>
                  ) : null}
                  {selected.leg_id === report.weakest_leg_id ? (
                    <span className="rounded-full border border-amber-300/[0.16] bg-amber-300/[0.055] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200">Primary pressure</span>
                  ) : null}
                </div>
              </div>

              <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.045em]">{selected.player ?? selected.notes ?? 'Ticket leg'}</h2>
              <div className="mt-1 text-[14px] text-slate-300">{marketLabel(selected.market)}{typeof selected.line === 'number' ? ` · ${selected.line}` : ''}</div>
              <div className="mt-1 text-[11px] text-slate-600">{selected.game_id ?? 'Game context unavailable'}{selected.odds ? ` · ${selected.odds}` : ''}</div>

              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-slate-600">Fragility score</div>
                    <div className="mt-1 text-[30px] font-semibold tracking-[-0.05em]">{selected.fragility_score ?? 0}</div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500">Rank #{selected.rank ?? '—'} of {report.legs.length}</div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                  <div
                    className={`h-full rounded-full ${selected.leg_id === report.weakest_leg_id ? 'bg-gradient-to-r from-amber-300 to-orange-300' : memoryMatch ? 'bg-gradient-to-r from-fuchsia-300 to-violet-300' : 'bg-gradient-to-r from-cyan-300 to-indigo-300'}`}
                    style={{ width: `${clamp(selected.fragility_score ?? 0, 3, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Why X-Ray cares</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected.flags?.length ? selected.flags : ['no_major_fragility_flags']).map((flag) => (
                    <span key={flag} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-slate-400">{flagLabel(flag)}</span>
                  ))}
                </div>
              </div>

              {memoryMatch ? (
                <div className="mt-5 rounded-2xl border border-fuchsia-300/[0.14] bg-fuchsia-300/[0.04] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-fuchsia-100/60">Bettor Memory match</div>
                    <div className="text-[8px] uppercase tracking-[0.12em] text-fuchsia-100/35">{memoryPulse?.sample_size ?? 0} reviewed</div>
                  </div>
                  <div className="mt-2 text-[12px] font-semibold text-fuchsia-50">{memoryMatch.label}</div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-400">{memoryMatch.reason}</p>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-cyan-200/[0.10] bg-cyan-300/[0.035] p-4">
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-cyan-100/55">{memoryFix ? 'Memory-aware repair' : 'Suggested repair'}</div>
                <p className="mt-2 text-[12px] leading-5 text-slate-300">{repair}</p>
              </div>

              <div className="mt-5 rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4">
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">Failure forecast</div>
                <div className="mt-3 space-y-2">
                  {report.failure_forecast.top_reasons.slice(0, 3).map((reason, index) => (
                    <div key={`${reason}:${index}`} className="flex gap-2 text-[11px] leading-5 text-slate-400">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!weakest}
                  onClick={() => weakest && removeLeg(weakest.leg_id)}
                  className="rounded-xl border border-amber-300/[0.13] bg-amber-300/[0.04] px-3 py-3 text-[10px] font-semibold text-amber-100/80 disabled:opacity-35"
                >
                  Trim weakest leg
                </button>
                <a href="#deep-analysis" className="rounded-xl bg-white px-3 py-3 text-center text-[10px] font-bold text-[#071015]">Full stress test ↓</a>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
