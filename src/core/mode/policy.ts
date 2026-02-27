import type { Mode, ModeResolution } from './types';

const MODE_SET: ReadonlySet<string> = new Set(['live', 'demo', 'cache']);

export function normalizeMode(input?: string | null): Mode | undefined {
  if (!input) return undefined;
  return MODE_SET.has(input) ? (input as Mode) : undefined;
}

export function deriveModePolicy(input: {
  requestedMode?: string | null;
  envelopeMode?: string | null;
  liveFeedsEnabled?: boolean;
}): ModeResolution {
  const envelopeMode = normalizeMode(input.envelopeMode);
  if (envelopeMode) {
    return { mode: envelopeMode, source: 'today_payload' };
  }

  const requestedMode = normalizeMode(input.requestedMode);
  if (requestedMode === 'live' && input.liveFeedsEnabled === false) {
    return { mode: 'demo', source: 'request', reason: 'live_mode_disabled' };
  }

  if (requestedMode) {
    return { mode: requestedMode, source: 'request' };
  }

  return { mode: 'demo', source: 'default' };
}

export function getModePresentation(mode: Mode): { label: string; tooltip: string } {
  if (mode === 'demo') {
    return {
      label: 'Demo mode (live feeds off)',
      tooltip: 'Live provider feeds are disabled; deterministic demo board remains available.'
    };
  }
  if (mode === 'cache') {
    return {
      label: 'Cache',
      tooltip: 'Serving recent cached board data while live providers recover.'
    };
  }
  return {
    label: 'Live',
    tooltip: 'Live provider feeds are enabled for this board.'
  };
}
