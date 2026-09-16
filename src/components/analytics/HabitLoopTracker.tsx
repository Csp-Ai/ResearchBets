'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import {
  canonicalStageForPath,
  emitHabitStageView,
  type CanonicalLifecycleStage,
} from '@/src/core/analytics/habitLoop';

export function HabitLoopTracker() {
  const pathname = usePathname();
  const nervous = useNervousSystem();
  const previousStage = useRef<CanonicalLifecycleStage | null>(null);

  useEffect(() => {
    const stage = canonicalStageForPath(pathname);
    if (!stage) return;

    void emitHabitStageView({
      pathname,
      stage,
      spine: nervous,
      previousStage: previousStage.current,
    });
    previousStage.current = stage;
  }, [
    pathname,
    nervous.date,
    nervous.mode,
    nervous.slip_id,
    nervous.sport,
    nervous.ticketId,
    nervous.trace_id,
    nervous.tz,
  ]);

  return null;
}
