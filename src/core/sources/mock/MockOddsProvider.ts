import { createHash } from 'node:crypto';

import type { EvidenceItem } from '../../evidence/evidenceSchema';
import type { SourceFetchOptions, SourceProvider } from '../types';
import { seededRange } from '../types';

export class MockOddsProvider implements SourceProvider {
  id = 'mock-odds';
  sourceType = 'odds' as const;
  reliabilityDefault = 0.72;

  async fetch(subject: string, options?: SourceFetchOptions): Promise<EvidenceItem[]> {
    const seed = `${options?.seed ?? 'default'}:${subject}:${this.id}`;
    const now = options?.now ?? new Date().toISOString();
    const movement = seededRange(seed, -4, 4, 1);
    const openingLine = seededRange(`${seed}:open`, -9, 9, 1);
    const currentLine = Number((openingLine + movement).toFixed(1));
    const toward = movement >= 0 ? 'home' : 'away';
    const contentExcerpt = `Spread moved ${Math.abs(movement)} points toward ${toward}; opened ${openingLine}, now ${currentLine}.`;

    const contentHash = createHash('sha256').update(contentExcerpt).digest('hex');

    return [
      {
        id: `${this.id}:${subject}:line-move`,
        sourceType: this.sourceType,
        sourceName: 'Mock Odds Feed',
        sourceUrl: 'https://example.com/mock-odds',
        retrievedAt: now,
        observedAt: new Date(new Date(now).getTime() - 1000 * 60 * 60 * 6).toISOString(),
        contentExcerpt,
        contentHash,
        raw: { openingLine, currentLine, movement, toward },
        reliability: this.reliabilityDefault,
        tags: ['line', 'movement'],
      },
    ];
  }
}
