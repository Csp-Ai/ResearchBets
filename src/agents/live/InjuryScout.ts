import { buildProvenance } from '../../core/sources/provenance';
import type { InjuryScoutResult } from './types';

export const runInjuryScout = async (): Promise<InjuryScoutResult> => {
  return {
    tags: ['injury-feed-pending'],
    severity: 'medium',
    provenance: buildProvenance([
      {
        provider: 'injury-stub',
        url: 'https://status.example.com/injuries',
        retrievedAt: new Date().toISOString()
      }
    ]),
    fallbackReason: 'injury_provider_not_configured'
  };
};
