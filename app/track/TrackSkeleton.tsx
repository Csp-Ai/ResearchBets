export function TrackSkeleton() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20">
      <header className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="h-3 w-48 animate-pulse rounded bg-slate-700" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-slate-700" />
        <div className="h-3 w-72 animate-pulse rounded bg-slate-800" />
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-700" />
        <ul className="mt-3 space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <li key={`track-skeleton-${index + 1}`} className="space-y-2 rounded border border-slate-700 p-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
              <div className="h-2 w-10/12 animate-pulse rounded bg-slate-800" />
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
