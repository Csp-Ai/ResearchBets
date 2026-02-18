import type { EvidenceItem } from '../../evidence/evidenceSchema';
import type { SourceFetchOptions, SourceProvider } from '../types';
import { seededRange } from '../types';

export class MockStatsProvider implements SourceProvider {
  id = 'mock-stats';
  sourceType = 'stats' as const;
  reliabilityDefault = 0.79;

  async fetch(subject: string, options?: SourceFetchOptions): Promise<EvidenceItem[]> {
    const seed = `${options?.seed ?? 'default'}:${subject}:${this.id}`;
    const now = options?.now ?? new Date().toISOString();
    const homePace = seededRange(`${seed}:pace:home`, 90, 105, 1);
    const awayPace = seededRange(`${seed}:pace:away`, 90, 105, 1);
    const homeEff = seededRange(`${seed}:eff:home`, 102, 124, 1);
    const awayEff = seededRange(`${seed}:eff:away`, 102, 124, 1);

    return [
      {
        id: `${this.id}:${subject}:pace-eff`,
        sourceType: this.sourceType,
        sourceName: 'Mock Stats Engine',
        sourceUrl: 'https://example.com/mock-stats',
        retrievedAt: now,
        observedAt: new Date(new Date(now).getTime() - 1000 * 60 * 60 * 24).toISOString(),
        contentExcerpt: `Home pace ${homePace} vs away pace ${awayPace}; home efficiency ${homeEff} vs away efficiency ${awayEff}.`,
        raw: { homePace, awayPace, homeEff, awayEff },
        reliability: this.reliabilityDefault,
        tags: ['pace', 'efficiency'],
      },
    ];
  }
}
