'use client';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

export function LiveTruthGuard() {
  const nervous = useNervousSystem();
  if (nervous.mode !== 'live') return null;

  return (
    <style jsx global>{`
      [data-testid='open-tickets-panel'] {
        display: none !important;
      }
    `}</style>
  );
}
