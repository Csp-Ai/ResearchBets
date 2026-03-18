'use client';

import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';
import { rankReasons, selectTopReasons } from '@/src/core/slips/reasonRanker';
import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

import type { ReviewPostMortemResult } from '@/src/core/control/reviewIngestion';

const buildNextTimeAdjustments = (postmortem: ReviewPostMortemResult): string[] => {
  const topGame = postmortem.exposureSummary.topGames[0];
  const bullets: string[] = [];
  if (topGame && topGame.count >= 4) bullets.push(`${topGame.count}-leg concentration in ${topGame.game}: split across 2+ games or hedge live after first quarter.`);
  if (postmortem.correlationScore >= 65) bullets.push('Correlation ran hot: trim duplicate player dependencies to lower one-script failure risk.');
  if (postmortem.volatilityTier === 'High' || postmortem.volatilityTier === 'Extreme') bullets.push(`Volatility was ${postmortem.volatilityTier}: reduce alt lines/longshots before scaling stake.`);
  if (bullets.length === 0) bullets.push('Keep this construction pattern; no major concentration or fragility misses in deterministic review.');
  return bullets.slice(0, 3);
};

export function ReviewPanel({
  retroDto,
  uploadName,
  postmortem,
  reviewMode,
  shareStatus,
  onShare
}: {
  retroDto: ResearchRunDTO | null;
  uploadName: string;
  reviewMode: 'live' | 'demo' | null;
  postmortem: ReviewPostMortemResult | null;
  shareStatus: 'idle' | 'done' | 'error';
  onShare: () => void;
}) {
  const reviewIntelLegs = retroDto?.legs.map((leg) => ({
    id: leg.id,
    player: leg.player,
    selection: leg.selection,
    market: leg.market,
    line: leg.line,
    odds: leg.odds,
    team: leg.team
  })) ?? [];

  if (!retroDto) return null;

  const postmortemReasons = selectTopReasons(rankReasons(retroDto.verdict.reasons, {
    correlation: retroDto.verdict.correlation_flag,
    volatility: retroDto.verdict.volatility_summary
  }), 3);
  const weakestLegLabel = retroDto.legs.find((leg) => leg.id === retroDto.verdict.weakest_leg_id)?.selection
    ?? retroDto.legs.find((leg) => leg.id === retroDto.verdict.weakest_leg_id)?.player
    ?? 'Unknown leg';

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm space-y-2">
      <SlipIntelBar legs={reviewIntelLegs} />
      <p className="font-medium">{reviewMode === 'demo' ? 'Demo sample review' : 'Parsed review input'} ({uploadName || 'sample'}): {retroDto.legs.length} legs</p>
      <p className="text-xs text-slate-400">{reviewMode === 'demo' ? 'This result came from the explicit demo/sample fallback.' : 'This result came from the real review ingestion path (uploaded/pasted input → parse/extract → postmortem).'} Continuity trace_id: {retroDto.trace_id ?? 'unknown'}{retroDto.slip_id ? ` · slip_id: ${retroDto.slip_id}` : ''}</p>
      <p>What happened: <span className="text-cyan-300">{postmortem?.classification.process ?? 'Running…'}</span></p>
      <p>Verdict: {presentRecommendation(retroDto.verdict.decision)} · Fragility {retroDto.verdict.fragility_score}/100 · Correlation {retroDto.verdict.correlation_flag ? 'High' : 'Managed'}</p>
      <p>Weakest leg: {weakestLegLabel}</p>
      <p>Volatility: {retroDto.verdict.volatility_summary}</p>
      <p>Risk flags missed: {postmortem ? postmortem.notes.join(' • ') : 'Running…'}</p>
      <ul className="list-disc pl-5 text-slate-300">
        {postmortemReasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onShare} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5">
          {shareStatus === 'done' ? 'Shared run' : shareStatus === 'error' ? 'Share unavailable' : 'Share'}
        </button>
      </div>
      {postmortem ? (
        <div>
          <p className="font-medium mt-2">What to change next time</p>
          <ul className="mt-1 list-disc pl-5 text-slate-300">
            {buildNextTimeAdjustments(postmortem).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
