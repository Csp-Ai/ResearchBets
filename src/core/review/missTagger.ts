import type { MarketType } from '@/src/core/markets/marketType';

export type CoverageLevel = 'full' | 'partial' | 'none';

export type MissTagInput = {
  statType: MarketType;
  target: number;
  finalValue: number;
  delta: number;
  fragilityScore: number;
  fragilityChips: string[];
  minutesCompressionRisk: boolean;
  endgameSensitivity: number;
  ladder: boolean;
  coverage: CoverageLevel;
};

export type MissTagResult = {
  missTags: string[];
  missNarrative: string;
  lessonHint: string;
};

const isSmallMiss = (delta: number) => delta <= -1 && delta >= -1.5;

export function tagMiss(input: MissTagInput): MissTagResult {
  const missTags: string[] = [];

  if (isSmallMiss(input.delta)) missTags.push('bust_by_one');
  if (input.statType === 'assists' && (input.fragilityScore >= 65 || input.fragilityChips.includes('High-variance market'))) {
    missTags.push('assist_variance');
  }
  if (input.ladder && input.delta >= -2) missTags.push('ladder_distance');
  if (input.minutesCompressionRisk) missTags.push('minutes_compression');
  if (input.coverage !== 'full') missTags.push('coverage_gap');
  if (input.endgameSensitivity >= 70 && input.delta >= -2) missTags.push('endgame_noise');

  const limitedTags = missTags.slice(0, 3);
  const primary = limitedTags[0] ?? 'variance';
  const missNarrative = `Missed ${input.statType} by ${Math.abs(input.delta).toFixed(1)}; primary signal: ${primary.replace('_', ' ')}.`;

  const lessonHint = limitedTags.includes('bust_by_one')
    ? 'Consider a half-step lower line for similar spots.'
    : limitedTags.includes('minutes_compression')
      ? 'Prefer stable rotation paths before locking this market.'
      : limitedTags.includes('coverage_gap')
        ? 'Confirm live coverage before using this leg in bigger ladders.'
        : limitedTags.includes('assist_variance')
          ? 'Pair assists with steadier usage signals to reduce swing.'
          : 'Keep this leg in the pool, but lower concentration next cycle.';

  return { missTags: limitedTags, missNarrative, lessonHint };
}
