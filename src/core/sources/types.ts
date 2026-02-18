import type { EvidenceItem, EvidenceSourceType } from '../evidence/evidenceSchema';

export interface SourceFetchOptions {
  seed?: string;
  now?: string;
}

export interface SourceProvider {
  id: string;
  sourceType: EvidenceSourceType;
  reliabilityDefault: number;
  fetch(subject: string, options?: SourceFetchOptions): Promise<EvidenceItem[]>;
}

export const seededHash = (seed: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
};

export const seededRange = (seed: string, min: number, max: number, fixed = 1): number => {
  const hash = seededHash(seed);
  const value = min + (hash % 10000) / 10000 * (max - min);
  return Number(value.toFixed(fixed));
};
