'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { asMarketType } from '@/src/core/markets/marketType';
import { COMMON_PLAYER_PROP_MARKETS, buildPlayerPropSuggestion } from '@/src/core/slips/playerPropInput';
import type { PropLegInsight } from '@/src/core/slips/propInsights';

type ExtractedLeg = { selection: string; market?: string; odds?: string };

export function BetSlipIngestionForm() {
  const [rawInput, setRawInput] = useState('Lakers -4.5 spread -110\nCeltics moneyline -120');
  const [player, setPlayer] = useState('Jayson Tatum');
  const [propMarket, setPropMarket] = useState('points');
  const [propLine, setPropLine] = useState('27.5');
  const [propOdds, setPropOdds] = useState('-115');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ slipId: string; traceId: string; legs: ExtractedLeg[]; legInsights: PropLegInsight[] } | null>(null);

  const playerSuggestion = buildPlayerPropSuggestion({ player, marketType: propMarket, line: propLine, odds: propOdds });

  const appendPlayerProp = () => {
    if (!player.trim()) return;
    setRawInput((current) => `${current.trim()}\n${playerSuggestion.legText}`.trim());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const anonSessionId = ensureAnonSessionId();
      const requestId = createClientRequestId();

      const submitRes = await fetch('/api/slips/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'paste', raw_text: rawInput, anon_session_id: anonSessionId, request_id: requestId }),
      }).then((res) => res.json());

      const extractRes = await fetch('/api/slips/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slip_id: submitRes.slip_id, request_id: createClientRequestId(), anon_session_id: anonSessionId }),
      }).then((res) => res.json());

      const extractedLegs = (extractRes.extracted_legs ?? []) as ExtractedLeg[];
      setResult({
        slipId: submitRes.slip_id,
        traceId: submitRes.trace_id,
        legs: extractedLegs,
        legInsights: extractRes.leg_insights ?? [],
      });

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          `rb-slip-${submitRes.slip_id}`,
          JSON.stringify({ legs: extractedLegs })
        );
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Invalid payload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rb-card space-y-5">
      <h2 className="text-2xl font-semibold">Paste Slip</h2>
      <p className="mt-1 text-sm text-slate-400">Paste your ticket text and we will parse legs instantly.</p>
      <div className="rounded-xl border border-slate-800/60 bg-slate-950/45 p-4">
        <p className="text-sm font-medium text-slate-200">Quick add (optional)</p>
        <p className="mt-1 text-xs text-slate-400">Defaults to points. Markets are normalized through MarketType.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border border-slate-700 bg-slate-950 p-2 text-xs" value={player} onChange={(event) => setPlayer(event.target.value)} placeholder="Player" />
          <select className="rounded border border-slate-700 bg-slate-950 p-2 text-xs" value={propMarket} onChange={(event) => setPropMarket(asMarketType(event.target.value, 'points'))}>
            {COMMON_PLAYER_PROP_MARKETS.map((market) => (
              <option value={market} key={market}>{market}</option>
            ))}
          </select>
          <input className="rounded border border-slate-700 bg-slate-950 p-2 text-xs" value={propLine} onChange={(event) => setPropLine(event.target.value)} placeholder="Line (optional)" />
          <input className="rounded border border-slate-700 bg-slate-950 p-2 text-xs" value={propOdds} onChange={(event) => setPropOdds(event.target.value)} placeholder="Odds (optional)" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button className="rounded border border-cyan-500 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10" type="button" onClick={appendPlayerProp}>Append player prop leg</button>
          <span className="text-xs text-slate-400">Suggested leg: {playerSuggestion.legText || 'Enter player to generate suggestion'}</span>
        </div>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <textarea className="h-64 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs" onChange={(event) => setRawInput(event.target.value)} value={rawInput} />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button className="rb-btn-primary disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze now'}
        </button>
      </form>

      {result ? (
        <div className="space-y-3 rounded-xl border border-slate-800/60 bg-slate-950/45 p-4">
          <p className="text-sm text-slate-200">Extracted legs ({result.legs.length})</p>
          <ul className="space-y-2 text-xs text-slate-300">
            {result.legs.map((leg, index) => {
              const marketType = asMarketType(leg.market, 'points');
              const insight = result.legInsights[index];
              return (
                <li key={`${leg.selection}-${index}`} className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-3">
                  <p>{leg.selection} {marketType ? `· ${marketType}` : ''} {leg.odds ? `· ${leg.odds}` : ''}</p>
                  {insight ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {insight.marketLabel} · Last 5 hit rate {insight.hitRateLast5}% · Trend {insight.trend} · Risk {insight.riskTag}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <Link className="inline-flex rounded-xl border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/10" href={`/research?slip_id=${result.slipId}&trace_id=${result.traceId}&legs=${encodeURIComponent(JSON.stringify(result.legs))}`}>
            Start Research Snapshot
          </Link>
        </div>
      ) : null}
    </section>
  );
}
