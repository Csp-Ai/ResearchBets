import { describe, expect, it } from 'vitest';
import { reviewTicketAssumptions } from '@/src/core/slips/ticketAssumptions';
import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';

const rushing = (id: string, player: string, line: string, team?: string): SlipIntelLeg => ({
  id, player, marketType: 'rushing_yards', game: 'PHI @ JAX', line, team,
  selection: `${player} ${line} rushing yards`,
});

describe('reviewTicketAssumptions', () => {
  it('does not assert same-team competition when the team assignment is missing', () => {
    const review = reviewTicketAssumptions([
      rushing('tuten', 'Bhayshul Tuten', '60+'),
      rushing('rodriguez', 'Chris Rodriguez Jr', '20+'),
    ]);
    expect(review.primary?.kind).toBe('backfield_identity_unknown');
    expect(review.primary?.evidence).toBe('requires_verification');
    expect(review.primary?.toVerify).toContain('Verify both teams');
    expect(review.primary?.why).not.toContain('same team');
  });

  it('flags shared offensive opportunity only when both teams are explicitly equal', () => {
    const review = reviewTicketAssumptions([
      rushing('a', 'Player One', '60+', 'JAX'),
      rushing('b', 'Player Two', '20+', 'JAX'),
    ]);
    expect(review.primary?.kind).toBe('shared_backfield');
    expect(review.primary?.severity).toBe('watch');
    expect(review.primary?.countercase).toContain('both'); // Both players may clear.
  });

  it('does not pretend opposing rushers share a backfield', () => {
    const review = reviewTicketAssumptions([
      rushing('a', 'Player One', '60+', 'JAX'),
      rushing('b', 'Player Two', '20+', 'PHI'),
    ]);
    expect(review.primary).toBeNull();
  });

  it('flags mathematically contradictory over/under lines for one event', () => {
    const review = reviewTicketAssumptions([
      rushing('over', 'Player One', 'Over 60', 'JAX'),
      rushing('under', 'Player One', 'Under 50', 'JAX'),
    ]);
    expect(review.primary?.kind).toBe('contradictory_lines');
    expect(review.primary?.severity).toBe('blocker');
  });

  it('flags nested same-player ladders without calling them mutually exclusive', () => {
    const review = reviewTicketAssumptions([
      rushing('floor', 'Player One', '20+', 'JAX'),
      rushing('push', 'Player One', '60+', 'JAX'),
    ]);
    expect(review.primary?.kind).toBe('nested_ladders');
    expect(review.primary?.countercase).toContain('Both legs can win');
  });

  it('does not flag satisfiable opposing directions as contradictions', () => {
    const review = reviewTicketAssumptions([
      rushing('floor', 'Player One', 'Over 20', 'JAX'),
      rushing('ceiling', 'Player One', 'Under 60', 'JAX'),
    ]);
    expect(review.primary).toBeNull();
  });

  it('cannot infer any correlation without an event identity', () => {
    const a = { ...rushing('a', 'Player One', '20+', 'JAX'), game: undefined };
    const b = { ...rushing('b', 'Player Two', '60+', 'JAX'), game: undefined };
    const review = reviewTicketAssumptions([a, b]);
    expect(review.primary).toBeNull();
    expect(review.unverifiedInputs).toEqual(expect.arrayContaining([
      expect.stringContaining('Matchup/event identity'),
    ]));
  });

  it('does not compare different events even when the same player and market recur', () => {
    const a = rushing('a', 'Player One', 'Over 60', 'JAX');
    const b = { ...rushing('b', 'Player One', 'Under 50', 'JAX'), game: 'JAX @ NYG' };
    expect(reviewTicketAssumptions([a, b]).primary).toBeNull();
  });

  it('prioritizes proven conflicts ahead of unverifiable workload questions', () => {
    const review = reviewTicketAssumptions([
      rushing('a', 'Player One', 'Over 60'),
      rushing('b', 'Player One', 'Under 40'),
      rushing('c', 'Player Three', '20+'),
    ]);
    expect(review.primary?.kind).toBe('contradictory_lines');
    expect(review.findings.some((f) => f.kind === 'backfield_identity_unknown')).toBe(true);
  });

  it('does not invent a role, win probability or sportsbook price', () => {
    const text = JSON.stringify(reviewTicketAssumptions([
      rushing('a', 'Player One', '60+'),
      rushing('b', 'Player Two', '20+'),
    ]));
    expect(text).not.toContain('75%');
    expect(text).not.toContain('starter');
    expect(text).not.toContain('verified provider');
  });

  it('does not model same-game receivers as rushers', () => {
    const review = reviewTicketAssumptions([
      { id: 'a', player: 'Receiver One', game: 'PHI @ JAX', marketType: 'receiving_yards', line: '60+', selection: 'Receiver One 60+' },
      { id: 'b', player: 'Receiver Two', game: 'PHI @ JAX', marketType: 'receiving_yards', line: '50+', selection: 'Receiver Two 50+' },
    ]);
    expect(review.primary).toBeNull();
  });
});
