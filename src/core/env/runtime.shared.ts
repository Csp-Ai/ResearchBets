export type RuntimeModeLabel = 'Live feeds on' | 'Demo mode (live feeds off)';

export type RuntimeSharedFlags = {
  liveModeEnabled: boolean;
  demoModeDefault: boolean;
  modeLabel: RuntimeModeLabel;
};

export const deriveRuntimeSharedFlags = (input: { mode: 'demo' | 'live' | 'cache' }): RuntimeSharedFlags => {
  const liveModeEnabled = input.mode === 'live';
  return {
    liveModeEnabled,
    demoModeDefault: !liveModeEnabled,
    modeLabel: liveModeEnabled ? 'Live feeds on' : 'Demo mode (live feeds off)',
  };
};
