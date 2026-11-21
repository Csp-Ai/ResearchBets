'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { TodayGame, TodayPayload } from '@/src/core/today/types';

type SupportedSport = 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC';
type SportState = { pending: boolean; payload?: TodayPayload; error?: string };
const SPORTS: SupportedSport[] = ['NBA', 'NFL', 'NHL', 'MLB', 'UFC'];
const INITIAL_STATES: Record<SupportedSport, SportState> = {
  NBA: { pending: true }, NFL: { pending: true }, NHL: { pending: true },
  MLB: { pending: true }, UFC: { pending: true }
};

export function localCalendarDate(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}`;
}

export function verifiedGames(payload: TodayPayload | undefined, date: string): TodayGame[] {
  // Never expose ResearchBets demo/synthetic games as today's real fixtures.
  // The provider must explicitly identify the response as live and current-day.
  if (!payload || payload.mode !== 'live' || payload.intent?.date !== date) return [];
  const receivedAt = Date.parse(payload.generatedAt);
  if (!Number.isFinite(receivedAt) || receivedAt > Date.now() + 60_000 ||
      Date.now() - receivedAt > 15 * 60_000) return [];
  return payload.games.filter((game) =>
    (game.status === 'upcoming' || game.status === 'live') &&
    Number.isFinite(Date.parse(game.lastUpdated)) &&
    Boolean(game.startTimeISO) && Number.isFinite(Date.parse(game.startTimeISO || '')) &&
    localCalendarDate(payload.intent?.tz || 'America/Phoenix', new Date(game.startTimeISO!)) === date
  );
}

function timeLabel(value: string, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone, hour: 'numeric', minute: '2-digit'
  }).format(date);
}

export function TodayGamesExplorer() {
  const nervous = useNervousSystem();
  const [timeZone, setTimeZone] = useState('America/Phoenix');
  const [date, setDate] = useState('');
  const [active, setActive] = useState<SupportedSport>('NBA');
  const [states, setStates] = useState<Record<SupportedSport, SportState>>(INITIAL_STATES);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || nervous.tz || 'America/Phoenix';
    setTimeZone(resolvedZone);
    setDate(localCalendarDate(resolvedZone));
  }, [nervous.tz]);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setStates({
      NBA: { pending: true }, NFL: { pending: true }, NHL: { pending: true },
      MLB: { pending: true }, UFC: { pending: true }
    });
    // Reuse the canonical sports resolver. Never introduce a parallel schedule
    // scraper, invented scores, or a local probability engine.
    for (const sport of SPORTS) {
      const params = new URLSearchParams({
        sport, date, tz: timeZone
      });
      fetch(`/api/sports/slate?${params}`, { cache: 'no-store', signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error('Provider unavailable');
          const body = await response.json() as { ok?: boolean; data?: TodayPayload };
          if (!body.ok || !body.data) throw new Error('No verified provider response');
          setStates((old) => ({ ...old, [sport]: { pending: false, payload: body.data } }));
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setStates((old) => ({
            ...old, [sport]: { pending: false, error: error instanceof Error ? error.message : 'Provider unavailable' }
          }));
        });
    }
    return () => controller.abort();
  }, [date, timeZone, revision]);

  const counts = useMemo(() => Object.fromEntries(SPORTS.map((sport) =>
    [sport, verifiedGames(states[sport].payload, date).length]
  )) as Record<SupportedSport, number>, [states, date]);
  const current = states[active];
  const games = verifiedGames(current.payload, date);
  const allLoaded = SPORTS.every((sport) => !states[sport].pending);
  const totalVerified = SPORTS.reduce((total, sport) => total + counts[sport], 0);

  return (
    <section className="mt-5 space-y-4" aria-label="ResearchBets start and today's sports">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={nervous.toHref('/ingest', { entry: 'bender' })}
          className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 p-5 transition hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200">01 / YOUR TICKET</span>
          <h2 className="mt-2 text-2xl font-semibold text-white">Analyze My Screenshot</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Upload a sportsbook screenshot. Review every readable selection before Ticket X-Ray.</p>
        </Link>
        <a href="#todays-games"
          className="rounded-2xl border border-white/15 bg-white/[.045] p-5 transition hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">02 / VERIFIED SLATE</span>
          <h2 className="mt-2 text-2xl font-semibold text-white">Explore Today’s Games</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">See supported sports scheduled today, without entering a game or a market manually.</p>
        </a>
      </div>
      <div id="todays-games" className="scroll-mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200/70">Date-aware sports research</div>
            <h2 className="mt-1 text-xl font-semibold text-white">Today’s verified games</h2>
            <p className="mt-1 text-xs text-slate-400">{date || 'Checking date'} · {timeZone} · {allLoaded ? `${totalVerified} verified across supported feeds` : 'Checking provider coverage'}</p>
          </div>
          <button type="button" onClick={() => { setDate(localCalendarDate(timeZone)); setRevision((value) => value + 1); }}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200 hover:border-cyan-300" aria-label="Refresh verified games">Refresh</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Sports">
          {SPORTS.map((sport) => (
            <button type="button" key={sport} onClick={() => setActive(sport)}
              aria-pressed={active === sport}
              className={`rounded-lg border px-3 py-2 text-xs ${active === sport ? 'border-cyan-300/60 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-300'}`}>
              {sport} {states[sport].pending ? '…' : counts[sport] > 0 ? counts[sport] : '—'}
            </button>
          ))}
        </div>
        {current.pending ? (
          <p className="mt-4 text-sm text-slate-400" role="status">Checking {active} schedule and live coverage…</p>
        ) : games.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {games.slice(0, 12).map((game) => (
              <article key={game.id} className="rounded-xl border border-white/10 bg-white/[.035] p-3">
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>{active} · {game.status === 'live' ? 'Started · game status unverified' : 'Upcoming'}</span>
                  <span>{timeLabel(game.startTimeISO || '', timeZone)}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{game.matchup}</h3>
                <p className="mt-1 text-[10px] text-slate-400">
                  Schedule: {game.provenance || 'Provider'} · checked {timeLabel(game.lastUpdated, timeZone)}
                </p>
                <Link href={nervous.toHref('/today', { sport: active, date, tz: timeZone, mode: 'live' })}
                  className="mt-3 inline-flex rounded-lg border border-cyan-400/20 px-3 py-1.5 text-xs text-cyan-200">
                  Research {active} board
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200/10 bg-amber-100/[.025] p-3" role="status">
            <p className="text-sm text-slate-200">
              {current.payload?.mode === 'demo'
                ? 'Only demo fixtures are available. They are hidden from the real-game slate.'
                : current.error ? 'Live schedule provider unavailable.'
                  : 'No current verified games are available for this sport.'}
            </p>
            <p className="mt-1 text-xs text-slate-400">No game, odds, or score will be fabricated. Upload a screenshot instead, or check coverage again.</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <Link href={nervous.toHref('/today', { sport: active, tz: timeZone, date, mode: 'live' })}
            className="font-semibold text-cyan-200 hover:underline">Open {active} research board</Link>
          {active === 'NFL' ? <a href="#research-ideas" className="text-slate-300 hover:underline">See verified NFL ticket ideas</a> : (
            <span className="text-slate-500">Automatic priced ticket ideas are currently NFL-only.</span>
          )}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">Events come from ResearchBets’ existing odds-provider schedule. Kickoff alone cannot confirm a game is still in progress or provide a score. Demo, stale and other-day observations are excluded. Odds, injury news and model probabilities require separate verification.</p>
      </div>
    </section>
  );
}
