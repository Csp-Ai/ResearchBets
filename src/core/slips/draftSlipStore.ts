import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export const DRAFT_SLIP_STORAGE_KEY = 'rb:draft-slip:v1';
export const DRAFT_SLIP_UPDATED_EVENT = 'rb:draft-slip-updated';

export type DraftSlipIdentity = {
  slip_id?: string;
  trace_id?: string;
};

export type DraftSlipState = DraftSlipIdentity & {
  legs: SlipBuilderLeg[];
  createdAt?: string;
  updatedAt?: string;
};

type Listener = (state: DraftSlipState) => void;

type StoredDraftSlipState = DraftSlipState & {
  version: 2;
};

const emptyState = (): DraftSlipState => ({
  legs: [],
  slip_id: undefined,
  trace_id: undefined,
  createdAt: undefined,
  updatedAt: undefined
});

const dedupe = (legs: SlipBuilderLeg[]) =>
  Array.from(new Map(legs.map((leg) => [leg.id, leg])).values());

const asValidId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const issueIdentity = (state: DraftSlipState): DraftSlipState => {
  if (state.legs.length === 0) return emptyState();
  const now = state.updatedAt ?? new Date().toISOString();
  return {
    legs: dedupe(state.legs),
    slip_id: state.slip_id ?? crypto.randomUUID(),
    trace_id: state.trace_id ?? crypto.randomUUID(),
    createdAt: state.createdAt ?? now,
    updatedAt: now
  };
};

const normalizeState = (input: unknown): DraftSlipState => {
  if (Array.isArray(input)) {
    return issueIdentity({ legs: dedupe(input as SlipBuilderLeg[]) });
  }

  if (!input || typeof input !== 'object') return emptyState();
  const record = input as Partial<StoredDraftSlipState>;
  const legs = Array.isArray(record.legs) ? dedupe(record.legs) : [];
  if (legs.length === 0) return emptyState();

  return issueIdentity({
    legs,
    slip_id: asValidId(record.slip_id),
    trace_id: asValidId(record.trace_id),
    createdAt: asValidId(record.createdAt),
    updatedAt: asValidId(record.updatedAt)
  });
};

const writeToStorage = (state: DraftSlipState) => {
  if (typeof window === 'undefined') return;
  const next = state.legs.length > 0 ? issueIdentity(state) : emptyState();
  window.sessionStorage.setItem(
    DRAFT_SLIP_STORAGE_KEY,
    JSON.stringify({ version: 2, ...next } satisfies StoredDraftSlipState)
  );
  window.dispatchEvent(
    new CustomEvent(DRAFT_SLIP_UPDATED_EVENT, {
      detail: { count: next.legs.length, slip_id: next.slip_id, trace_id: next.trace_id }
    })
  );
};

const readFromStorage = (): DraftSlipState => {
  if (typeof window === 'undefined') return emptyState();
  const raw = window.sessionStorage.getItem(DRAFT_SLIP_STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const next = normalizeState(JSON.parse(raw));
    if (JSON.stringify(next) !== raw) {
      writeToStorage(next);
    }
    return next;
  } catch {
    return emptyState();
  }
};

const updateState = (updater: (state: DraftSlipState) => DraftSlipState): DraftSlipState => {
  const next = updater(readFromStorage());
  writeToStorage(next);
  return readFromStorage();
};

export const DraftSlipStore = {
  getState(): DraftSlipState {
    return readFromStorage();
  },
  getSlip(): SlipBuilderLeg[] {
    return readFromStorage().legs;
  },
  getIdentity(): DraftSlipIdentity {
    const state = readFromStorage();
    return { slip_id: state.slip_id, trace_id: state.trace_id };
  },
  ensureIdentity(): DraftSlipIdentity {
    const next = updateState((state) => (state.legs.length > 0 ? issueIdentity(state) : state));
    return { slip_id: next.slip_id, trace_id: next.trace_id };
  },
  addLeg(leg: SlipBuilderLeg): SlipBuilderLeg[] {
    return updateState((state) => ({
      ...state,
      legs: dedupe([...state.legs, leg]),
      updatedAt: new Date().toISOString()
    })).legs;
  },
  removeLeg(legId: string): SlipBuilderLeg[] {
    return updateState((state) => ({
      ...state,
      legs: state.legs.filter((leg) => leg.id !== legId),
      updatedAt: new Date().toISOString()
    })).legs;
  },
  updateLeg(nextLeg: SlipBuilderLeg): SlipBuilderLeg[] {
    return updateState((state) => ({
      ...state,
      legs: dedupe(state.legs.map((leg) => (leg.id === nextLeg.id ? nextLeg : leg))),
      updatedAt: new Date().toISOString()
    })).legs;
  },
  setSlip(legs: SlipBuilderLeg[]): SlipBuilderLeg[] {
    return updateState((state) => ({
      ...state,
      legs: dedupe(legs),
      updatedAt: new Date().toISOString()
    })).legs;
  },
  replaceState(state: DraftSlipState): DraftSlipState {
    return updateState(() => state);
  },
  clearSlip(): void {
    writeToStorage(emptyState());
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
