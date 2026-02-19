export const DEV_MODE_STORAGE_KEY = 'rb-developer-mode';
export const DEV_MODE_EVENT = 'rb:developer-mode-change';
export const COVERAGE_AGENT_STORAGE_KEY = 'rb-coverage-agent-enabled';
export const COVERAGE_AGENT_EVENT = 'rb:coverage-agent-change';

export function readDeveloperMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1';
}

export function writeDeveloperMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new CustomEvent(DEV_MODE_EVENT, { detail: { enabled } }));
}

export function readCoverageAgentEnabled(defaultValue = process.env.NEXT_PUBLIC_ENABLE_COVERAGE_AGENT === 'true'): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const value = window.localStorage.getItem(COVERAGE_AGENT_STORAGE_KEY);
  if (value === null) return defaultValue;
  return value === '1';
}

export function writeCoverageAgentEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COVERAGE_AGENT_STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new CustomEvent(COVERAGE_AGENT_EVENT, { detail: { enabled } }));
}
