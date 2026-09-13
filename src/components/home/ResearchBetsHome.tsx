'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { MarketType } from '@/src/core/markets/marketType';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type TodayIdea = {
  id: string;
  sport: 'NFL';
  eventId: string;
  matchup: string;
  commenceTime: string;
  player: string;
  marketType: MarketType;
  line: number;
  bestPrice: number;
  consensusPrice: number;
  marketImpliedProb: number;
  books: string[];
  sourceCount: number;
  structuralRisk: 'low' | 'medium' | 'high';
  readiness: 'market-verified' | 'needs-status-check';
  why: string[];
};

type IdeasPayload = {
  mode: 'live-market' | 'unavailable';
  generatedAt: string;
  date: string;
  timeZone: string;
  sport: 'NFL';
  games: number;
  ideas: TodayIdea[];
  warnings: string[];
};

type IdeasResponse = { ok: boolean; data?: IdeasPayload };
type ViewMode = 'balanced' | 'safer' | 'upside';

const LABELS: Partial<Record<MarketType, string>> = {
  passing_yards: 'pass yards',
  passing_tds: 'pass TDs',
  rushing_yards: 'rush yards',
  receiving_yards: 'receiving yards',
  receptions: 'receptions',
  carries: 'carries',
  anytime_td: 'anytime TD',
};

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : String(odds));

const thresholdLabel = (idea: TodayIdea) => {
  if (idea.marketType === 'anytime_td') return 'Anytime TD';
  const threshold = Number.isInteger(idea.line)
    ? idea.line
    : Math.abs(idea.line % 1) === 0.5
      ? Math.floor(idea.line) + 1
      : idea.line;
  return `${threshold}+ ${LABELS[idea.marketType] ?? idea.marketType}`;
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

const formatTime = (iso: string, tz: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Today';
  }
};

const formatUpdated = (iso: string | undefined, tz: string) => {
  if (!iso) return 'Scanning';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Now';
  }
};

const riskCopy = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'Low fragility';
  if (risk === 'high') return 'Higher variance';
  return 'Balanced';
};

const ideaToLeg = (idea: TodayIdea) => ({
  id: idea.id,
  player: idea.player,
  marketType: idea.marketType,
  line: thresholdLabel(idea),
  odds: formatOdds(idea.bestPrice),
  game: idea.matchup,
});

function IntelligenceCore({ games, qualified, updated }: { games: number; qualified: number; updated: string }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="absolute inset-[9%] rounded-full bg-cyan-300/[0.08] blur-3xl" />
      <svg viewBox="0 0 420 420" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(165,243,252,.26)" />
            <stop offset="45%" stopColor="rgba(34,211,238,.09)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
            <stop offset="45%" stopColor="rgba(103,232,249,.5)" />
            <stop offset="100%" stopColor="rgba(129,140,248,.18)" />
          </linearGradient>
        </defs>
        <circle cx="210" cy="210" r="188" fill="url(#coreGlow)" />
        <g fill="none" strokeWidth="1">
          <circle cx="210" cy="210" r="154" stroke="rgba(255,255,255,.08)" />
          <circle cx="210" cy="210" r="121" stroke="rgba(255,255,255,.07)" className="spin-slow" />
          <circle cx="210" cy="210" r="88" stroke="rgba(255,255,255,.08)" className="spin-reverse" />
          <path d="M210 64 L336 282 L84 282 Z" stroke="rgba(255,255,255,.09)" className="spin-slow" />
          <path d="M210 356 L336 138 L84 138 Z" stroke="rgba(255,255,255,.07)" className="spin-reverse" />
          <circle cx="210" cy="210" r="63" stroke="url(#arc)" strokeWidth="2" strokeDasharray="40 16" className="spin-fast" />
        </g>
        <g fill="rgba(165,243,252,.9)">
          <circle cx="210" cy="56" r="3.5" className="node-pulse" />
          <circle cx="349" cy="270" r="3.5" className="node-pulse delay-1" />
          <circle cx="86" cy="292" r="3.5" className="node-pulse delay-2" />
        </g>
      </svg>

      <div className="absolute inset-[29%] grid place-items-center rounded-full border border-cyan-100/[0.12] bg-[#071019]/80 shadow-[inset_0_0_40px_rgba(103,232,249,.05),0_0_60px_rgba(34,211,238,.07)] backdrop-blur-xl">
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-[0.22em] text-cyan-100/50">Live intelligence</div>
          <div className="mt-1 text-[36px] font-semibold tracking-[-0.06em]">{qualified}</div>
          <div className="text-[10px] text-slate-500">qualified ideas</div>
        </div>
      </div>

      <div className="absolute left-[2%] top-[43%] rounded-2xl border border-white/[0.08] bg-black/45 px-3 py-2 backdrop-blur-xl">
        <div className="text-[8px] uppercase tracking-[0.16em] text-slate-600">Games</div>
        <div className="text-[17px] font-semibold">{games}</div>
      </div>
      <div className="absolute right-[1%] top-[37%] rounded-2xl border border-white/[0.08] bg-black/45 px-3 py-2 text-right backdrop-blur-xl">
        <div className="text-[8px] uppercase tracking-[0.16em] text-slate-600">Updated</div>
        <div className="text-[13px] font-semibold">{updated}</div>
      </div>
    </div>
  );
}

