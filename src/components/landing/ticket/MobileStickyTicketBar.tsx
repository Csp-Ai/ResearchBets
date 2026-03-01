'use client';

type Props = {
  legCount: number;
  onOpen: () => void;
};

export function stickyCtaText(legCount: number) {
  if (legCount === 0) return 'Build from Board';
  if (legCount === 1) return 'Add 1 more leg';
  return 'Run Stress Test';
}

export function MobileStickyTicketBar({ legCount, onOpen }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/15 bg-slate-950/95 p-2 md:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <div className="flex-1 rounded-md border border-white/15 px-3 py-2 text-sm text-slate-100">Ticket ({legCount} legs)</div>
        <button aria-label="Open ticket drawer" onClick={onOpen} className="min-h-11 rounded-md bg-cyan-300 px-3 text-sm font-semibold text-slate-950">{stickyCtaText(legCount)}</button>
      </div>
    </div>
  );
}
