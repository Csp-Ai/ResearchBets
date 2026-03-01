import { Suspense } from 'react';

import { ControlPageClient } from './ControlPageClient';

export default function ControlRoomPage() {
  return (
    <Suspense fallback={<section className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">Loading control room…</section>}>
      <ControlPageClient />
    </Suspense>
  );
}
