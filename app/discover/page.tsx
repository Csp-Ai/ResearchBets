'use client';

import { useMemo, useState } from 'react';

import { GamesToday, type TodayGame } from '@/features/dashboard/GamesToday';
import { PlayerPropHeatmap, type PlayerWithPropStats } from '@/features/props/PlayerPropHeatmap';
import { SlipBuilder, type SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

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

export default function DiscoverPage() {
  const [draftLegs, setDraftLegs] = useState<SlipBuilderLeg[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const dedupedLegs = useMemo(() => Array.from(new Map(draftLegs.map((leg) => [leg.id, leg])).values()), [draftLegs]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Build Slip</h1>
        <p className="text-sm text-slate-400">Start your slip, then move to Analyze for a final verdict.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <GamesToday games={TODAY_GAMES} onAddLeg={(leg) => setDraftLegs((current) => [...current, leg])} />
          <button type="button" className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium" onClick={() => setShowHeatmap((value) => !value)}>
            {showHeatmap ? 'Hide heatmap view' : 'Show heatmap view'}
          </button>
          {showHeatmap ? <PlayerPropHeatmap players={HEATMAP_PLAYERS} /> : null}
        </div>
        <div className="xl:sticky xl:top-4 xl:h-fit">
          <SlipBuilder legs={dedupedLegs} onLegsChange={setDraftLegs} />
        </div>
      </div>
    </section>
  );
}
