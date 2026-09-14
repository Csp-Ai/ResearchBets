'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { MarketType } from '@/src/core/markets/marketType';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

export type EventSummary = {
  eventId: string;
  matchup: string;
  commenceTime: string;
};

export type BriefingIdea = {
  id: string;
  eventId: string;
  matchup: string;
  commenceTime: string;
  player: string;
  marketType: MarketType;
  line: number;
  bestPrice: number;
  consensusPrice?: number;
  marketImpliedProb: number;
  sourceCount: number;
  availability?: {
    label: string;
    severity: 'blocked' | 'caution';
    detail?: string;
    asOf?: string;
    source: 'SportsDataIO';
  };
  recentForm?: {
    l5HitRate: number;
    l10HitRate: number;
    l5Hits: number;
    l5Games: number;
    l10Hits: number;
    l10Games: number;
    recentAverage: number;
    sampleSize: number;
    season: string;
    asOf: string;
    source: 'SportsDataIO';
  };
  stepDown?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    sourceCount: number;
  };
};

type NextGameBriefingProps = {
  events: EventSummary[];
  ideas: BriefingIdea[];
  loading?: boolean;
  unavailable?: boolean;
};

const LABELS: Partial<Record<MarketType, string>> = {
  passing_yards: 'pass yds',
  passing_tds: 'pass TDs',
  rushing_yards: 'rush yds',
  receiving_yards: 'receiving yds',
  receptions: 'receptions',
  carries: 'carries',
  anytime_td: 'anytime TD',
};

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : String(odds));

const thresholdLabel = (idea: BriefingIdea) => {
  if (idea.marketType === 'anytime_td') return 'Anytime TD';
  const threshold = Number.isInteger(idea.line)
    ? idea.line
    : Math.abs(idea.line % 1) === 0.5
      ? Math.floor(idea.line) + 1
      : idea.line;
  return `${threshold}+ ${LABELS[idea.marketType] ?? idea.marketType.replace(/_/g, ' ')}`;
};

const formatTime = (iso: string, timeZone: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Upcoming';
  }
};

const shortMatchup = (matchup: string) => matchup
  .replace('Green Bay Packers', 'GB')
  .replace('Minnesota Vikings', 'MIN')
  .replace('Washington Commanders', 'WAS')
  .replace('Philadelphia Eagles', 'PHI')
  .replace('Arizona Cardinals', 'ARI')
  .replace('Los Angeles Chargers', 'LAC')
  .replace('Miami Dolphins', 'MIA')
  .replace('Las Vegas Raiders', 'LV')
  .replace('Dallas Cowboys', 'DAL')
  .replace('New York Giants', 'NYG')
  .replace('Los Angeles Rams', 'LAR')
  .replace('San Francisco 49ers', 'SF');

