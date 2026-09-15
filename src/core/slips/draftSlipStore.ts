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
    return { legs: dedupe(input as SlipBuilderLeg[]) };
  }

  if (!input || typeof input !== 'object') return emptyState();
  const record = input as Partial<StoredDraftSlipState>;
  const legs = Array.isArray(record.legs) ? dedupe(record.legs) : [];
  if (legs.length === 0) return emptyState();

  return {
    legs,
    slip_id: asValidId(record.slip_id),
    trace_id: asValidId(record.trace_id),
    createdAt: asValidId(record.createdAt),
    updatedAt: asValidId(record.updatedAt)
  };
};

const serializedState = (state: DraftSlipState): { state: DraftSlipState; raw: string } => {
  const next = state.legs.length > 0 ? issueIdentity(state) : emptyState();
  return {
    state: next,
    raw: JSON.stringify({ version: 2, ...next } satisfies StoredDraftSlipState)
  };
};

const writeToStorage = (
  state: DraftSlipState,
  options: { emit?: boolean } = {}
): DraftSlipState => {
  if (typeof window === 'undefined') return state.legs.length > 0 ? issueIdentity(state) : emptyState();
  const serialized = serializedState(state);
  window.sessionStorage.setItem(DRAFT_SLIP_STORAGE_KEY, serialized.raw);

  if (options.emit !== false) {
    window.dispatchEvent(
      new CustomEvent(DRAFT_SLIP_UPDATED_EVENT, {
        detail: {
          count: serialized.state.legs.length,
          slip_id: serialized.state.slip_id,
          trace_id: serialized.state.trace_id
        }
      })
    );
  }

  return serialized.state;
};

const readFromStorage = (): DraftSlipState => {
  if (typeof window === 'undefined') return emptyState();
  const raw = window.sessionStorage.getItem(DRAFT_SLIP_STORAGE_KEY);
  if (!raw) return emptyState();

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
};

const migrateStorage = (): DraftSlipState => {
  if (typeof window === 'undefined') return emptyState();
  const raw = window.sessionStorage.getItem(DRAFT_SLIP_STORAGE_KEY);
  if (!raw) return emptyState();

  try {
    const normalized = normalizeState(JSON.parse(raw));
    const serialized = serializedState(normalized);
    if (serialized.raw !== raw) {
      window.sessionStorage.setItem(DRAFT_SLIP_STORAGE_KEY, serialized.raw);
    }
    return serialized.state;
  } catch {
    window.sessionStorage.removeItem(DRAFT_SLIP_STORAGE_KEY);
    return emptyState();
  }
};

const updateState = (updater: (state: DraftSlipState) => DraftSlipState): DraftSlipState => {
  const current = readFromStorage();
  return writeToStorage(updater(current));
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
  migrateStorage(): DraftSlipState {
    return migrateStorage();
  },
  ensureIdentity(): DraftSlipIdentity {
    const state = readFromStorage();
    if (state.legs.length === 0) return {};
    if (state.slip_id && state.trace_id) {
      return { slip_id: state.slip_id, trace_id: state.trace_id };
    }
    const next = writeToStorage(issueIdentity(state));
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
