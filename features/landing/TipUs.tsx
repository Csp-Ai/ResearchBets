import Link from 'next/link';

export function TipUs() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold">Help us grow this research engine</h2>
      <p className="mt-1 text-sm text-slate-300">
        Support ongoing model improvements and bettor-first tooling.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="https://buymeacoffee.com"
          target="_blank"
          rel="noreferrer"
          className="rounded bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950"
        >
          ☕ Tip the Team
        </Link>
        <Link
          href="https://discord.com"
          target="_blank"
          rel="noreferrer"
          className="rounded border border-slate-600 px-4 py-2 text-sm"
        >
          Join Discord
        </Link>
      </div>
    </section>
  );
}
