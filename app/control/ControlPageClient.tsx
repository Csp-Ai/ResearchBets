'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { TruthSpineHeader } from '@/src/components/ui/TruthSpineHeader';
import { AliveEmptyState } from '@/src/components/ui/AliveEmptyState';

const ReviewPanel = dynamic(() => import('./ReviewPanel').then((m) => m.ReviewPanel), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">Loading review panel…</div>
});

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


export function ControlPageClient() {
  const search = useSearchParams();
  const initialTab = search.get('tab') === 'review' ? 'review' : 'live';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { slip } = useDraftSlip();
  const nervous = useNervousSystem();
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


  const runReview = useCallback(async (file?: File) => {
    const slipText = mockParseSlip(file?.name ?? 'upload.png');
    const [{ runSlip }, { runStore }, { toResearchRunDTOFromRun }] = await Promise.all([
      import('@/src/core/pipeline/runSlip'),
      import('@/src/core/run/store'),
      import('@/src/core/run/researchRunDTO')
    ]);
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
    void import('@/src/core/run/store').then(({ runStore }) => runStore.listRuns(1)).then((runs) => setLatestTrace(runs[0]?.traceId ?? null));
  }, []);

  useEffect(() => {
    if (search.get('sample') === '1' && tab === 'review' && !retroDto) {
      void runReview();
    }
  }, [retroDto, runReview, search, tab]);

  return (
    <section className="mx-auto max-w-6xl space-y-3">
      <TruthSpineHeader
        title="Control Room"
        subtitle="After loop: track live posture, review outcomes, and feed back process fixes."
        actions={[
          { label: 'Open latest run', href: latestTrace ? appendQuery(nervous.toHref('/stress-test'), { trace: latestTrace }) : nervous.toHref('/stress-test'), tone: 'primary' },
          { label: 'Build from Board', href: nervous.toHref('/today') },
          { label: 'Run sample slip', href: appendQuery(nervous.toHref('/stress-test'), { demo: '1' }) }
        ]}
      />

      <div className="flex gap-2 rounded-xl bg-slate-900/70 p-1 w-fit">
        <button type="button" onClick={() => setTab('live')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'live' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Live</button>
        <button type="button" onClick={() => setTab('review')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'review' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Review</button>
      </div>

      {tab === 'live' ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Control Room: Live</h2>
          <SlipIntelBar legs={slip} />
          {slip.length === 0 ? (
            <>
              <AliveEmptyState
                title="No active run yet"
                message="Open latest run, run a deterministic sample, or build from Board to start live tracking."
                actions={<>
                  {latestTrace ? <Link href={appendQuery(nervous.toHref('/stress-test'), { trace: latestTrace })} className="rounded bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950">Open latest run</Link> : null}
                  <Link href={appendQuery(nervous.toHref('/stress-test'), { demo: '1' })} className="rounded border border-white/20 px-3 py-2 text-sm">Run sample slip</Link>
                  <Link href={nervous.toHref('/today')} className="rounded border border-white/20 px-3 py-2 text-sm">Build from Board</Link>
                </>}
              />
              <section className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                <h3 className="text-sm font-semibold text-slate-100">Run timeline</h3>
                <p className="mt-1 text-xs text-slate-400">Demo sample: Scout submitted → legs extracted → weakest-leg note recorded.</p>
              </section>
            </>
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
          <p className="text-sm text-slate-300">Upload a FanDuel screenshot for demo OCR parsing and deterministic postmortem classification.</p>
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

          <ReviewPanel retroDto={retroDto} uploadName={uploadName} postmortem={postmortem} />
          {postmortem ? (
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs">Postmortem card preview ready.</div>
              <button type="button" className="rounded-lg border border-white/20 bg-slate-950/50 p-3 text-xs text-left">Rebuild without weakest legs</button>
              <button type="button" className="rounded-lg border border-white/20 bg-slate-950/50 p-3 text-xs text-left">Log journal note</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
