'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readCoverageAgentEnabled, readDeveloperMode, writeCoverageAgentEnabled, writeDeveloperMode } from '@/src/core/ui/preferences';

type ProviderStatus = { stats: string; odds: string; injuries: string };

export default function SettingsPage() {
  const [developerMode, setDeveloperMode] = useState(false);
  const [coverageAgentEnabled, setCoverageAgentEnabled] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    setCoverageAgentEnabled(readCoverageAgentEnabled());
    void fetch('/api/bettor-data').then((res) => res.json()).then((payload) => setProviderStatus(payload.providerStatus as ProviderStatus));
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-400">Control app behavior and data connections.</p>
      </header>

      <div className="bettor-card p-5">
        <h2 className="text-lg font-semibold">Provider connections</h2>
        <p className="mt-1 text-sm text-slate-400">Missing keys automatically use demo fixtures without scary errors.</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Stats: {providerStatus?.stats ?? 'loading'}</li>
          <li>Odds: {providerStatus?.odds ?? 'loading'}</li>
          <li>Injuries: {providerStatus?.injuries ?? 'loading'}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">Connect data source by setting SPORTSDATAIO_API_KEY and ODDS_API_KEY in your environment.</p>
      </div>

      <div className="bettor-card p-5">
        <h2 className="text-lg font-semibold">Developer Mode</h2>
        <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={developerMode} onChange={(event) => { setDeveloperMode(event.target.checked); writeDeveloperMode(event.target.checked); }} />Enable Developer Mode</label>
        <div className="mt-3 text-sm">{developerMode ? <Link href="/traces" className="text-cyan-300 underline">Open traces</Link> : 'Traces hidden until enabled.'}</div>
      </div>

      <div className="bettor-card p-5">
        <h2 className="text-lg font-semibold">Research context</h2>
        <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={coverageAgentEnabled} onChange={(event) => { setCoverageAgentEnabled(event.target.checked); writeCoverageAgentEnabled(event.target.checked); }} />Optional unverified web notes</label>
      </div>
    </section>
  );
}
