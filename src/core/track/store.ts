import type { TrackedTicket } from '@/src/core/track/types';

const STORE_KEY = 'rb:tracked-tickets:v1';

type TrackedTicketStore = {
  version: 1;
  tickets: TrackedTicket[];
};

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
      tickets: parsed.tickets.filter((ticket) => ticket && Array.isArray(ticket.legs) && typeof ticket.ticketId === 'string')
    };
  } catch {
    return { version: 1, tickets: [] };
  }
}

function writeStore(store: TrackedTicketStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function listTrackedTickets(): TrackedTicket[] {
  return [...readStore().tickets].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function saveTrackedTicket(ticket: TrackedTicket) {
  const store = readStore();
  const deduped = store.tickets.filter((item) => item.ticketId !== ticket.ticketId);
  deduped.unshift(ticket);
  writeStore({ version: 1, tickets: deduped.slice(0, 20) });
}

export function clearTrackedTickets() {
  writeStore({ version: 1, tickets: [] });
}
