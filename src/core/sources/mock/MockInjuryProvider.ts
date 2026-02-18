import type { EvidenceItem } from '../../evidence/evidenceSchema';
import type { SourceFetchOptions, SourceProvider } from '../types';
import { seededHash } from '../types';

const positions = ['QB', 'RB', 'WR', 'OL', 'DL', 'LB', 'CB'];
const statuses = ['questionable', 'out', 'limited'];

export class MockInjuryProvider implements SourceProvider {
  id = 'mock-injury';
  sourceType = 'injury' as const;
  reliabilityDefault = 0.66;

  async fetch(subject: string, options?: SourceFetchOptions): Promise<EvidenceItem[]> {
    const seed = `${options?.seed ?? 'default'}:${subject}:${this.id}`;
    const now = options?.now ?? new Date().toISOString();
    const hash = seededHash(seed);
    const position = positions[hash % positions.length];
    const status = statuses[hash % statuses.length];
    const side = hash % 2 === 0 ? 'home' : 'away';

    return [
      {
        id: `${this.id}:${subject}:injury`,
        sourceType: this.sourceType,
        sourceName: 'Mock Injury Wire',
        sourceUrl: 'https://example.com/mock-injuries',
        retrievedAt: now,
        observedAt: new Date(new Date(now).getTime() - 1000 * 60 * 60 * 3).toISOString(),
        contentExcerpt: `${side} ${position} group flagged as ${status} heading into matchup.`,
        raw: { side, position, status },
        reliability: this.reliabilityDefault,
        tags: ['availability', 'depth-chart'],
      },
    ];
  }
}
