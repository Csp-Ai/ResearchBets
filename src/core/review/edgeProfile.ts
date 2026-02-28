import type { PostmortemRecord } from '@/src/core/review/types';

export type EdgeProfile = {
  totalTickets: number;
  winRate: number;
  avgLegCount: number;
  topMissTags: Array<{ tag: string; count: number; rate: number }>;
  killerStatTypes: Array<{ statType: string; count: number }>;
  nearMissRate: number;
  highFragilityShare: number;
  coverageGapShare: number;
};

const round = (value: number) => Number(value.toFixed(3));

export function buildEdgeProfile(postmortems: PostmortemRecord[]): EdgeProfile {
  const totalTickets = postmortems.length;
  if (totalTickets === 0) {
    return { totalTickets: 0, winRate: 0, avgLegCount: 0, topMissTags: [], killerStatTypes: [], nearMissRate: 0, highFragilityShare: 0, coverageGapShare: 0 };
  }

  const wins = postmortems.filter((item) => item.status === 'won').length;
  const allLegs = postmortems.flatMap((item) => item.legs);
  const missedLegs = allLegs.filter((leg) => !leg.hit);

  const missTagCounts = new Map<string, number>();
  for (const leg of missedLegs) {
    for (const tag of leg.missTags) {
      missTagCounts.set(tag, (missTagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topMissTags = [...missTagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count, rate: round(count / Math.max(1, missedLegs.length)) }));

  const statCounts = new Map<string, number>();
  for (const leg of missedLegs) {
    statCounts.set(leg.statType, (statCounts.get(leg.statType) ?? 0) + 1);
  }

  const killerStatTypes = [...statCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([statType, count]) => ({ statType, count }));
  const nearMissCount = postmortems.filter((item) => item.status === 'lost' && item.legs.some((leg) => leg.missTags.includes('bust_by_one'))).length;
  const highFragilityLegs = postmortems.reduce((count, item) => count + item.legs.filter((leg) => item.fragility.score >= 65 || leg.missTags.includes('assist_variance')).length, 0);
  const coverageGapLegs = missedLegs.filter((leg) => leg.missTags.includes('coverage_gap')).length;

  return {
    totalTickets,
    winRate: round(wins / totalTickets),
    avgLegCount: round(allLegs.length / totalTickets),
    topMissTags,
    killerStatTypes,
    nearMissRate: round(nearMissCount / totalTickets),
    highFragilityShare: round(highFragilityLegs / Math.max(1, allLegs.length)),
    coverageGapShare: round(coverageGapLegs / Math.max(1, missedLegs.length))
  };
}
