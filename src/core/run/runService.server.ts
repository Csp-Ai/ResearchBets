import 'server-only';

import type { Spine } from '@/src/core/nervous/spine';
import { emitRunEvents } from '@/src/core/events/eventEmitter.server';

type RunLeg = {
  player: string;
  market: string;
  line: string;
  odds: string;
  game_id: string;
};

const impliedProbability = (odds: string) => {
  const parsed = Number(odds.replace('+', '').trim());
  if (!Number.isFinite(parsed) || parsed === 0) return 0.5;
  if (parsed > 0) return 100 / (parsed + 100);
  return Math.abs(parsed) / (Math.abs(parsed) + 100);
};

export async function runStressTest(input: { trace_id: string; spine: Spine; legs: RunLeg[] }) {
  const weakest = input.legs
    .map((leg) => ({ ...leg, implied: impliedProbability(leg.odds) }))
    .sort((a, b) => b.implied - a.implied)[0];

  const reasons = [
    `Weakest leg by implied hit pressure: ${weakest?.player ?? 'n/a'} ${weakest?.market ?? ''}`.trim(),
    `Run evaluated ${input.legs.length} legs with deterministic odds heuristic.`
  ];

  const analysis = {
    weakest_leg: weakest ? { player: weakest.player, market: weakest.market, odds: weakest.odds, game_id: weakest.game_id } : null,
    correlation_pressure: Number((input.legs.length / 6).toFixed(2)),
    fragility_score: Number((Math.min(1, (weakest?.implied ?? 0.5)) * 100).toFixed(1)),
    reasons,
    market_deviation: { method: 'implied_probability', baseline: 0.5 }
  };

  const written = await emitRunEvents({
    trace_id: input.trace_id,
    spine: input.spine,
    events: [
      { type: 'run_created', payload: { legs: input.legs.length } },
      { type: 'stage_analyze_started' },
      { type: 'analysis_ready', payload: analysis },
      { type: 'stage_analyze_complete' }
    ]
  });

  return { analysis, events_written: written > 0 };
}
