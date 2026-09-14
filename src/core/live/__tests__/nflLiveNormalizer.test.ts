import { describe, expect, it } from 'vitest';

import {
  findNflPlayer,
  homeTeamFromGameId,
  nflClockFromScore,
  normalizeNflPlayerName,
  playerStatForMarket,
  signedPlayerTeamMargin,
} from '@/src/core/live/nflLiveNormalizer';

describe('NFL live normalizer', () => {
  it('normalizes punctuation and common suffixes in player names', () => {
    expect(normalizeNflPlayerName("De'Von Achane")).toBe('devon achane');
    expect(normalizeNflPlayerName('Marvin Harrison Jr.')).toBe('marvin harrison');
    expect(normalizeNflPlayerName('Marvin Harrison Jr')).toBe('marvin harrison');
  });

  it('extracts the home team from canonical matchup ids', () => {
    expect(homeTeamFromGameId('ARI@LAC')).toBe('LAC');
    expect(homeTeamFromGameId('WAS @ PHI')).toBe('PHI');
    expect(homeTeamFromGameId(undefined)).toBeUndefined();
  });

  it('maps verified NFL player fields to ResearchBets markets', () => {
    const player = {
      Name: 'Jalen Hurts',
      PassingYards: 122,
      PassingTouchdowns: 2,
      RushingYards: 11,
      RushingAttempts: 2,
      Receptions: 0,
      ReceivingYards: 0,
      Touchdowns: 0,
    };

    expect(playerStatForMarket(player, 'passing_yards')).toBe(122);
    expect(playerStatForMarket(player, 'passing_tds')).toBe(2);
    expect(playerStatForMarket(player, 'rushing_yards')).toBe(11);
    expect(playerStatForMarket(player, 'carries')).toBe(2);
    expect(playerStatForMarket(player, 'anytime_td')).toBe(0);
  });

  it('derives quarter and true NFL elapsed time from provider score state', () => {
    const clock = nflClockFromScore({ Quarter: '3', TimeRemaining: '07:30' });
    expect(clock?.quarter).toBe(3);
    expect(clock?.timeRemainingSec).toBe(450);
    expect(clock?.elapsedGameMinutes).toBe(37.5);
  });

  it('finds a player and computes signed team margin', () => {
    const player = { Name: 'Trey McBride', Team: 'ARI', ReceivingYards: 74 };
    const players = [player, { Name: 'Ladd McConkey', Team: 'LAC', ReceivingYards: 40 }];
    const found = findNflPlayer(players, 'Trey McBride');
    expect(found).toBe(player);
    expect(
      signedPlayerTeamMargin(
        { HomeTeam: 'LAC', AwayTeam: 'ARI', HomeScore: 7, AwayScore: 16 },
        player,
      ),
    ).toBe(9);
  });
});
