'use client';

export function SaveAnalysisModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg border border-white/20 bg-slate-950 p-4"><h3 className="text-sm font-semibold text-slate-100">Analysis saved</h3><p className="mt-2 text-xs text-slate-300">Your run notes are stored for later review.</p><button onClick={onClose} className="mt-3 min-h-11 rounded border border-white/20 px-3 text-xs text-slate-100">Close</button></div></div>;
}
