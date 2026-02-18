'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { createClientRequestId } from '../core/identifiers/session';
import { runUiAction } from '../core/ui/actionContract';
import { buildNavigationHref } from '../core/ui/navigation';

export function MainNav() {
  const router = useRouter();
  const search = useSearchParams();
  const traceId = useMemo(() => search.get('trace_id') ?? '', [search]);
  const navigationTraceId = useMemo(() => traceId || createClientRequestId(), [traceId]);

  const navigateWithAction = async (actionName: string, href: string) => {
    const outcome = await runUiAction({
      actionName,
      traceId: navigationTraceId,
      execute: async () => {
        router.push(href);
        return { ok: true, source: 'live' as const };
      }
    });
    return outcome.ok;
  };

  const openHome = () => {
    void navigateWithAction('open_home', '/');
  };

  const openResearch = () => {
    void navigateWithAction('open_research', buildNavigationHref({ pathname: '/research', traceId: navigationTraceId }));
  };

  const openLive = () => {
    void navigateWithAction(
      'see_live_games',
      buildNavigationHref({ pathname: '/live', traceId: navigationTraceId, params: { sport: 'NFL' } })
    );
  };

  return (
    <nav className="mb-5 flex items-center gap-3 text-sm">
      <button
        type="button"
        onClick={openHome}
        className="rounded border border-slate-700 px-3 py-1.5"
      >
        Home
      </button>
      <button
        type="button"
        onClick={openResearch}
        className="rounded border border-slate-700 px-3 py-1.5"
      >
        Research
      </button>
      <button type="button" onClick={openLive} className="rounded bg-cyan-600 px-3 py-1.5">
        See Live Games
      </button>
    </nav>
  );
}
