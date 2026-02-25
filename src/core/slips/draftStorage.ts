import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export const SCOUT_DRAFT_STORAGE_KEY = 'rb:scout:draft-legs';
export const SCOUT_DRAFT_UPDATED_EVENT = 'rb:scout:draft-updated';

export function readDraftLegs(): SlipBuilderLeg[] {
  if (typeof window === 'undefined') return [];
  const raw = window.sessionStorage.getItem(SCOUT_DRAFT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SlipBuilderLeg[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDraftLegs(legs: SlipBuilderLeg[]): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SCOUT_DRAFT_STORAGE_KEY, JSON.stringify(legs));
  window.dispatchEvent(new CustomEvent(SCOUT_DRAFT_UPDATED_EVENT, { detail: { count: legs.length } }));
}

export function upsertDraftLeg(leg: SlipBuilderLeg): SlipBuilderLeg[] {
  const current = readDraftLegs();
  const deduped = Array.from(new Map([...current, leg].map((item) => [item.id, item])).values());
  writeDraftLegs(deduped);
  return deduped;
}
