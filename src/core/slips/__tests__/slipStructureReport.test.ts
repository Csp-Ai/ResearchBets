import { describe, expect, it } from 'vitest';

import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

describe('buildSlipStructureReport', () => {
  it('builds canonical report with deterministic legs and forecast', () => {
    const report = buildSlipStructureReport(
      [
        {
          selection: 'Luka Doncic over 31.5 points',
          player: 'Luka Doncic',
          game: 'LAL @ DAL',
          odds: '+160',
          line: '31.5',
          market: 'points'
        },
        {
          selection: 'Luka Doncic over 8.5 assists',
          player: 'Luka Doncic',
          game: 'LAL @ DAL',
          odds: '+120',
          line: '8.5',
          market: 'assists'
        },
        {
          selection: 'LeBron James over 7.5 assists',
          player: 'LeBron James',
          game: 'LAL @ DAL',
          odds: '-110',
          line: '7.5',
          market: 'assists'
        }
      ],
      { mode: 'cache', reason: 'fallback data', trace_id: 'trace-1', slip_id: 'slip-1' }
    );

    expect(report.mode).toBe('cache');
    expect(report.reason).toBe('fallback data');
    expect(report.legs.length).toBe(3);
    expect(report.legs.every((leg) => Boolean(leg.leg_id))).toBe(true);
    expect(report.weakest_leg_id).toBeTruthy();
    expect(report.failure_forecast.top_reasons.length).toBeGreaterThan(0);
    expect(Array.isArray(report.correlation_edges)).toBe(true);
  });

  it('keeps duplicate-player flags consistent when player falls back to selection identity', () => {
    const report = buildSlipStructureReport([
      {
        selection: 'Jayson Tatum over 29.5 points',
        game: 'BOS @ NYK',
        odds: '-110',
        line: '29.5',
        market: 'points'
      },
      {
        selection: 'Jayson Tatum over 29.5 points',
        game: 'BOS @ NYK',
        odds: '-105',
        line: '29.5',
        market: 'points'
      }
    ]);

    expect(report.reasons).toContain('Multiple legs rely on repeated player outcomes.');
    expect(report.legs.every((leg) => leg.flags?.includes('same_player_dependency'))).toBe(true);
    expect(report.legs.every((leg) => (leg.fragility_score ?? 0) >= 50)).toBe(true);
  });

  it('clusters opposing teams when a shared matchup-derived game key is available', () => {
    const report = buildSlipStructureReport([
      {
        selection: 'Jalen Brunson over 7.5 assists',
        team: 'NYK',
        matchup: 'NYK @ BOS',
        odds: '-110',
        line: '7.5',
        market: 'assists'
      },
      {
        selection: 'Jayson Tatum over 29.5 points',
        team: 'BOS',
        matchup: 'NYK @ BOS',
        odds: '-115',
        line: '29.5',
        market: 'points'
      }
    ]);

    expect(report.correlation_edges.some((edge) => edge.kind === 'same_game')).toBe(true);
    expect(report.script_clusters[0]?.leg_ids).toHaveLength(2);
    expect(new Set(report.legs.map((leg) => leg.game_id)).size).toBe(1);
    expect(report.legs[0]?.game_id).toContain('matchup:NYK @ BOS');
  });
  it('never invents same-game links for unrelated legs with unknown matchups', () => {
    const report = buildSlipStructureReport([
      { selection: 'Justin Jefferson over 4 receptions', player: 'Justin Jefferson', market: 'receptions', line: '4', odds: '-180' },
      { selection: 'Jayson Tatum over 2 threes', player: 'Jayson Tatum', market: 'threes', line: '2', odds: '-115' },
      { selection: 'Jordan Mason over 60 rushing yards', player: 'Jordan Mason', market: 'rushing_yards', line: '60', odds: '-115' },
    ]);
    expect(report.correlation_edges).toHaveLength(0);
    expect(report.script_clusters).toHaveLength(0);
    expect(report.legs.every((leg) => !leg.flags?.includes('same_game_script'))).toBe(true);
    expect(report.reasons.some((reason) => reason.includes('Matchup unknown'))).toBe(true);
  });

  it('never labels a structurally correlated ticket as inflated thresholds without player-level evidence', () => {
    const report = buildSlipStructureReport([
      { player: 'Player One', game: 'PHI @ JAX', market: 'rushing_yards', line: '60', odds: '-110' },
      { player: 'Player One', game: 'PHI @ JAX', market: 'receiving_yards', line: '20', odds: '-110' },
      { player: 'Player Three', game: 'PHI @ JAX', market: 'receiving_yards', line: '20', odds: '-110' },
      { player: 'Player Four', game: 'PHI @ JAX', market: 'passing_yards', line: '175', odds: '-110' },
    ]);
    expect(report.correlation_edges.length).toBeGreaterThan(0);
    expect(report.weakest_leg_identity?.supporting_drivers).toContain('correlated_stack_pressure');
    expect(report.weakest_leg_identity?.supporting_drivers).not.toContain('inflated_thresholds');
    expect(report.lifecycle_driver_lineage?.pregame?.supporting_drivers).not.toContain('inflated_thresholds');
  });

  it('does not infer aggressive thresholds from integer or large-number syntax', () => {
    const report = buildSlipStructureReport([
      { player: 'Justin Jefferson', game: 'MIN @ GB', market: 'receptions', line: '4', odds: '-150' },
      { player: 'Jayson Tatum', game: 'BOS @ NYK', market: 'threes', line: '2', odds: '-115' },
      { player: 'Jordan Mason', game: 'SF @ LAR', market: 'rushing_yards', line: '30', odds: '-180' },
      { player: 'Receiver Four', game: 'CLE @ BAL', market: 'receiving_yards', line: '60', odds: '-110' },
      { player: 'Receiver Five', game: 'DAL @ PHI', market: 'receiving_yards', line: '100', odds: '+180' },
      { player: 'Quarterback Six', game: 'ARI @ SEA', market: 'passing_yards', line: '200', odds: '-110' },
      { player: 'Scorer Seven', game: 'ATL @ NO', market: 'points', line: '24.5', odds: '-110' },
    ]);
    expect(report.legs.every((leg) => !leg.flags?.includes('aggressive_line'))).toBe(true);
    expect(report.reasons.every((reason) => !reason.includes('aggressive/alt-style'))).toBe(true);
  });
});
