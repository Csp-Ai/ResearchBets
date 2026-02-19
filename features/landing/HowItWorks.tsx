const steps = [
  {
    icon: '🖼️',
    title: 'Upload Slip',
    body: 'Upload from FanDuel, PrizePicks, Kalshi.'
  },
  {
    icon: '🧠',
    title: 'Get Verdict',
    body: 'We auto-analyze every leg and identify the weakest link.'
  },
  {
    icon: '✍️',
    title: 'Fix & Track',
    body: 'Apply suggested edits and track outcomes over time.'
  }
];

export function HowItWorks() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">How it works</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.title} className="rounded border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-lg" aria-hidden="true">
              {step.icon}
            </p>
            <p className="mt-1 text-sm font-medium">{step.title}</p>
            <p className="mt-1 text-xs text-slate-400">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
