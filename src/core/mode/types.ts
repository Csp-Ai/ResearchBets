export type Mode = 'live' | 'demo' | 'cache';

export type ModeSource = 'request' | 'today_payload' | 'local_storage' | 'default';

export type ModeResolution = {
  mode: Mode;
  source: ModeSource;
  reason?: string;
};
