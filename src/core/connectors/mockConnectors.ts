import { createHash } from 'node:crypto';

import type { Connector } from './Connector';
import type { EvidenceItem } from '../evidence/evidenceSchema';
import { sanitizeUntrustedText } from '../guardrails/safety';

const seededNumber = (seed: string, salt: string): number => {
  const hex = createHash('sha256').update(`${seed}:${salt}`).digest('hex').slice(0, 8);
  return Number.parseInt(hex, 16) / 0xffffffff;
};

const makeEvidence = (input: {
  sourceType: EvidenceItem['sourceType'];
  sourceName: string;
  subject: string;
  text: string;
  url: string;
  now: string;
  seed: string;
  reliability: number;
  raw: Record<string, unknown>;
}): EvidenceItem => {
  const safeText = sanitizeUntrustedText(input.text);
  const contentHash = createHash('sha256').update(`${input.sourceName}:${safeText}`).digest('hex');

  return {
    id: `${input.sourceType}_${contentHash.slice(0, 10)}`,
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    sourceUrl: input.url,
    retrievedAt: input.now,
    observedAt: input.now,
    contentExcerpt: safeText,
    contentHash,
    reliability: input.reliability,
    raw: input.raw,
    tags: [input.subject],
  };
};

const connectorFactory = (config: {
  id: string;
  sourceType: EvidenceItem['sourceType'];
  sourceName: string;
  requiresEnv: string[];
  allowedTiers: readonly ('free' | 'premium')[];
  allowProd?: boolean;
  textBuilder: (subject: string, seed: string) => string;
}): Connector => ({
  id: config.id,
  sourceType: config.sourceType,
  sourceName: config.sourceName,
  reliabilityDefault: 0.72,
  requiresEnv: config.requiresEnv,
  allowedTiers: config.allowedTiers,
  allowedEnvironments: config.allowProd ? ['dev', 'staging', 'prod'] : ['dev', 'staging'],
  async healthCheck() {
    return true;
  },
  async fetch(subject, options) {
    const variation = seededNumber(options.seed, config.id);
    const raw = { variation: Number(variation.toFixed(4)) };
    return {
      evidence: [
        makeEvidence({
          sourceType: config.sourceType,
          sourceName: config.sourceName,
          subject,
          text: config.textBuilder(subject, options.seed),
          url: 'https://trusted.example.com/source',
          now: options.now,
          seed: options.seed,
          reliability: Number((0.55 + variation * 0.35).toFixed(4)),
          raw,
        }),
      ],
      raw,
    };
  },
});

export const OddsConnector = connectorFactory({
  id: 'odds',
  sourceType: 'odds',
  sourceName: 'Mock Odds Feed',
  requiresEnv: ['ODDS_CONNECTOR_KEY'],
  allowedTiers: ['free', 'premium'],
  allowProd: true,
  textBuilder: (subject, seed) => `Odds moved toward home on ${subject} (seed ${seed.slice(0, 4)}).`,
});

export const InjuriesConnector = connectorFactory({
  id: 'injuries',
  sourceType: 'injury',
  sourceName: 'Mock Injuries Feed',
  requiresEnv: ['INJURIES_CONNECTOR_KEY'],
  allowedTiers: ['premium'],
  textBuilder: (subject, seed) => `Injury report updated for ${subject} (${seed.slice(-4)}).`,
});

export const StatsConnector = connectorFactory({
  id: 'stats',
  sourceType: 'stats',
  sourceName: 'Mock Stats Feed',
  requiresEnv: ['STATS_CONNECTOR_KEY'],
  allowedTiers: ['free', 'premium'],
  allowProd: true,
  textBuilder: (subject, seed) => `Pace and efficiency splits refreshed for ${subject} using ${seed}.`,
});

export const NewsConnector = connectorFactory({
  id: 'news',
  sourceType: 'news',
  sourceName: 'Mock News Feed',
  requiresEnv: ['NEWS_CONNECTOR_KEY'],
  allowedTiers: ['free', 'premium'],
  allowProd: true,
  textBuilder: (subject, seed) => `Beat report notes momentum trend for ${subject} with token ${seed}.`,
});
