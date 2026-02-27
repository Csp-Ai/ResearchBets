import 'server-only';

import type { BoardSport } from '@/src/core/board/boardService.server';
import type { TodayPayload } from './types';
import { resolveTodayTruth } from './service.server';

export type ResolveTodayOptions = {
  forceRefresh?: boolean;
  sport?: BoardSport;
  date?: string;
  tz?: string;
  mode?: TodayPayload['mode'];
  strictLive?: boolean;
};

export async function resolveToday(options?: ResolveTodayOptions): Promise<TodayPayload> {
  return resolveTodayTruth(options);
}
