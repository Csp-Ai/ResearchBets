import type { EvidenceItem } from './evidenceSchema';

const shortIso = (iso: string | undefined): string => {
  if (!iso) {
    return 'unknown-time';
  }

  return iso.slice(0, 16).replace('T', ' ');
};

export const formatCitation = (evidenceItem: EvidenceItem): string => {
  const observed = shortIso(evidenceItem.observedAt ?? evidenceItem.retrievedAt);
  const source = evidenceItem.sourceName;
  const type = evidenceItem.sourceType.toUpperCase();

  return `${source} (${type}, observed ${observed})`;
};
