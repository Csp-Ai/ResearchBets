'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readCoverageAgentEnabled, readDeveloperMode, writeCoverageAgentEnabled, writeDeveloperMode } from '@/src/core/ui/preferences';

type ProviderStatus = { stats: string; odds: string; injuries: string };
type HealthStatus = { ok: boolean; missing?: string[]; hint?: string };

export default function SettingsPage() {
  const [developerMode, setDeveloperMode] = useState(false);
  const [coverageAgentEnabled, setCoverageAgentEnabled] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    setCoverageAgentEnabled(readCoverageAgentEnabled());
    void fetch('/api/bettor-data').then((res) => res.json()).then((payload) => setProviderStatus(payload.providerStatus as ProviderStatus));
    void fetch('/api/health').then((res) => res.json()).then((payload) => setHealthStatus(payload as HealthStatus)).catch(() => setHealthStatus(null));
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-400">Control app behavior and data connections.</p>
      </header>


      {process.env.NODE_ENV === 'development' && healthStatus && !healthStatus.ok ? (
        <div className="bettor-card border-amber-500/40 p-5">
          <h2 className="text-lg font-semibold text-amber-200">Local setup needed</h2>
          <p className="mt-1 text-sm text-amber-100/80">{healthStatus.hint ?? 'Finish env setup to enable all services.'}</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-100/90">
            {(healthStatus.missing ?? []).map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bettor-card p-5">
        <h2 className="text-lg font-semibold">Provider connections</h2>
        <p className="mt-1 text-sm text-slate-400">Missing keys automatically use demo fixtures without scary errors.</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Stats: {providerStatus?.stats ?? 'loading'}</li>
          <li>Odds: {providerStatus?.odds ?? 'loading'}</li>
          <li>Injuries: {providerStatus?.injuries ?? 'loading'}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">Connect data source by setting SPORTSDATA_API_KEY and ODDS_API_KEY in your environment.</p>
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
