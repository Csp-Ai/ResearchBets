'use client';

export function AfterPreviewMini() {
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-slate-900/70 p-3" data-testid="after-preview-mini">
      <p className="text-sm font-medium text-slate-100">AFTER preview</p>
      <p className="mt-2 text-xs text-slate-300"><span className="text-slate-100">Lesson:</span> weakest leg broke after pace dropped in Q4.</p>
      <p className="mt-1 text-xs text-slate-300"><span className="text-slate-100">Next time:</span> trim one high-correlation leg before lock.</p>
    </div>
  );
}
