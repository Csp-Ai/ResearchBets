'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readDeveloperMode } from '@/src/core/ui/preferences';

export default function DevDashboardPage() {
  const [developerMode, setDeveloperMode] = useState(false);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
  }, []);

  if (!developerMode) {
    return <p className="text-sm text-slate-300">Enable Developer Mode in settings to access /dev/dashboard.</p>;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
      <h1 className="text-2xl font-semibold">Developer Dashboard</h1>
      <p className="text-sm text-slate-400">Legacy operational diagnostics live here.</p>
      <Link href="/traces" className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-slate-950">Open traces</Link>
    </section>
  );
}
