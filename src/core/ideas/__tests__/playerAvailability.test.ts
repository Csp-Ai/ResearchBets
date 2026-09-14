import { describe, expect, it } from 'vitest';

import { classifyPlayerAvailability, normalizePlayerKey } from '@/src/core/ideas/playerAvailability';

describe('playerAvailability', () => {
  it('blocks clear unavailable designations', () => {
    expect(classifyPlayerAvailability({ status: 'Out' })?.severity).toBe('blocked');
    expect(classifyPlayerAvailability({ status: 'Doubtful' })?.severity).toBe('blocked');
    expect(classifyPlayerAvailability({ status: 'Injured Reserve' })?.severity).toBe('blocked');
  });

  it('keeps uncertain participation as caution instead of healthy', () => {
    expect(classifyPlayerAvailability({ status: 'Questionable' })?.severity).toBe('caution');
    expect(classifyPlayerAvailability({ status: 'Game-time decision' })?.severity).toBe('caution');
    expect(classifyPlayerAvailability({ status: 'Limited', detail: 'Limited in practice' })?.severity).toBe('caution');
  });

  it('does not turn an unrecognized or missing status into a health claim', () => {
    expect(classifyPlayerAvailability({ status: 'Active' })).toBeNull();
    expect(classifyPlayerAvailability({})).toBeNull();
  });

  it('normalizes sportsbook/provider player-name punctuation', () => {
    expect(normalizePlayerKey("D.J. Moore")).toBe('dj moore');
    expect(normalizePlayerKey("Ja'Marr Chase")).toBe('jamarr chase');
  });
});
