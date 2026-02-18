import Link from 'next/link';

import SnapshotReplayView from '@/features/snapshot/SnapshotReplayView';
import type { ResearchReport } from '@/src/core/evidence/evidenceSchema';
import { asMarketType } from '@/src/core/markets/marketType';
import { getParlayCorrelationScore, summarizeParlayRisk } from '@/src/core/parlay/parlayRisk';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { buildPropLegInsight } from '@/src/core/slips/propInsights';

import type { ExtractedLeg } from '@/src/core/slips/extract';
import type { PropLegInsight } from '@/src/core/slips/propInsights';

type SnapshotPayload = ResearchReport & {
  leg_insights?: PropLegInsight[];
  recommendations?: Array<{ id?: string; summary?: string; confidence?: number }>;
  legs?: Array<ExtractedLeg & { team?: string; gameId?: string; trendSeries?: number[]; injuryImpact?: string }>;
};

const parseLegFromClaim = (claimText: string): ExtractedLeg => {
  const [selectionPart, marketPart] = claimText.split(':');
  const selection = (selectionPart ?? claimText).replace('Evidence-backed signal from', '').trim();
  const marketCandidate = marketPart?.toLowerCase().includes('3pm')
    ? 'threes'
    : marketPart?.toLowerCase().includes('assist')
      ? 'assists'
      : marketPart?.toLowerCase().includes('rebound')
        ? 'rebounds'
        : 'points';

  return {
    selection: selection || 'Unknown leg',
    market: asMarketType(marketCandidate, 'points'),
  };
};

async function getSnapshot(snapshotId: string): Promise<SnapshotPayload | null> {
  return (await getRuntimeStore().getSnapshot(snapshotId)) as SnapshotPayload | null;
}

export default async function SnapshotReplayPage({
  params,
  searchParams,
}: {
  params: { snapshotId: string };
  searchParams: { replay?: string };
}) {
  const snapshot = await getSnapshot(params.snapshotId);
  if (!snapshot) {
    return (
      <section className="rounded-xl border border-rose-500/30 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold text-rose-200">Snapshot not found</h1>
        <p className="mt-2 text-sm text-slate-300">We could not load this replay snapshot.</p>
      </section>
    );
  }

  const legs =
    snapshot.legs ??
    snapshot.claims.slice(0, 4).map((claim, index) => ({
      ...parseLegFromClaim(claim.text),
      team: index % 2 === 0 ? 'BOS' : 'LAL',
      gameId: snapshot.subject,
    }));

  const legInsights = snapshot.leg_insights ?? legs.map((leg) => buildPropLegInsight(leg));
  const replayEnabled = searchParams.replay === '1';
  const parlaySummary = summarizeParlayRisk(legs);
  const parlayCorrelation = getParlayCorrelationScore(legs);

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs uppercase tracking-wide text-cyan-300">Research Snapshot</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-100">{snapshot.subject}</h1>
        <p className="mt-2 text-sm text-slate-400">{snapshot.summary}</p>
        <p className="mt-3 text-xs text-slate-400">
          Created {new Date(snapshot.createdAt).toLocaleString()} · Trace {snapshot.traceId}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">{parlaySummary}</span>
          <span className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-xs text-violet-200">
            Correlation {parlayCorrelation.strength} ({parlayCorrelation.score})
          </span>
          {snapshot.recommendations?.length ? (
            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
              {snapshot.recommendations.length} recommendations
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <Link href={`/research?trace_id=${snapshot.traceId}&snapshotId=${snapshot.reportId}${replayEnabled ? '&replay=1' : ''}`} className="text-sm text-cyan-300 underline">
            Open research workspace
          </Link>
        </div>
      </header>

      <SnapshotReplayView
        legs={legs}
        legInsights={legInsights}
        snapshotId={snapshot.reportId}
        traceId={snapshot.traceId}
        replayEnabled={replayEnabled}
      />
    </section>
  );
}
