import type { ReadonlyURLSearchParams } from 'next/navigation';

export type LandingMode = 'demo' | 'live';

export function getModeFromSearchParams(searchParams: ReadonlyURLSearchParams | null): LandingMode {
  if (searchParams?.get('demo') === '1') return 'demo';
  return 'live';
}
