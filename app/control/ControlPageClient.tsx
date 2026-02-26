'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { runSlip } from '@/src/core/pipeline/runSlip';
import { runStore } from '@/src/core/run/store';
import { toResearchRunDTOFromRun, type ResearchRunDTO } from '@/src/core/run/researchRunDTO';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';

type Tab = 'live' | 'review';

type PostMortemResult = {
  ok: boolean;
  classification: {
    process: string;
    correlationMiss: boolean;
    injuryImpact: boolean;
    lineValueMiss: boolean;
  };
  notes: string[];
  correlationScore: number;
  volatilityTier: 'Low' | 'Med' | 'High' | 'Extreme';
  exposureSummary: {
    topGames: Array<{ game: string; count: number }> ;
    topPlayers: Array<{ player: string; count: number }> ;
  };
};

const mockParseSlip = (fileName: string): string => {
  const key = fileName.toLowerCase();
  if (key.includes('nba')) return 'Luka Doncic over 31.5 points (-110)\nKyrie Irving over 3.5 threes (+105)';
  if (key.includes('nfl')) return 'Josh Allen over 1.5 pass TDs (-120)\nStefon Diggs over 74.5 receiving yards (-115)';
  return 'LeBron James over 6.5 rebounds (-105)\nJayson Tatum over 29.5 points (-110)';
};

const buildNextTimeAdjustments = (postmortem: PostMortemResult): string[] => {
  const topGame = postmortem.exposureSummary.topGames[0];
  const bullets: string[] = [];
  if (topGame && topGame.count >= 4) bullets.push(`${topGame.count}-leg concentration in ${topGame.game}: split across 2+ games or hedge live after first quarter.`);
  if (postmortem.correlationScore >= 65) bullets.push('Correlation ran hot: trim duplicate player dependencies to lower one-script failure risk.');
  if (postmortem.volatilityTier === 'High' || postmortem.volatilityTier === 'Extreme') bullets.push(`Volatility was ${postmortem.volatilityTier}: reduce alt lines/longshots before scaling stake.`);
  if (bullets.length === 0) bullets.push('Keep this construction pattern; no major concentration or fragility misses in deterministic review.');
  return bullets.slice(0, 3);
};

export function ControlPageClient() {
  const search = useSearchParams();
  const initialTab = search.get('tab') === 'review' ? 'review' : 'live';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { slip } = useDraftSlip();
  const [outcome, setOutcome] = useState<'win' | 'loss' | 'push'>('loss');
  const [postmortem, setPostmortem] = useState<PostMortemResult | null>(null);
  const [retroDto, setRetroDto] = useState<ResearchRunDTO | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [latestTrace, setLatestTrace] = useState<string | null>(null);

  const riskDelta = useMemo(() => {
    if (slip.length === 0) return 0;
    const avg = slip.reduce((sum, leg) => sum + (leg.confidence ?? 0.58), 0) / slip.length;
    return Math.round((avg - 0.6) * 100);
  }, [slip]);

  const reviewIntelLegs = retroDto?.legs.map((leg) => ({
    id: leg.id,
    player: leg.player,
    selection: leg.selection,
    market: leg.market,
    line: leg.line,
    odds: leg.odds,
    team: leg.team
  })) ?? [];

  const runReview = useCallback(async (file?: File) => {
    const slipText = mockParseSlip(file?.name ?? 'upload.png');
    const traceId = await runSlip(slipText);
    const run = await runStore.getRun(traceId);
    if (!run) return;

    const dto = toResearchRunDTOFromRun(run);
    setRetroDto(dto);
    setUploadName(file?.name ?? 'upload.png');

    const response = await fetch('/api/postmortem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legs: dto.legs, outcome })
    });
    const payload = await response.json() as PostMortemResult;
    setPostmortem(payload);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rb:last-postmortem', JSON.stringify({ uploadName: file?.name, dto, payload }));
    }
  }, [outcome]);

  useEffect(() => {
    void runStore.listRuns(1).then((runs) => setLatestTrace(runs[0]?.traceId ?? null));
  }, []);

  useEffect(() => {
    if (search.get('sample') === '1' && tab === 'review' && !retroDto) {
      void runReview();
    }
  }, [retroDto, runReview, search, tab]);

  return (
    <section className="mx-auto max-w-6xl space-y-3">
      <header>
        <h1 className="text-3xl font-semibold">Control Room</h1>
        <p className="text-sm text-slate-400">Manage active risk live, then review settled slips to sharpen your process.</p>
      </header>

      <div className="flex gap-2 rounded-xl bg-slate-900/70 p-1 w-fit">
        <button type="button" onClick={() => setTab('live')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'live' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Live</button>
        <button type="button" onClick={() => setTab('review')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'review' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Review</button>
      </div>

      {tab === 'live' ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Control Room: Live</h2>
          <SlipIntelBar legs={slip} />
          {slip.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/20 p-4 text-sm text-slate-300 space-y-3">
              <p>No active slip found yet. Pick a path below to get a live run in motion.</p>
              <div className="flex flex-wrap gap-2">
                {latestTrace ? (
                  <Link href={`/stress-test?trace=${encodeURIComponent(latestTrace)}`} className="rounded bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950">Open latest run</Link>
                ) : null}
                <Link href="/stress-test?demo=1" className="rounded border border-white/20 px-3 py-2 text-sm">Try sample slip</Link>
                <Link href="/slip" className="rounded border border-white/20 px-3 py-2 text-sm">Build from Board</Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-300">Pregame → live confidence delta: <span className={riskDelta >= 0 ? 'text-emerald-300' : 'text-amber-300'}>{riskDelta >= 0 ? '+' : ''}{riskDelta}%</span></p>
              <ul className="space-y-2 text-sm">
                {slip.map((leg) => (
                  <li key={leg.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
                    <p className="font-medium">{leg.player} {leg.marketType} {leg.line} {leg.odds ?? ''}</p>
                    <p className="text-xs text-slate-400">Game status: Monitoring • Risk shift: {riskDelta >= 0 ? 'stable/up' : 'watchlist'} • Hedge: {riskDelta < -5 ? 'consider' : 'not needed'}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {tab === 'review' ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Review</h2>
          <p className="text-sm text-slate-300">Upload a FanDuel screenshot for mock OCR parsing and deterministic postmortem classification.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void runReview(file);
            }} className="text-sm" />
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as 'win' | 'loss' | 'push')} className="rounded border border-white/20 bg-slate-950 px-2 py-1 text-sm">
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="push">Push</option>
            </select>
            <button type="button" onClick={() => void runReview()} className="rounded bg-cyan-400 px-3 py-1.5 text-sm font-medium text-slate-950">Run sample review</button>
          </div>

          {retroDto ? (
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm space-y-2">
              <SlipIntelBar legs={reviewIntelLegs} />
              <p className="font-medium">Parsed slip ({uploadName || 'sample'}): {retroDto.legs.length} legs</p>
              <p>What failed: <span className="text-cyan-300">{postmortem?.classification.process ?? 'Running…'}</span></p>
              <p>Weakest leg: {retroDto.verdict.weakest_leg_id ?? 'n/a'}</p>
              <p>Risk flags missed: {postmortem ? postmortem.notes.join(' • ') : 'Running…'}</p>
              {postmortem ? (
                <div>
                  <p className="font-medium mt-2">What to change next time</p>
                  <ul className="mt-1 list-disc pl-5 text-slate-300">
                    {buildNextTimeAdjustments(postmortem).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
