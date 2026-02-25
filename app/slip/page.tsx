'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { GamesToday, type TodayGame } from '@/features/dashboard/GamesToday';
import { PlayerPropHeatmap, type PlayerWithPropStats } from '@/features/props/PlayerPropHeatmap';
import { SlipBuilder } from '@/features/betslip/SlipBuilder';
import { SCOUT_ANALYZE_PREFILL_STORAGE_KEY, serializeDraftSlip } from '@/src/core/slips/serializeDraftSlip';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';

const TODAY_GAMES: TodayGame[] = [
  {
    id: 'nba-1',
    league: 'NBA',
    matchup: 'LAL @ DAL',
    teams: [
      { team: 'LAL', players: [
        { id: 'lbj', name: 'LeBron James', injuryStatus: 'Probable', matchupNotes: 'Pace-up spot vs DAL wings', props: [{ market: 'points', line: '25.5', odds: '-115' }, { market: 'assists', line: '7.5' }] },
        { id: 'ad', name: 'Anthony Davis', injuryStatus: 'Questionable', matchupNotes: 'Strong paint edge', props: [{ market: 'points', line: '24.5' }, { market: 'rebounds', line: '11.5' }] }
      ] },
      { team: 'DAL', players: [
        { id: 'luka', name: 'Luka Doncic', injuryStatus: 'Active', matchupNotes: 'High-usage', props: [{ market: 'points', line: '31.5' }, { market: 'assists', line: '9.5' }] },
        { id: 'kai', name: 'Kyrie Irving', injuryStatus: 'Active', matchupNotes: 'Scoring variance', props: [{ market: 'points', line: '25.5' }, { market: 'threes', line: '3.5' }] }
      ] }
    ]
  }
];

const HEATMAP_PLAYERS: PlayerWithPropStats[] = [
  { id: 'luka', player: 'Luka Doncic', team: 'DAL', confidence: 0.76, propStats: [
    { marketType: 'points', last5HitRate: 0.8, seasonHitRate: 0.66, trend: 'up' },
    { marketType: 'assists', last5HitRate: 0.8, seasonHitRate: 0.64, trend: 'up' }
  ] }
];

export default function SlipPage() {
  const { slip, addLeg, removeLeg, clearSlip } = useDraftSlip();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const router = useRouter();
  const dedupedLegs = useMemo(() => Array.from(new Map(slip.map((leg) => [leg.id, leg])).values()), [slip]);

  const onAnalyzeSlip = () => {
    if (dedupedLegs.length === 0 || typeof window === 'undefined') return;
    const prefillText = serializeDraftSlip(dedupedLegs);
    if (!prefillText) return;
    window.sessionStorage.setItem(SCOUT_ANALYZE_PREFILL_STORAGE_KEY, prefillText);
    router.push(`/stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY)}`);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Slip</h1>
        <p className="text-sm text-slate-400">Build your active slip, then run a full stress test before placing.</p>
      </header>

      <SlipIntelBar legs={dedupedLegs} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <GamesToday games={TODAY_GAMES} onAddLeg={addLeg} />
          <button type="button" className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium" onClick={() => setShowHeatmap((value) => !value)}>
            {showHeatmap ? 'Hide heatmap view' : 'Show heatmap view'}
          </button>
          {showHeatmap ? <PlayerPropHeatmap players={HEATMAP_PLAYERS} /> : null}
        </div>
        <div className="xl:sticky xl:top-4 xl:h-fit space-y-3">
          <SlipBuilder legs={dedupedLegs} onLegsChange={(nextLegs) => {
            const nextIds = new Set(nextLegs.map((leg) => leg.id));
            if (nextLegs.length === 0) { clearSlip(); return; }
            dedupedLegs.filter((leg) => !nextIds.has(leg.id)).forEach((leg) => removeLeg(leg.id));
          }} />
          <button
            type="button"
            className="w-full rounded-xl border border-cyan-500/50 px-3 py-2 text-sm font-medium text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onAnalyzeSlip}
            disabled={dedupedLegs.length === 0}
          >
            Stress Test ({dedupedLegs.length})
          </button>
        </div>
      </div>
    </section>
  );
}
