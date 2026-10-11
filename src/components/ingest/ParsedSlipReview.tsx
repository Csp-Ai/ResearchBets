'use client';

import { useState } from 'react';
import type { MarketType } from '@/src/core/markets/marketType';
import { REVIEW_MARKETS, newReviewLeg, reviewLegIssues, type ReviewLeague, type ReviewLeg } from '@/src/core/track/slipReview';

const MARKET_LABELS: Record<string, string> = {
  ra: 'Rebounds + assists',
  pra: 'Points + rebounds + assists',
  threes: '3-pointers made',
  anytime_td: 'Anytime touchdown',
  passing_tds: 'Passing touchdowns',
};
const niceLabel = (value: string) =>
  MARKET_LABELS[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ParsedSlipReview({ legs, onChange }: {
  legs: ReviewLeg[];
  onChange: (updated: ReviewLeg[]) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const change = (index: number, patch: Partial<ReviewLeg>) => {
    setExpanded((previous) => ({ ...previous, [legs[index]!.legId]: true }));
    onChange(legs.map((leg, position) => position === index ? { ...leg, ...patch } : leg));
  };
  const add = () => onChange([...legs, newReviewLeg('manual-' + Date.now() + '-' + legs.length)]);

  return (
    <section aria-label="Review ticket selections" className="space-y-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.025] p-3 sm:p-5" data-testid="parsed-slip-review">
      <div>
        <h2 className="text-xl font-semibold text-white">Check your ticket</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Screenshot recognition can miss a name, line, or even a whole leg. Compare every selection with your sportsbook ticket before X-Ray.
          Corrections here are yours, not verified sportsbook data.
        </p>
      </div>
      {legs.map((leg, index) => {
        const issues = reviewLegIssues(leg);
        const isExpanded = expanded[leg.legId] ?? issues.length > 0;
        const supportedMarkets = leg.league === 'Unknown'
          ? [...REVIEW_MARKETS.NFL, ...REVIEW_MARKETS.NBA]
          : [...REVIEW_MARKETS[leg.league]];
        return (
          <article key={leg.legId} aria-label={'Selection ' + (index + 1)} className="space-y-3 rounded-xl border border-white/10 bg-slate-950/80 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Selection {index + 1}: {leg.player || 'Unrecognized player'}</h3>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-expanded={isExpanded} className="min-h-11 rounded-lg px-2 text-xs text-cyan-200 underline underline-offset-2" onClick={() => setExpanded((previous) => ({ ...previous, [leg.legId]: !isExpanded }))}>
                  {isExpanded ? 'Close' : 'Edit'} selection {index + 1}
                </button>
                <button type="button" className="min-h-11 rounded-lg px-2 text-xs text-slate-300 underline underline-offset-2" onClick={() => onChange(legs.filter((_, pos) => pos !== index))}>
                  Remove
                </button>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              {leg.league === 'Unknown' ? 'Sport unknown' : leg.league} · {leg.direction === 'under' ? 'Under' : 'Over / at least'} {leg.threshold || '?'} {leg.marketType ? niceLabel(leg.marketType) : 'market unknown'}
              <span className="text-slate-500"> · {leg.odds || 'price unknown'} · {leg.teams || leg.gameId || 'matchup unknown'}</span>
              {issues.length > 0 ? <span className="ml-2 text-amber-200">· Needs correction</span> : null}
            </p>
            {isExpanded ? (
            <>
            {leg.rawText ? <p className="rounded-lg bg-white/[0.035] p-2 text-xs text-slate-400">Read from ticket: {leg.rawText}</p> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-300">
                Player name
                <input className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.player} onChange={(event) => change(index, { player: event.target.value })} placeholder="First and last name" autoComplete="off" />
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Sport / league
                <select className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.league} onChange={(event) => {
                  const league = event.target.value as ReviewLeague;
                  const allowed = league !== 'Unknown' && (REVIEW_MARKETS[league] as readonly string[]).includes(leg.marketType);
                  change(index, { league, marketType: allowed ? leg.marketType : '' });
                }}>
                  <option value="Unknown">Choose a sport</option>
                  <option value="NFL">NFL</option>
                  <option value="NBA">NBA</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Market
                <select className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.marketType} onChange={(event) => {
                  const market = event.target.value as MarketType | '';
                  change(index, {
                    marketType: market,
                    threshold: market === 'anytime_td' ? 1 : leg.threshold,
                    direction: market === 'anytime_td' ? 'over' : leg.direction,
                    ladder: market === 'anytime_td' || leg.ladder,
                  });
                }}>
                  <option value="">Choose a market</option>
                  {[...new Set(supportedMarkets)].map((market) => <option value={market} key={market}>{niceLabel(market)}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Threshold
                <input type="number" min="0" max="1000" step="any" className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.threshold || ''} onChange={(event) => change(index, { threshold: event.target.value ? Number(event.target.value) : 0 })} placeholder="e.g. 60" disabled={leg.marketType === 'anytime_td'} />
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Direction
                <select className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.direction} onChange={(event) => change(index, { direction: event.target.value as 'over' | 'under', ladder: false })} disabled={leg.marketType === 'anytime_td'}>
                  <option value="over">Over / at least</option>
                  <option value="under">Under</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Price (optional)
                <input className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.odds ?? ''} onChange={(event) => change(index, { odds: event.target.value })} placeholder="-110 or +125" inputMode="text" autoComplete="off" />
              </label>
              <label className="block text-xs font-medium text-slate-300 sm:col-span-2">
                Matchup (optional)
                <input className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white" value={leg.teams ?? leg.gameId ?? ''} onChange={(event) => change(index, { teams: event.target.value, gameId: event.target.value })} placeholder="SEA @ ARI — leave blank if unknown" autoComplete="off" />
              </label>
            </div>
            {issues.length ? (
              <div className="space-y-1 rounded-lg border border-amber-400/25 bg-amber-400/5 p-2 text-xs text-amber-100" role="status">
                {issues.map((issue) => <p key={issue}>{issue}</p>)}
              </div>
            ) : null}
            {!leg.teams && !leg.gameId ? <p className="text-xs text-slate-400">Matchup not provided. ResearchBets will not assume same-game correlation for this selection.</p> : null}
            </>
            ) : null}
          </article>
        );
      })}
      <button type="button" className="min-h-11 w-full rounded-xl border border-dashed border-white/30 px-4 py-3 text-sm font-semibold text-slate-100" onClick={add} disabled={legs.length >= 16}>
        + Add a missing selection
      </button>
      <p className="text-xs leading-5 text-slate-400">
        Missing odds are allowed; price-based risk will be unavailable for those legs. This review checks what you entered, not live player availability, injury news, or sportsbook prices.
      </p>
    </section>
  );
}
