'use client';

import { useEffect, useRef } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { StressResult } from '@/src/components/landing/stressTest';

type Props = {
  open: boolean;
  slip: SlipBuilderLeg[];
  stress: StressResult | null;
  running: boolean;
  onClose: () => void;
  onRemoveLeg: (id: string) => void;
  onRunStress: () => void;
  onSave: () => void;
};

export function TicketBottomSheet({ open, slip, stress, running, onClose, onRemoveLeg, onRunStress, onSave }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ticket drawer"
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl border-t border-white/20 bg-slate-950 p-3"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientY ?? 0;
          if (touchStart.current && end - touchStart.current > 80) onClose();
        }}
      >
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/30" />
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Ticket</h3>
          <button onClick={onClose} aria-label="Close ticket drawer" className="min-h-11 rounded border border-white/20 px-3 text-xs text-slate-100">Close</button>
        </div>
        <div className="space-y-2">
          {slip.length === 0 ? <p className="text-xs text-slate-400">Add legs from board to begin.</p> : null}
          {slip.map((leg) => <div key={leg.id} className="flex items-center justify-between rounded border border-white/10 p-2 text-xs text-slate-100"><span>{leg.player} {leg.line} {leg.marketType.toUpperCase()}</span><button onClick={() => onRemoveLeg(leg.id)} className="min-h-11 px-2">Remove</button></div>)}
        </div>
        <button onClick={onRunStress} disabled={slip.length < 2 || running} className="mt-3 min-h-11 w-full rounded bg-cyan-300 text-sm font-semibold text-slate-950 disabled:opacity-60">{running ? 'Analyzing…' : 'Run Stress Test'}</button>
        {stress ? <div className="mt-3 space-y-1 rounded border border-cyan-300/30 bg-cyan-400/10 p-2 text-xs text-slate-100"><p>Weakest leg: {stress.weakestLegLabel}</p><p>Correlation pressure: {stress.correlationPressure}</p><p>Fragility: {stress.fragility}</p><p>{stress.reason}</p>{stress.marketDeviation ? <p>Market deviation: {stress.marketDeviation}</p> : null}<button onClick={onSave} className="min-h-11 rounded border border-white/20 px-2">Save analysis</button></div> : null}
      </div>
    </div>
  );
}
