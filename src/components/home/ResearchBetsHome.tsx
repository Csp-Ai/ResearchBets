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
  if (!iso) return 'Scanning now';
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

const riskTone = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'border-emerald-300/[0.20] bg-emerald-300/[0.08] text-emerald-200';
  if (risk === 'high') return 'border-amber-300/[0.20] bg-amber-300/[0.08] text-amber-200';
  return 'border-sky-300/[0.20] bg-sky-300/[0.08] text-sky-200';
};

const ideaToLeg = (idea: TodayIdea) => ({
  id: idea.id,
  player: idea.player,
  marketType: idea.marketType,
  line: thresholdLabel(idea),
  odds: formatOdds(idea.bestPrice),
  game: idea.matchup,
});

function SacredGeometry() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-75">
      <svg viewBox="0 0 1200 900" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="orb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(103,232,249,0.20)" />
            <stop offset="45%" stopColor="rgba(103,232,249,0.08)" />
            <stop offset="100%" stopColor="rgba(103,232,249,0)" />
          </radialGradient>
        </defs>
        <g stroke="rgba(255,255,255,0.075)" fill="none">
          <circle cx="905" cy="160" r="150" className="geo-spin-slow" />
          <circle cx="905" cy="160" r="100" className="geo-spin-reverse" />
          <circle cx="905" cy="160" r="50" className="geo-pulse" />
          <path d="M905 10 L1035 235 L775 235 Z" className="geo-spin-slow" />
          <path d="M905 310 L1035 85 L775 85 Z" className="geo-spin-reverse" />
          <circle cx="220" cy="700" r="120" className="geo-fade" />
          <circle cx="300" cy="700" r="120" className="geo-fade" />
          <circle cx="260" cy="625" r="120" className="geo-fade" />
          <circle cx="260" cy="775" r="120" className="geo-fade" />
        </g>
        <circle cx="905" cy="160" r="230" fill="url(#orb)" />
      </svg>
    </div>
  );
}

