'use client';

import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

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
    topGames: Array<{ game: string; count: number }>;
    topPlayers: Array<{ player: string; count: number }>;
  };
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

export function ReviewPanel({
  retroDto,
  uploadName,
  postmortem
}: {
  retroDto: ResearchRunDTO | null;
  uploadName: string;
  postmortem: PostMortemResult | null;
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

  return (
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
  );
}
