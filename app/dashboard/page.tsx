import Link from 'next/link';

export default function DashboardPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-slate-400">Dashboard is now secondary. Your primary workflow is Analyze and Build Slip.</p>
      <div>
        <Link href="/discover" className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-slate-950">Open Build Slip</Link>
      </div>
    </section>
  );
}
