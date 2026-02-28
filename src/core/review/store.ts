import { buildEdgeProfile, type EdgeProfile } from '@/src/core/review/edgeProfile';
import type { DraftPostmortemSnapshot, PostmortemRecord } from '@/src/core/review/types';
import { mapMissTagsToNextTimeRule } from '@/src/core/guardrails/localGuardrails';

const POSTMORTEMS_KEY = 'rb:postmortems:v1';
const DRAFT_KEY = 'rb:draft-postmortems:v1';
const EDGE_KEY = 'rb:edge-profile:v1';

const demoPostmortems = (): PostmortemRecord[] => ([
  {
    ticketId: 'demo-ticket-a',
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: '2026-01-01T03:00:00.000Z',
    status: 'lost',
    legs: [
      { legId: 'demo-leg-1', player: 'MEM Wing A', statType: 'points', target: 16.5, finalValue: 15.0, delta: -1.5, hit: false, missTags: ['bust_by_one'], missNarrative: 'Missed points by 1.5; primary signal: bust by one.', lessonHint: 'Consider a half-step lower line for similar spots.' },
      { legId: 'demo-leg-2', player: 'MEM Guard B', statType: 'assists', target: 5.5, finalValue: 4.0, delta: -1.5, hit: false, missTags: ['assist_variance'], missNarrative: 'Missed assists by 1.5; primary signal: assist variance.', lessonHint: 'Pair assists with steadier usage signals to reduce swing.' }
    ],
    coverage: { level: 'partial', reasons: ['provider_unavailable'] },
    fragility: { score: 72, chips: ['High-variance market', 'Ladder distance'] },
    narrative: ['Ticket lost with two close misses.', 'Assists leg carried most of the variance.', 'Coverage was partial for one game.'],
    nextTimeRule: mapMissTagsToNextTimeRule(['assist_variance'])
  }
]);

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listPostmortems(): PostmortemRecord[] {
  const records = readJson<PostmortemRecord[]>(POSTMORTEMS_KEY, []);
  if (records.length > 0) return [...records].sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt));
  return demoPostmortems();
}

export function savePostmortem(record: PostmortemRecord) {
  const existing = readJson<PostmortemRecord[]>(POSTMORTEMS_KEY, []);
  const deduped = [record, ...existing.filter((item) => item.ticketId !== record.ticketId)].slice(0, 100);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(POSTMORTEMS_KEY, JSON.stringify(deduped));
    window.localStorage.setItem(EDGE_KEY, JSON.stringify(buildEdgeProfile(deduped)));
  }
}

export function saveDraftPostmortem(snapshot: DraftPostmortemSnapshot) {
  const existing = readJson<DraftPostmortemSnapshot[]>(DRAFT_KEY, []);
  const deduped = [snapshot, ...existing.filter((item) => item.ticketId !== snapshot.ticketId)].slice(0, 100);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(deduped));
  }
}

export function getDraftPostmortem(ticketId: string): DraftPostmortemSnapshot | undefined {
  return readJson<DraftPostmortemSnapshot[]>(DRAFT_KEY, []).find((item) => item.ticketId === ticketId);
}

export function getEdgeProfile(): EdgeProfile {
  const cached = readJson<EdgeProfile | null>(EDGE_KEY, null);
  if (cached) return cached;
  const built = buildEdgeProfile(listPostmortems());
  if (typeof window !== 'undefined') window.localStorage.setItem(EDGE_KEY, JSON.stringify(built));
  return built;
}