function SignalBar({ value }: { value: number }) {
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 shadow-[0_0_20px_rgba(103,232,249,.2)]"
        style={{ width: `${value}%` }}
      />
      <div className="signal-scan absolute inset-y-[-4px] w-10 rounded-full bg-cyan-100/[0.35] blur-sm" />
    </div>
  );
}

export function ResearchBetsHome() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg, setSlip } = useDraftSlip();
  const [payload, setPayload] = useState<IdeasPayload>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('balanced');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sport: 'NFL', date: nervous.date, tz: nervous.tz });

    setLoading(true);
    setFailed(false);
    fetch(`/api/ideas/today?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as IdeasResponse;
        if (!response.ok || !body.ok || !body.data) throw new Error('ideas_unavailable');
        setPayload(body.data);
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setFailed(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [nervous.date, nervous.tz]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);

  const ideas = useMemo(() => {
    const rows = payload?.ideas ?? [];
    if (viewMode === 'safer') return [...rows].sort((a, b) => b.marketImpliedProb - a.marketImpliedProb).slice(0, 8);
    if (viewMode === 'upside') return [...rows].sort((a, b) => a.marketImpliedProb - b.marketImpliedProb).slice(0, 8);
    return rows.slice(0, 8);
  }, [payload?.ideas, viewMode]);

  const priorityIdeas = ideas.slice(0, 3);
  const moreIdeas = ideas.slice(3, 8);
  const selectedCount = slip.length;

  const toggleIdea = (idea: TodayIdea) => {
    if (slipIds.has(idea.id)) {
      removeLeg(idea.id);
      return;
    }
    addLeg(ideaToLeg(idea));
  };

  const buildTicket = () => {
    const selected = ideas.slice(0, Math.min(4, ideas.length));
    if (selected.length < 2) return;
    setSlip(selected.map(ideaToLeg));
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#02050a] text-white">
      <style jsx>{`
        .grid-field {
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, rgba(255,255,255,.95), transparent 78%);
        }
        .spin-slow { transform-origin: 210px 210px; animation: spin 28s linear infinite; }
        .spin-reverse { transform-origin: 210px 210px; animation: spinReverse 21s linear infinite; }
        .spin-fast { transform-origin: 210px 210px; animation: spin 11s linear infinite; }
        .node-pulse { animation: pulse 3.2s ease-in-out infinite; }
        .delay-1 { animation-delay: -1.1s; }
        .delay-2 { animation-delay: -2.2s; }
        .signal-scan { animation: scan 2.7s linear infinite; }
        .idea-card { scroll-snap-align: center; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinReverse { to { transform: rotate(-360deg); } }
        @keyframes pulse { 0%,100% { opacity:.25; r:3.5; } 50% { opacity:1; r:5; } }
        @keyframes scan { from { left:-18%; } to { left:110%; } }
        @media (prefers-reduced-motion: reduce) {
          .spin-slow,.spin-reverse,.spin-fast,.node-pulse,.signal-scan { animation:none !important; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="grid-field absolute inset-0" />
        <div className="absolute -left-32 -top-28 h-[28rem] w-[28rem] rounded-full bg-cyan-400/[0.08] blur-[150px]" />
        <div className="absolute -right-40 top-[24rem] h-[30rem] w-[30rem] rounded-full bg-indigo-500/[0.08] blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-4 sm:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-cyan-200/[0.14] bg-white/[0.035] text-[13px] font-black shadow-[0_0_35px_rgba(34,211,238,.1)]">R</div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.03em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Decision intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-400 backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Live · NFL
          </div>
        </header>

        <section className="relative mt-4 min-h-[78svh] overflow-hidden rounded-[34px] border border-white/[0.07] bg-[linear-gradient(150deg,rgba(11,18,29,.93),rgba(4,7,12,.95))] px-5 pb-6 pt-5 shadow-[0_40px_120px_rgba(0,0,0,.46)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/[0.35] to-transparent" />
          <div className="grid min-h-[70svh] items-center gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="relative z-10 order-2 lg:order-1">
              <div className="inline-flex rounded-full border border-cyan-200/[0.12] bg-cyan-300/[0.055] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-100/75">AI slate intelligence</div>
              <h1 className="mt-4 max-w-3xl text-[44px] font-semibold leading-[0.91] tracking-[-0.068em] sm:text-[64px] lg:text-[78px]">
                Your best parlay ideas,
                <span className="block bg-gradient-to-r from-white via-cyan-100 to-slate-400 bg-clip-text text-transparent">already researched.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-400">
                Live markets in. Junk lines out. ResearchBets surfaces the structures worth looking at today, then stress-tests the ticket before you lock it.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={buildTicket} disabled={ideas.length < 2} className="rounded-2xl bg-white px-5 py-3.5 text-[13px] font-semibold text-[#061017] transition hover:-translate-y-0.5 disabled:opacity-40">Build my best 4-leg</button>
                <Link href={nervous.toHref('/ingest')} className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-3.5 text-[13px] font-semibold text-slate-200 backdrop-blur-xl">Paste a slip</Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2">{loading ? 'Scanning…' : `${payload?.games ?? 0} games scanned`}</span>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2">{loading ? '—' : `${payload?.ideas.length ?? 0} qualified`}</span>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2">Updated {formatUpdated(payload?.generatedAt, nervous.tz)}</span>
              </div>
            </div>

            <div className="order-1 -mb-8 mt-[-2rem] sm:mb-0 sm:mt-0 lg:order-2">
              <IntelligenceCore games={payload?.games ?? 0} qualified={payload?.ideas.length ?? 0} updated={formatUpdated(payload?.generatedAt, nervous.tz)} />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Today&apos;s research</div>
              <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.05em]">Top 3 right now</h2>
            </div>
            <div className="inline-flex rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
              {([
                ['balanced', 'Balanced'],
                ['safer', 'Safer'],
                ['upside', 'Upside'],
              ] as const).map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-lg px-3 py-2 text-[10px] font-semibold ${viewMode === mode ? 'bg-white/[0.09] text-white' : 'text-slate-600'}`}>{label}</button>
              ))}
            </div>
          </div>

          {failed || payload?.mode === 'unavailable' ? (
            <div className="mt-5 rounded-[24px] border border-amber-200/[0.10] bg-amber-100/[0.03] p-5 text-sm text-slate-400">Live market scan is unavailable. ResearchBets will not invent a slate.</div>
          ) : (
            <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
              {(loading ? [] : priorityIdeas).map((idea, index) => {
                const added = slipIds.has(idea.id);
                const probability = Math.round(idea.marketImpliedProb * 100);
                return (
                  <article key={idea.id} className="idea-card min-w-[84vw] rounded-[30px] border border-white/[0.07] bg-[linear-gradient(155deg,rgba(255,255,255,.05),rgba(255,255,255,.018))] p-5 shadow-[0_24px_80px_rgba(0,0,0,.3)] sm:min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-slate-600">Priority {index + 1}</div>
                      <span className="rounded-full border border-emerald-300/[0.16] bg-emerald-300/[0.06] px-2.5 py-1 text-[9px] text-emerald-100/75">{riskCopy(idea.structuralRisk)}</span>
                    </div>
                    <div className="mt-5 text-[25px] font-semibold tracking-[-0.045em]">{idea.player}</div>
                    <div className="mt-1 text-[17px] text-slate-200">{thresholdLabel(idea)}</div>
                    <div className="mt-2 text-[11px] text-slate-600">{shortMatchup(idea.matchup)} · {formatTime(idea.commenceTime, nervous.tz)} · {idea.sourceCount} books</div>

                    <div className="mt-6 rounded-[22px] bg-black/20 p-4 ring-1 ring-white/[0.055]">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Market signal</div>
                          <div className="mt-1 text-[34px] font-semibold tracking-[-0.06em]">{probability}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Best price</div>
                          <div className="mt-1 text-[19px] font-semibold">{formatOdds(idea.bestPrice)}</div>
                        </div>
                      </div>
                      <div className="mt-4"><SignalBar value={probability} /></div>
                      <div className="mt-3 flex items-center justify-between text-[9px] text-slate-600"><span>Price-implied</span><span>{idea.readiness === 'market-verified' ? 'Verified' : 'Status pending'}</span></div>
                    </div>

                    <button type="button" onClick={() => toggleIdea(idea)} className={`mt-4 w-full rounded-2xl px-4 py-3 text-[12px] font-semibold ${added ? 'bg-emerald-300/[0.12] text-emerald-100 ring-1 ring-emerald-300/[0.2]' : 'bg-white text-[#061017]'}`}>{added ? 'Added ✓' : 'Add to ticket'}</button>
                  </article>
                );
              })}

              {loading ? [0, 1, 2].map((item) => <div key={item} className="idea-card min-w-[84vw] animate-pulse rounded-[30px] bg-white/[0.025] p-5 sm:min-w-0"><div className="h-[330px]" /></div>) : null}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.018] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Fast add</div>
                <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">More qualified ideas</h3>
              </div>
              <div className="text-[10px] text-slate-600">Tap to add</div>
            </div>
            <div className="mt-4 grid gap-2">
              {moreIdeas.map((idea) => {
                const added = slipIds.has(idea.id);
                return (
                  <button key={idea.id} type="button" onClick={() => toggleIdea(idea)} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3 text-left ring-1 ring-white/[0.055]">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-slate-200">{idea.player}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-600">{thresholdLabel(idea)} · {shortMatchup(idea.matchup)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right"><div className="text-[13px] font-semibold">{Math.round(idea.marketImpliedProb * 100)}%</div><div className="text-[9px] text-slate-600">signal</div></div>
                      <div className={`grid h-9 w-9 place-items-center rounded-full ${added ? 'bg-emerald-300/[0.12] text-emerald-100' : 'bg-white/[0.05] text-slate-300'}`}>{added ? '✓' : '+'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.07] bg-[linear-gradient(155deg,rgba(34,211,238,.045),rgba(255,255,255,.015))] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">ResearchBets edge</div>
            <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">From idea → ticket → weakest leg.</h3>
            <p className="mt-3 text-[13px] leading-6 text-slate-500">The front page gets you to useful ideas fast. The next step stress-tests correlation, fragility, and the leg most likely to break the ticket.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-slate-400">
              {['Live slate', 'Parlay utility', 'Fragility', 'Correlation', 'Postmortems'].map((item) => <span key={item} className="rounded-full bg-white/[0.035] px-3 py-2 ring-1 ring-white/[0.06]">{item}</span>)}
            </div>
            <Link href={nervous.toHref('/cockpit', { sport: 'NFL', mode: 'live' })} className="mt-5 inline-flex rounded-2xl bg-white/[0.05] px-4 py-3 text-[12px] font-semibold text-slate-200 ring-1 ring-white/[0.07]">Explore full cockpit →</Link>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#04070c]/[0.9] px-3 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-100">{selectedCount ? `${selectedCount} legs selected` : 'Build a smart ticket fast'}</div>
            <div className="mt-0.5 truncate text-[9px] text-slate-600">{selectedCount >= 2 ? 'Ready for weakest-leg analysis.' : 'Pick ideas or let ResearchBets build the first draft.'}</div>
          </div>
          {selectedCount >= 2 ? (
            <Link href={nervous.toHref('/stress-test')} className="shrink-0 rounded-2xl bg-gradient-to-r from-cyan-100 to-white px-4 py-3 text-[11px] font-bold text-[#061017]">Stress-test ticket</Link>
          ) : (
            <button type="button" onClick={buildTicket} disabled={ideas.length < 2} className="shrink-0 rounded-2xl bg-white px-4 py-3 text-[11px] font-bold text-[#061017] disabled:opacity-40">Build for me</button>
          )}
        </div>
      </div>
    </main>
  );
}
