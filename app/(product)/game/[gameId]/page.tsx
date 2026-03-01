import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { toHref } from '@/src/core/nervous/routes';
import { normalizeSpine } from '@/src/core/nervous/spine';

type GamePageProps = {
  params: { gameId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

const readFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default function GameContextPage({ params, searchParams }: GamePageProps) {
  const highlight = readFirst(searchParams?.highlight);
  const spine = normalizeSpine({
    trace_id: readFirst(searchParams?.trace_id),
    sport: readFirst(searchParams?.sport),
    tz: readFirst(searchParams?.tz),
    date: readFirst(searchParams?.date),
    mode: readFirst(searchParams?.mode),
    tab: readFirst(searchParams?.tab)
  });

  const controlHref = appendQuery(toHref('/control', spine, { tab: 'live' }), {
    gameId: params.gameId,
    highlight
  });

  return (
    <main style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
      <h1 style={{ margin: 0 }}>Game context: {params.gameId}</h1>
      <p style={{ margin: 0, opacity: 0.85 }}>Live focus surface for cockpit click-through.</p>
      {highlight ? (
        <div style={{ border: '1px solid rgba(0, 229, 200, 0.7)', padding: '0.75rem', borderRadius: '0.5rem' }}>
          Highlighted prop: <strong>{highlight}</strong>
        </div>
      ) : null}
      <Link href={controlHref}>Open full live board</Link>
    </main>
  );
}
