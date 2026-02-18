import { createHash } from 'node:crypto';

import type { Connector, ConnectorExecutionContext, ConnectorFetchOptions, ConnectorFetchResult } from './Connector';
import { seededRange } from '../sources/types';

export class OddsConnector implements Connector {
  id = 'odds-primary';
  sourceType = 'odds' as const;
  sourceName = 'Mock Odds Feed';
  reliabilityDefault = 0.72;
  requiredEnv = ['ODDS_CONNECTOR_ENABLED'];
  allowedTiers = ['free', 'pro', 'elite'] as const;
  allowedEnvironments = ['dev', 'staging', 'prod'] as const;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async fetch(context: ConnectorExecutionContext, options: ConnectorFetchOptions): Promise<ConnectorFetchResult> {
    const seed = `${options.seed ?? 'default'}:${context.subject}:${this.id}`;
    const now = options.now ?? new Date().toISOString();
    const movement = seededRange(seed, -4, 4, 1);
    const openingLine = seededRange(`${seed}:open`, -9, 9, 1);
    const currentLine = Number((openingLine + movement).toFixed(1));
    const toward = movement >= 0 ? 'home' : 'away';
    const contentExcerpt = `Spread moved ${Math.abs(movement)} points toward ${toward}; opened ${openingLine}, now ${currentLine}.`;
    const contentHash = createHash('sha256').update(contentExcerpt).digest('hex');

    return {
      evidence: [
        {
          id: `${this.id}:${context.subject}:line-move`,
          sourceType: this.sourceType,
          sourceName: this.sourceName,
          sourceUrl: 'https://example.com/mock-odds',
          retrievedAt: now,
          observedAt: new Date(new Date(now).getTime() - 1000 * 60 * 60 * 6).toISOString(),
          contentExcerpt,
          contentHash,
          licenseHint: 'internal-mock',
          raw: { openingLine, currentLine, movement, toward, idempotencyKey: options.idempotencyKey },
          reliability: this.reliabilityDefault,
          tags: ['line', 'movement'],
        },
      ],
      raw: {
        openingLine,
        currentLine,
        movement,
        toward,
      },
    };
  }
}
