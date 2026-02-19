'use client';

import { useEffect, useMemo, useState } from 'react';

import { GamesToday, type TodayGame } from '@/features/dashboard/GamesToday';
import { SlipBuilder, type SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { PlayerPropHeatmap, type PlayerWithPropStats } from '@/features/props/PlayerPropHeatmap';

const TODAY_GAMES: TodayGame[] = [
  {
    id: 'nba-1',
    league: 'NBA',
    matchup: 'LAL @ DAL',
    teams: [
      {
        team: 'LAL',
        players: [
          { id: 'lbj', name: 'LeBron James', injuryStatus: 'Probable', matchupNotes: 'Pace-up spot vs DAL wings', props: [{ market: 'points', line: '25.5', odds: '-115' }, { market: 'assists', line: '7.5' }, { market: 'rebounds', line: '8.5' }] },
          { id: 'ad', name: 'Anthony Davis', injuryStatus: 'Questionable', matchupNotes: 'Strong paint edge, foul volatility', props: [{ market: 'points', line: '24.5' }, { market: 'rebounds', line: '11.5' }, { market: 'pra', line: '40.5' }] },
          { id: 'dlo', name: 'D. Russell', injuryStatus: 'Active', matchupNotes: '3PT volume elevated in last 5', props: [{ market: 'threes', line: '2.5' }, { market: 'points', line: '16.5' }, { market: 'assists', line: '5.5' }] },
        ],
      },
      {
        team: 'DAL',
        players: [
          { id: 'luka', name: 'Luka Doncic', injuryStatus: 'Active', matchupNotes: 'High-usage, assists ceiling game', props: [{ market: 'points', line: '31.5' }, { market: 'assists', line: '9.5' }, { market: 'pra', line: '51.5' }] },
          { id: 'kai', name: 'Kyrie Irving', injuryStatus: 'Active', matchupNotes: 'Guard-heavy matchup, scoring variance', props: [{ market: 'points', line: '25.5' }, { market: 'threes', line: '3.5' }, { market: 'assists', line: '5.5' }] },
          { id: 'gaff', name: 'Daniel Gafford', injuryStatus: 'Active', matchupNotes: 'Rebound chances spike vs LAL size', props: [{ market: 'rebounds', line: '8.5' }, { market: 'points', line: '12.5' }, { market: 'ra', line: '10.5' }] },
        ],
      },
    ],
  },
];

const HEATMAP_PLAYERS: PlayerWithPropStats[] = [
  { id: 'luka', player: 'Luka Doncic', team: 'DAL', confidence: 0.76, propStats: [
    { marketType: 'points', last5HitRate: 0.8, seasonHitRate: 0.66, trend: 'up' },
    { marketType: 'threes', last5HitRate: 0.6, seasonHitRate: 0.55, trend: 'flat' },
    { marketType: 'rebounds', last5HitRate: 0.4, seasonHitRate: 0.52, trend: 'down' },
    { marketType: 'assists', last5HitRate: 0.8, seasonHitRate: 0.64, trend: 'up' },
    { marketType: 'pra', last5HitRate: 0.6, seasonHitRate: 0.61, trend: 'flat' },
  ] },
  { id: 'lbj', player: 'LeBron James', team: 'LAL', confidence: 0.69, propStats: [
    { marketType: 'points', last5HitRate: 0.6, seasonHitRate: 0.59, trend: 'flat' },
    { marketType: 'threes', last5HitRate: 0.4, seasonHitRate: 0.47, trend: 'down' },
    { marketType: 'rebounds', last5HitRate: 0.8, seasonHitRate: 0.62, trend: 'up' },
    { marketType: 'assists', last5HitRate: 0.6, seasonHitRate: 0.6, trend: 'up' },
    { marketType: 'pra', last5HitRate: 0.4, seasonHitRate: 0.57, trend: 'down' },
  ] },
];

export default function DashboardPage() {
  const [draftLegs, setDraftLegs] = useState<SlipBuilderLeg[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const dedupedLegs = useMemo(() => Array.from(new Map(draftLegs.map((leg) => [leg.id, leg])).values()), [draftLegs]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingBoard(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Discover → Draft</h1>
        <p className="mt-1 text-sm text-slate-400">Find props, inspect confidence heat, then add legs to your slip.</p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
        <h2 className="font-semibold text-slate-100">Game / Market Context</h2>
        <p className="mt-1 text-xs text-slate-400">Dataset: Demo board · Filter: NBA props · Date: Today</p>
        <p className="mt-2 text-xs text-slate-300">State: {loadingBoard ? 'Loading context…' : TODAY_GAMES.length === 0 ? 'No games available' : `Loaded ${TODAY_GAMES.length} game(s)`}</p>
      </section>

      {loadingBoard ? <div className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-800/70" /> : <GamesToday games={TODAY_GAMES} onAddLeg={(leg) => setDraftLegs((current) => [...current, leg])} />}
      <PlayerPropHeatmap players={HEATMAP_PLAYERS} loading={loadingBoard} />
      <SlipBuilder legs={dedupedLegs} onLegsChange={setDraftLegs} />
    </section>
  );
}
