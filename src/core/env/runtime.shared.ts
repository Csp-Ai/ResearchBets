export type RuntimeModeLabel = 'Live feeds on' | 'Demo mode (live feeds off)';
export type RuntimeModeBadgeLabel = RuntimeModeLabel | 'Live mode (some feeds unavailable)';

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

export const deriveRuntimeModeBadgeLabel = (input: {
  mode: 'demo' | 'live' | 'cache';
  hasPartialFeeds?: boolean;
}): RuntimeModeBadgeLabel => {
  if (input.mode !== 'live') return 'Demo mode (live feeds off)';
  return input.hasPartialFeeds ? 'Live mode (some feeds unavailable)' : 'Live feeds on';
};
