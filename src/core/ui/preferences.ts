export const DEV_MODE_STORAGE_KEY = 'rb-developer-mode';
export const DEV_MODE_EVENT = 'rb:developer-mode-change';

export function readDeveloperMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1';
}

export function writeDeveloperMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new CustomEvent(DEV_MODE_EVENT, { detail: { enabled } }));
}
