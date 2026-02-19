'use client';

import type { SlipLeg } from './bettorDerivations';

import { useDialogA11y } from '@/src/components/shared/useDialogA11y';

export function removeWeakestLeg(legs: SlipLeg[]): SlipLeg[] {
  if (legs.length <= 1) return legs;
  return legs.slice(0, -1);
}

export function toTwoLegSlip(legs: SlipLeg[]): SlipLeg[] {
  if (legs.length <= 2) return legs;
  return legs.slice(0, 2);
}

export function FixSlipDrawer({ open, legs, onClose, onLegsChange, onRerunResearch }: { open: boolean; legs: SlipLeg[]; onClose: () => void; onLegsChange: (legs: SlipLeg[]) => void; onRerunResearch: () => void }) {
  const drawerRef = useDialogA11y(open, onClose);
  if (!open) return null;

  return (
    <aside ref={drawerRef} role="dialog" aria-modal="true" aria-label="Fix slip drawer" tabIndex={-1} className="rounded-xl border border-slate-700 bg-slate-950/95 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Fix Slip</h3>
        <button type="button" aria-label="Close fix slip drawer" onClick={onClose} className="text-xs text-slate-400">Close</button>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <button type="button" className="w-full rounded border border-rose-500/50 px-2 py-1 text-left" onClick={() => onLegsChange(removeWeakestLeg(legs))}>Remove weakest leg</button>
        <button type="button" className="w-full rounded border border-amber-500/50 px-2 py-1 text-left" onClick={() => onLegsChange(legs.map((leg, index) => index === legs.length - 1 ? { ...leg, line: leg.line ? `${leg.line} alt` : 'alt line' } : leg))}>Swap volatile line</button>
        <button type="button" className="w-full rounded border border-cyan-500/50 px-2 py-1 text-left" onClick={() => onLegsChange(toTwoLegSlip(legs))}>Convert to 2-leg</button>
      </div>
      <button type="button" className="mt-3 w-full rounded bg-cyan-600 px-3 py-2 text-xs font-medium" onClick={onRerunResearch}>Rerun Research</button>
    </aside>
  );
}
