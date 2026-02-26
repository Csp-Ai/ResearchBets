import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { LandingMode } from '@/src/core/landing/live';

export function getModeFromSearchParams(searchParams: ReadonlyURLSearchParams | null): LandingMode {
  return searchParams?.get('live') === '1' ? 'live' : 'demo';
}
