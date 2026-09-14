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

  it('normalizes full sportsbook matchup names before live box-score lookup', () => {
    expect(homeTeamFromGameId('Arizona Cardinals @ Los Angeles Chargers')).toBe('LAC');
    expect(homeTeamFromGameId('Washington Commanders at Philadelphia Eagles')).toBe('PHI');
    expect(homeTeamFromGameId('Green Bay Packers @ Minnesota Vikings')).toBe('MIN');
    expect(homeTeamFromGameId('Miami Dolphins @ Las Vegas Raiders')).toBe('LV');
  });

  it('does not guess unknown teams into a provider key', () => {
    expect(homeTeamFromGameId('Unknown Team @ Mystery Club')).toBeUndefined();
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

  it('treats final states as complete instead of inventing a full quarter remaining', () => {
    expect(nflClockFromScore({ Quarter: 'F', TimeRemaining: null })).toEqual({
      quarter: 4,
      timeRemainingSec: 0,
      elapsedGameMinutes: 60,
    });
    expect(nflClockFromScore({ Quarter: 'F/OT', TimeRemaining: null })).toEqual({
      quarter: 4,
      timeRemainingSec: 0,
      elapsedGameMinutes: 60,
    });
  });

  it('fails closed on unsupported live overtime clocks', () => {
    expect(nflClockFromScore({ Quarter: 'OT', TimeRemaining: '08:00' })).toBeUndefined();
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
