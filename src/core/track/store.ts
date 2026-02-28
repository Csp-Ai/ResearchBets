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
  const store = readStore();
  const signature = normalizeLegSignature(ticket);
  const deduped = store.tickets.filter((item) => {
    if (options?.replaceTicketId && item.ticketId === options.replaceTicketId) return false;
    if (item.ticketId === ticket.ticketId) return false;
    return normalizeLegSignature(item) !== signature;
  });
  deduped.unshift(ticket);
  writeStore({ version: 1, tickets: deduped.slice(0, 20) });
}

export function clearTrackedTickets() {
  writeStore({ version: 1, tickets: [] });
}
