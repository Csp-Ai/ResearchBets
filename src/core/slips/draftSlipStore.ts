import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export const DRAFT_SLIP_STORAGE_KEY = 'rb:draft-slip:v1';
export const DRAFT_SLIP_UPDATED_EVENT = 'rb:draft-slip-updated';

type Listener = (legs: SlipBuilderLeg[]) => void;

const readFromStorage = (): SlipBuilderLeg[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.sessionStorage.getItem(DRAFT_SLIP_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SlipBuilderLeg[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeToStorage = (legs: SlipBuilderLeg[]) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DRAFT_SLIP_STORAGE_KEY, JSON.stringify(legs));
  window.dispatchEvent(new CustomEvent(DRAFT_SLIP_UPDATED_EVENT, { detail: { count: legs.length } }));
};

const dedupe = (legs: SlipBuilderLeg[]) => Array.from(new Map(legs.map((leg) => [leg.id, leg])).values());

export const DraftSlipStore = {
  getSlip(): SlipBuilderLeg[] {
    return readFromStorage();
  },
  addLeg(leg: SlipBuilderLeg): SlipBuilderLeg[] {
    const next = dedupe([...readFromStorage(), leg]);
    writeToStorage(next);
    return next;
  },
  removeLeg(legId: string): SlipBuilderLeg[] {
    const next = readFromStorage().filter((leg) => leg.id !== legId);
    writeToStorage(next);
    return next;
  },
  updateLeg(nextLeg: SlipBuilderLeg): SlipBuilderLeg[] {
    const next = dedupe(readFromStorage().map((leg) => (leg.id === nextLeg.id ? nextLeg : leg)));
    writeToStorage(next);
    return next;
  },
  setSlip(legs: SlipBuilderLeg[]): SlipBuilderLeg[] {
    const next = dedupe(legs);
    writeToStorage(next);
    return next;
  },
  clearSlip(): void {
    writeToStorage([]);
  },
  subscribe(listener: Listener): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onChange = () => listener(readFromStorage());
    window.addEventListener(DRAFT_SLIP_UPDATED_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(DRAFT_SLIP_UPDATED_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }
};