function SignalBar({ value }: { value: number }) {
  return (
    <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="signal-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300"
        style={{ width: `${value}%` }}
      />
      <div className="signal-scan absolute inset-y-[-4px] w-12 rounded-full bg-cyan-100/[0.35] blur-sm" />
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

  const heroIdeas = ideas.slice(0, 3);
  const railIdeas = ideas.slice(3, 8);

  const summary = useMemo(() => {
    const rows = payload?.ideas ?? [];
    if (!rows.length) return 'Waiting for enough live market data to produce a real slate.';
    const low = rows.filter((idea) => idea.structuralRisk === 'low').length;
    return `${rows.length} qualified ideas across ${payload?.games ?? 0} games. ${low} lower-fragility structures surfaced from the live board.`;
  }, [payload]);

  const toggleIdea = (idea: TodayIdea) => {
    if (slipIds.has(idea.id)) {
      removeLeg(idea.id);
      return;
    }
    addLeg(ideaToLeg(idea));
  };

  const buildBalancedTicket = () => {
    const selected = ideas.slice(0, Math.min(4, ideas.length));
    if (selected.length < 2) return;
    setSlip(selected.map(ideaToLeg));
  };

  const selectedCount = slip.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03060b] text-white">
      <style jsx>{`
        .geo-spin-slow { transform-origin: 905px 160px; animation: geoSpin 26s linear infinite; }
        .geo-spin-reverse { transform-origin: 905px 160px; animation: geoSpinReverse 20s linear infinite; }
        .geo-pulse { animation: geoPulse 6s ease-in-out infinite; }
        .geo-fade { animation: geoFloat 9s ease-in-out infinite; }
        .signal-fill { box-shadow: 0 0 28px rgba(103, 232, 249, .28); }
        .signal-scan { animation: signalScan 2.8s linear infinite; }
        .hero-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: linear-gradient(to bottom, rgba(255,255,255,.85), transparent 95%);
        }
        .tilt-card { transform: perspective(1200px) rotateX(0deg); transition: transform .35s ease, border-color .35s ease; }
        .tilt-card:hover { transform: perspective(1200px) rotateX(2deg) translateY(-2px); }
        @keyframes geoSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes geoSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0); } }
        @keyframes geoPulse { 0%,100% { opacity:.45; } 50% { opacity:.9; } }
        @keyframes geoFloat { 0%,100% { opacity:.16; transform:translateY(0); } 50% { opacity:.3; transform:translateY(-8px); } }
        @keyframes signalScan { from { left:-20%; } to { left:110%; } }
        @media (prefers-reduced-motion: reduce) {
          .geo-spin-slow,.geo-spin-reverse,.geo-pulse,.geo-fade,.signal-scan { animation:none !important; }
          .tilt-card:hover { transform:none; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 opacity-90">
        <div className="absolute left-[-12rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-cyan-400/[0.10] blur-[140px]" />
        <div className="absolute right-[-10rem] top-[20rem] h-[22rem] w-[22rem] rounded-full bg-indigo-500/[0.10] blur-[130px]" />
        <div className="hero-grid absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[14px] border border-cyan-200/[0.15] bg-[#0a111a] text-[13px] font-black shadow-[0_0_35px_rgba(34,211,238,.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,249,.26),transparent_48%)]" />
              <span className="relative">R</span>
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.03em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Decision intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/20 px-3 py-2 text-[10px] text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Live · NFL · {nervous.date}
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[32px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(10,16,25,.94),rgba(4,7,12,.94))] shadow-[0_30px_110px_rgba(0,0,0,.42)]">
          <SacredGeometry />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/[0.35] to-transparent" />

          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.12] bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-100/80">
                AI slate intelligence
              </div>
              <h1 className="mt-5 max-w-3xl text-[42px] font-semibold leading-[0.93] tracking-[-0.065em] sm:text-[60px] lg:text-[76px]">
                Get today&apos;s best
                <span className="block bg-gradient-to-r from-white via-cyan-100 to-slate-400 bg-clip-text text-transparent">parlay structures fast.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-400">
                ResearchBets scans the current slate, filters out junk lines, ranks playable structures, and gives you usable ticket ideas before the moment passes.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={buildBalancedTicket}
                  disabled={ideas.length < 2}
                  className="rounded-2xl bg-white px-5 py-3.5 text-[13px] font-semibold text-[#071015] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Build my best {Math.min(4, ideas.length) || 4}-leg
                </button>
                <Link href={nervous.toHref('/ingest')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.07]">
                  Paste a slip
                </Link>
              </div>

              <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
                {[
                  ['Games', loading ? '—' : String(payload?.games ?? 0)],
                  ['Qualified', loading ? '—' : String(payload?.ideas.length ?? 0)],
                  ['Selected', String(selectedCount)],
                  ['Updated', formatUpdated(payload?.generatedAt, nervous.tz)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-[118px] rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 backdrop-blur-xl">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
                    <div className="mt-1 text-[16px] font-semibold tracking-[-0.03em] text-slate-100">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tilt-card rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Instant brief</div>
                  <div className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">What made the cut</div>
                </div>
                <div className="rounded-full border border-emerald-300/[0.15] bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] text-emerald-100/80">Live research</div>
              </div>
              <p className="mt-4 text-[13px] leading-6 text-slate-400">{summary}</p>

              <div className="mt-5 grid gap-3">
                {heroIdeas.map((idea, index) => (
                  <button key={idea.id} type="button" onClick={() => toggleIdea(idea)} className="rounded-2xl border border-white/[0.08] bg-black/25 p-3 text-left transition hover:border-white/[0.16] hover:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-slate-500">Lead {index + 1}</div>
                        <div className="mt-1 text-[15px] font-semibold tracking-[-0.02em]">{idea.player}</div>
                        <div className="text-[13px] text-slate-300">{thresholdLabel(idea)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] font-semibold">{Math.round(idea.marketImpliedProb * 100)}%</div>
                        <div className="text-[9px] text-slate-600">Signal</div>
                      </div>
                    </div>
                    <SignalBar value={Math.round(idea.marketImpliedProb * 100)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Today&apos;s best ideas</div>
                <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.05em]">Three fast decisions</h2>
              </div>
              <div className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
                {([
                  ['balanced', 'Balanced'],
                  ['safer', 'Safer'],
                  ['upside', 'Upside'],
                ] as const).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${viewMode === mode ? 'bg-white/[0.10] text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="mt-5 grid gap-4">{[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-[26px] bg-white/[0.025]" />)}</div>
            ) : failed || payload?.mode === 'unavailable' ? (
              <div className="mt-5 rounded-[24px] border border-amber-200/[0.10] bg-amber-100/[0.03] p-5 text-sm text-slate-400">Live market scan is unavailable. ResearchBets won&apos;t manufacture a slate when provider data is missing.</div>
            ) : ideas.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-slate-400">No useful structures cleared today&apos;s filters. No forced picks.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {heroIdeas.map((idea, index) => {
                  const added = slipIds.has(idea.id);
                  const probability = Math.round(idea.marketImpliedProb * 100);
                  return (
                    <article key={idea.id} className={`tilt-card relative overflow-hidden rounded-[28px] border p-5 sm:p-6 ${added ? 'border-emerald-300/[0.18] bg-emerald-300/[0.045]' : 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018))]'}`}>
                      <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-cyan-300/[0.10] blur-3xl" />
                      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">Priority {index + 1}</span>
                            <span className={`rounded-full border px-2 py-1 text-[10px] ${riskTone(idea.structuralRisk)}`}>{riskCopy(idea.structuralRisk)}</span>
                          </div>
                          <h3 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.045em]">{idea.player}</h3>
                          <div className="mt-1 text-[18px] text-slate-200">{thresholdLabel(idea)}</div>
                          <div className="mt-2 text-[12px] text-slate-500">{shortMatchup(idea.matchup)} · {formatTime(idea.commenceTime, nervous.tz)} · {idea.sourceCount} books</div>

                          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            {(idea.why?.slice(0, 2) ?? ['Qualified by current market filter']).map((point, idx) => (
                              <span key={idx} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">{point}</span>
                            ))}
                          </div>
                        </div>

                        <div className="w-full shrink-0 sm:w-[220px]">
                          <div className="rounded-[22px] border border-white/[0.08] bg-black/20 p-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Signal</div>
                                <div className="mt-1 text-[28px] font-semibold tracking-[-0.05em]">{probability}%</div>
                              </div>
                              <div>
                                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Best price</div>
                                <div className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">{formatOdds(idea.bestPrice)}</div>
                              </div>
                            </div>
                            <SignalBar value={probability} />
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                              <span>Price-implied</span>
                              <span>{idea.readiness === 'market-verified' ? 'Verified' : 'Status check pending'}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => toggleIdea(idea)} className={`mt-3 w-full rounded-2xl px-4 py-3 text-[12px] font-semibold transition ${added ? 'bg-emerald-300/[0.11] text-emerald-100 ring-1 ring-emerald-300/[0.20]' : 'bg-white text-[#071015] hover:bg-slate-100'}`}>
                            {added ? 'Added to ticket ✓' : 'Add to ticket'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Fast add rail</div>
                  <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">More qualified ideas</h3>
                </div>
                <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-500">Tap to add</div>
              </div>

              <div className="mt-4 space-y-3">
                {railIdeas.map((idea, index) => {
                  const added = slipIds.has(idea.id);
                  return (
                    <button key={idea.id} type="button" onClick={() => toggleIdea(idea)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-left transition hover:bg-white/[0.04]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-600">0{index + 4}</span>
                          <div className="truncate text-[14px] font-semibold text-slate-200">{idea.player}</div>
                        </div>
                        <div className="mt-1 truncate text-[12px] text-slate-500">{thresholdLabel(idea)} · {shortMatchup(idea.matchup)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[13px] font-semibold text-slate-100">{Math.round(idea.marketImpliedProb * 100)}%</div>
                          <div className="text-[9px] text-slate-600">signal</div>
                        </div>
                        <div className={`grid h-9 w-9 place-items-center rounded-full border text-[16px] ${added ? 'border-emerald-300/[0.18] bg-emerald-300/[0.12] text-emerald-100' : 'border-white/[0.08] bg-white/[0.04] text-slate-300'}`}>{added ? '✓' : '+'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))] p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Built for speed</div>
              <div className="mt-3 grid gap-3">
                {[
                  'Instant day-of slate relevance',
                  'One-tap ticket assembly',
                  'Live signal, price, and fragility context',
                  'Ambient motion and spatial depth without visual noise',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-[13px] text-slate-300">{item}</div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-200/[0.10] bg-cyan-300/[0.05] px-4 py-3 text-[12px] leading-6 text-slate-400">
                Market signal = sportsbook-implied probability, not a guaranteed outcome. Player-status verification remains the next critical layer.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Go deeper when you want</div>
              <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">Open the full research cockpit.</h3>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">Start fast here. Open the cockpit when you want every market, deeper diagnostics, and ticket-level analysis.</p>
            </div>
            <Link href={nervous.toHref('/cockpit', { sport: 'NFL', mode: 'live' })} className="w-fit rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/[0.07]">Explore all markets →</Link>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#05080d]/[0.88] px-3 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-100">{selectedCount ? `${selectedCount} legs selected` : 'Build a smart ticket fast'}</div>
            <div className="mt-0.5 truncate text-[9px] text-slate-600">{selectedCount >= 2 ? 'Ready for weakest-leg and correlation analysis.' : 'Choose 2+ ideas or let ResearchBets build one for you.'}</div>
          </div>
          {selectedCount >= 2 ? (
            <Link href={nervous.toHref('/stress-test')} className="shrink-0 rounded-2xl bg-gradient-to-r from-cyan-100 to-white px-4 py-3 text-[11px] font-bold text-[#071015] shadow-[0_0_28px_rgba(103,232,249,.08)]">Stress-test ticket</Link>
          ) : (
            <button type="button" onClick={buildBalancedTicket} disabled={ideas.length < 2} className="shrink-0 rounded-2xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015] disabled:opacity-40">Build for me</button>
          )}
        </div>
      </div>
    </main>
  );
}
