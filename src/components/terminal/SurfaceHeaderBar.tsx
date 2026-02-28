'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { listGuardrails } from '@/src/core/guardrails/localGuardrails';

const LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: '/today', label: 'Today' },
  { prefix: '/slip', label: 'Slip' },
  { prefix: '/track', label: 'Track' },
  { prefix: '/review', label: 'Review' },
  { prefix: '/stress-test', label: 'Analyze' }
];

export function SurfaceHeaderBar() {
  const pathname = usePathname();
  const nervous = useNervousSystem();
  const [hasGuardrail, setHasGuardrail] = useState(false);

  const label = useMemo(() => LABELS.find((item) => pathname?.startsWith(item.prefix))?.label, [pathname]);

  useEffect(() => {
    const sync = () => setHasGuardrail(listGuardrails().length > 0);
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const sync = () => setHasGuardrail(listGuardrails().length > 0);
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  if (!label) return null;

  return (
    <div className="sticky top-2 z-30 mb-3 rounded-lg border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">ResearchBets</p>
        <p className="text-xs font-medium text-slate-200">{label}</p>
        <div className="flex items-center gap-1">
          <span className="rounded border border-cyan-300/40 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] uppercase text-cyan-100">{nervous.mode}</span>
          {hasGuardrail ? <span className="rounded border border-amber-300/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase text-amber-100">Guardrail</span> : null}
        </div>
      </div>
    </div>
  );
}
