'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClientRequestId } from '../core/identifiers/session';
import { runSeeLiveGamesAction } from '../core/live/liveActions';

export function MainNav() {
  const router = useRouter();

  const openLive = async () => {
    const outcome = await runSeeLiveGamesAction({ sport: 'NFL' });
    if (outcome.ok)
      router.push(`/live?sport=NFL&trace_id=${encodeURIComponent(createClientRequestId())}`);
  };

  return (
    <nav className="mb-5 flex items-center gap-3 text-sm">
      <Link href="/" className="rounded border border-slate-700 px-3 py-1.5">
        Home
      </Link>
      <Link href="/research" className="rounded border border-slate-700 px-3 py-1.5">
        Research
      </Link>
      <button type="button" onClick={openLive} className="rounded bg-cyan-600 px-3 py-1.5">
        See Live Games
      </button>
    </nav>
  );
}
