'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readCoverageAgentEnabled, readDeveloperMode, writeCoverageAgentEnabled, writeDeveloperMode } from '@/src/core/ui/preferences';

export default function SettingsPage() {
  const [developerMode, setDeveloperMode] = useState(false);
  const [coverageAgentEnabled, setCoverageAgentEnabled] = useState(false);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    setCoverageAgentEnabled(readCoverageAgentEnabled());
  }, []);

  const onToggle = (value: boolean) => {
    setDeveloperMode(value);
    writeDeveloperMode(value);
  };

  const onCoverageToggle = (value: boolean) => {
    setCoverageAgentEnabled(value);
    writeCoverageAgentEnabled(value);
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-400">Control what you see in the app.</p>
      </header>

      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold">Developer Mode</h2>
        <p className="mt-1 text-sm text-slate-400">Show run details, traces, and diagnostics tools.</p>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={developerMode} onChange={(event) => onToggle(event.target.checked)} />
          Enable Developer Mode
        </label>
        <div className="mt-4 text-sm">
          {developerMode ? <Link href="/traces" className="text-cyan-300 underline">Open Run details</Link> : <p className="text-slate-500">Run details are hidden until Developer Mode is enabled.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold">Research context</h2>
        <p className="mt-1 text-sm text-slate-400">Control whether optional unverified web notes are included during analysis.</p>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={coverageAgentEnabled} onChange={(event) => onCoverageToggle(event.target.checked)} />
          Unverified web notes (optional)
        </label>
      </div>
    </section>
  );
}
