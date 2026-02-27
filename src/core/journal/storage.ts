import type { JournalEntry } from './journalTypes';

const JOURNAL_KEY = 'rb:journal:v1';

function readJournal(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(JOURNAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJournal(entries: JournalEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

export function saveJournalEntry(entry: JournalEntry) {
  const entries = readJournal();
  writeJournal([entry, ...entries.filter((item) => item.entryId !== entry.entryId)]);
}

export function listJournalEntries() {
  return readJournal().sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso));
}

export function loadJournalEntry(entryId: string) {
  return readJournal().find((entry) => entry.entryId === entryId) ?? null;
}
