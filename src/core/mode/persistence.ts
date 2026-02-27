import { normalizeMode } from './policy';
import type { Mode } from './types';

const MODE_STORAGE_KEY = 'researchbets.mode';

export function readModeFromUrl(search: string | URLSearchParams): Mode | undefined {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  return normalizeMode(params.get('mode'));
}

export function withModeInUrl(href: string, mode: Mode): string {
  const url = new URL(href, 'http://localhost');
  url.searchParams.set('mode', mode);
  return `${url.pathname}${url.search}`;
}

export function readPersistedMode(storageKey = MODE_STORAGE_KEY): Mode | undefined {
  if (typeof window === 'undefined') return undefined;
  return normalizeMode(window.localStorage.getItem(storageKey));
}

export function persistMode(mode: Mode, storageKey = MODE_STORAGE_KEY): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, mode);
}