export function NextGameBriefing({
  events,
  ideas: allIdeas,
  loading = false,
  unavailable = false,
}: NextGameBriefingProps) {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();

  const nextEvent = useMemo(() => {
    const ordered = [...events].sort(
      (a, b) => Date.parse(a.commenceTime) - Date.parse(b.commenceTime),
    );
    const now = Date.now();
    return ordered.find((event) => Date.parse(event.commenceTime) > now) ?? null;
  }, [events]);

  const ideas = useMemo(
    () => nextEvent
      ? allIdeas
          .filter((idea) => idea.eventId === nextEvent.eventId)
          .sort((a, b) => b.marketImpliedProb - a.marketImpliedProb)
          .slice(0, 2)
      : [],
    [allIdeas, nextEvent],
  );

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);

  const toggle = (idea: BriefingIdea) => {
    if (slipIds.has(idea.id)) {
      removeLeg(idea.id);
      return;
    }
    addLeg({
      id: idea.id,
      player: idea.player,
      marketType: idea.marketType,
      line: thresholdLabel(idea),
      odds: formatOdds(idea.bestPrice),
      game: idea.matchup,
      marketImpliedProb: idea.marketImpliedProb,
      consensusPrice: typeof idea.consensusPrice === 'number' ? formatOdds(idea.consensusPrice) : undefined,
      recentForm: idea.recentForm,
      adjacentAlt: idea.stepDown
        ? {
            line: idea.stepDown.line,
            bestPrice: formatOdds(idea.stepDown.bestPrice),
            consensusPrice: formatOdds(idea.stepDown.consensusPrice),
            marketImpliedProb: idea.stepDown.marketImpliedProb,
            sourceCount: idea.stepDown.sourceCount,
          }
        : undefined,
    });
  };

  if (loading) {
    return <div className="h-[138px] animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.025]" />;
  }

  if (unavailable) {
    return (
      <section className="rounded-[26px] border border-amber-200/[0.10] bg-amber-100/[0.025] px-5 py-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-100/45">Next game briefing</div>
        <div className="mt-2 text-[17px] font-semibold text-slate-200">Live slate unavailable.</div>
        <p className="mt-1 text-[10px] leading-5 text-slate-600">No fallback matchup or pick is being manufactured while provider data is unavailable.</p>
        <Link href={nervous.toHref('/ingest')} className="mt-3 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] font-semibold text-slate-300">
          Scan a bet slip →
        </Link>
      </section>
    );
  }

  if (!nextEvent) {
    return (
      <section className="rounded-[26px] border border-white/[0.07] bg-white/[0.02] px-5 py-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Next game briefing</div>
        <div className="mt-2 text-[17px] font-semibold text-slate-200">No upcoming game remains on this slate.</div>
        <p className="mt-1 text-[10px] leading-5 text-slate-600">ResearchBets will wait for the next scheduled event instead of relabeling an in-progress or finished game as “next.”</p>
        <Link href={nervous.toHref('/ingest')} className="mt-3 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] font-semibold text-slate-300">
          Scan a bet slip →
        </Link>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(8,14,22,.92),rgba(4,8,13,.96))] px-5 py-4 sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/[0.055] blur-[90px]" />
      <div className="relative grid gap-4 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.6)]" />
            Next up · {formatTime(nextEvent.commenceTime, nervous.tz)}
          </div>
          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.045em] text-slate-100">
            {shortMatchup(nextEvent.matchup)}
          </h2>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            {ideas.length > 0
              ? `${ideas.length} current structure${ideas.length === 1 ? '' : 's'} from this matchup clear the useful-parlay filter.`
              : 'No structure from this matchup clears the current filter yet. ResearchBets is holding instead of forcing a leg.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={nervous.toHref('/cockpit', { sport: 'NFL', mode: 'live' })}
              className="inline-flex text-[10px] font-semibold text-cyan-100/65 hover:text-cyan-50"
            >
              Open full slate →
            </Link>
            <Link
              href={nervous.toHref('/ingest')}
              className="inline-flex text-[10px] font-semibold text-slate-400 hover:text-slate-200"
            >
              Scan a bet slip →
            </Link>
          </div>
        </div>

        {ideas.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {ideas.map((idea) => {
              const added = slipIds.has(idea.id);
              const caution = idea.availability?.severity === 'caution';
              return (
                <article key={idea.id} className={`rounded-2xl border p-3.5 ${caution ? 'border-amber-300/[0.14] bg-amber-300/[0.025]' : 'border-white/[0.065] bg-black/20'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate text-[12px] font-semibold text-slate-200">{idea.player}</div>
                        {caution ? (
                          <span className="shrink-0 rounded-full border border-amber-300/[0.14] bg-amber-300/[0.055] px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.10em] text-amber-100/70">
                            {idea.availability?.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-slate-500">{thresholdLabel(idea)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-semibold text-slate-100">{Math.round(idea.marketImpliedProb * 100)}%</div>
                      <div className="text-[7px] uppercase tracking-[0.12em] text-slate-700">market signal</div>
                    </div>
                  </div>

                  {idea.recentForm ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-cyan-300/[0.08] bg-cyan-300/[0.025] px-2.5 py-2 text-[8px] text-cyan-100/55">
                      <span className="font-semibold text-cyan-100/70">At this threshold</span>
                      <span>{idea.recentForm.l5Hits}/{idea.recentForm.l5Games} L5</span>
                      <span>·</span>
                      <span>{idea.recentForm.l10Hits}/{idea.recentForm.l10Games} L10</span>
                      <span>· avg {idea.recentForm.recentAverage}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[8px] text-slate-700">Recent form unavailable · market signal only</div>
                  )}

                  {caution ? (
                    <div className="mt-2 text-[8px] leading-4 text-amber-100/45">
                      Verified status caution · {idea.availability?.source}{idea.availability?.detail ? ` · ${idea.availability.detail}` : ''}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-600">{formatOdds(idea.bestPrice)} · {idea.sourceCount} books</span>
                    <button
                      type="button"
                      onClick={() => toggle(idea)}
                      className={`rounded-lg px-2.5 py-1.5 text-[9px] font-semibold ${added ? 'bg-emerald-300/[0.10] text-emerald-100' : 'bg-white text-[#081018]'}`}
                    >
                      {added ? 'Added ✓' : 'Add'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.055] bg-black/20 px-4 py-5 text-[11px] leading-5 text-slate-500">
            The game is next. The pick is not. Market thresholds must still clear the ResearchBets filter.
          </div>
        )}
      </div>
    </section>
  );
}
