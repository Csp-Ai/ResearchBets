import { normalizeLineage } from '@/src/core/lineage/lineage';
import type {
  TrackedTicket,
  TrackedTicketEntryLegState,
  TrackedTicketEntrySnapshot,
} from '@/src/core/track/types';

const STORE_KEY = 'rb:tracked-tickets:v1';

const asTrackedMode = (value: unknown): TrackedTicket['mode'] =>
  value === 'live' || value === 'cache' || value === 'demo' ? value : undefined;

type TrackedTicketStore = {
  version: 1;
  tickets: TrackedTicket[];
};

function migrateTicket(ticket: TrackedTicket): TrackedTicket {
  if (!ticket.trace_id) return ticket;
  const lineage = normalizeLineage({
    trace_id: ticket.trace_id,
    slip_id: ticket.slip_id,
    ticketId: ticket.ticketId,
    anon_session_id: ticket.anon_session_id,
    sport: ticket.sport,
    tz: ticket.tz,
    date: ticket.date,
    mode: ticket.mode
  });

  return {
    ...ticket,
    trace_id: lineage.trace_id,
    run_id: lineage.run_id,
    slip_id: lineage.slip_id,
    anon_session_id: lineage.anon_session_id,
    sport: lineage.sport,
    tz: lineage.tz,
    date: lineage.date,
    mode: asTrackedMode(lineage.mode)
  };
}

function readStore(): TrackedTicketStore {
  if (typeof window === 'undefined') return { version: 1, tickets: [] };
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) return { version: 1, tickets: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<TrackedTicketStore>;
    if (parsed.version !== 1 || !Array.isArray(parsed.tickets)) {
      return { version: 1, tickets: [] };
    }
    return {
      version: 1,
      tickets: parsed.tickets
        .filter(
          (ticket) => ticket && Array.isArray(ticket.legs) && typeof ticket.ticketId === 'string'
        )
        .map((ticket) => migrateTicket(ticket as TrackedTicket))
    };
  } catch {
    return { version: 1, tickets: [] };
  }
}

function writeStore(store: TrackedTicketStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function hashToHex(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function normalizeLegSignature(ticket: TrackedTicket) {
  const legs = [...ticket.legs]
    .map((leg) => `${leg.player.toLowerCase()}|${leg.marketType}|${leg.direction}|${leg.threshold}`)
    .sort()
    .join('||');
  return hashToHex(`${ticket.createdAt}|${legs}`);
}

export function listTrackedTickets(): TrackedTicket[] {
  return [...readStore().tickets].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function saveTrackedTicket(ticket: TrackedTicket, options?: { replaceTicketId?: string }) {
  const migrated = migrateTicket(ticket);
  const store = readStore();
  const signature = normalizeLegSignature(migrated);
  const deduped = store.tickets.filter((item) => {
    if (options?.replaceTicketId && item.ticketId === options.replaceTicketId) return false;
    if (item.ticketId === migrated.ticketId) return false;
    return normalizeLegSignature(item) !== signature;
  });
  deduped.unshift(migrated);
  writeStore({ version: 1, tickets: deduped.slice(0, 20) });
}

type VerifiedEntryUpdate = {
  currentValue?: number;
  elapsedGameMinutes?: number;
  quarter?: 1 | 2 | 3 | 4;
  timeRemainingSec?: number;
  opportunityCount?: number;
  opportunityLabel?: 'pass attempts' | 'carries' | 'targets';
};

const completeEntryState = (
  update: VerifiedEntryUpdate | undefined,
  capturedAt: string,
): TrackedTicketEntryLegState | null => {
  if (
    typeof update?.currentValue !== 'number' ||
    typeof update.elapsedGameMinutes !== 'number' ||
    typeof update.quarter !== 'number' ||
    typeof update.timeRemainingSec !== 'number'
  ) {
    return null;
  }

  return {
    capturedAt,
    currentValue: update.currentValue,
    elapsedGameMinutes: update.elapsedGameMinutes,
    quarter: update.quarter,
    timeRemainingSec: update.timeRemainingSec,
    opportunityCount: update.opportunityCount,
    opportunityLabel: update.opportunityLabel,
  };
};

const timingFromEntryStates = (
  states: Record<string, TrackedTicketEntryLegState>,
): TrackedTicketEntrySnapshot['timing'] => {
  const values = Object.values(states);
  if (
    values.some(
      (state) =>
        state.elapsedGameMinutes > 0.01 ||
        state.quarter > 1 ||
        state.currentValue > 0 ||
        state.timeRemainingSec < 900,
    )
  ) {
    return 'live';
  }
  return 'unknown';
};

export function captureFirstVerifiedEntrySnapshot(input: {
  ticketId: string;
  updates: Record<string, VerifiedEntryUpdate>;
  capturedAt: string;
}): TrackedTicket | null {
  const store = readStore();
  const index = store.tickets.findIndex((ticket) => ticket.ticketId === input.ticketId);
  if (index < 0) return null;

  const ticket = store.tickets[index]!;
  const existingSnapshot = ticket.entrySnapshot;
  const existingLegs = existingSnapshot?.legs ?? {};

  const newlyVerifiedLegs = Object.fromEntries(
    ticket.legs.flatMap((leg) => {
      if (existingLegs[leg.legId]) return [];
      const state = completeEntryState(input.updates[leg.legId], input.capturedAt);
      return state ? [[leg.legId, state] as const] : [];
    }),
  );

  if (Object.keys(newlyVerifiedLegs).length === 0) return ticket;

  const combinedLegs = { ...existingLegs, ...newlyVerifiedLegs };
  const entrySnapshot: TrackedTicketEntrySnapshot = existingSnapshot
    ? {
        ...existingSnapshot,
        timing:
          existingSnapshot.timing === 'unknown'
            ? timingFromEntryStates(combinedLegs)
            : existingSnapshot.timing,
        legs: combinedLegs,
      }
    : {
        capturedAt: input.capturedAt,
        captureSource: 'first_verified_after_tracking',
        timing: timingFromEntryStates(combinedLegs),
        exactDecisionTime: false,
        note:
          'First provider-verified snapshot after ResearchBets tracking began; not asserted as sportsbook placement-time state.',
        legs: combinedLegs,
      };

  const updated = { ...ticket, entrySnapshot };
  const tickets = [...store.tickets];
  tickets[index] = updated;
  writeStore({ version: 1, tickets });
  return updated;
}

export function clearTrackedTickets() {
  writeStore({ version: 1, tickets: [] });
}
