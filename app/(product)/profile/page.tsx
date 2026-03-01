'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';
import { getSupabaseBrowserClient } from '@/src/core/supabase/browser';

export default function ProfilePage() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const nervous = useNervousSystem();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus('Live profile sync unavailable (demo mode active).');
    }
  }, []);

  const onSave = async () => {
    const response = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error ?? 'Could not update username.');
      return;
    }
    setStatus(`Saved. Your profile is ready at /u/${username}`);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 py-6 pb-24">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Surface className="space-y-3">
        <p className="text-sm text-slate-300">Pick a username for your bettor profile.</p>
        <input className="w-full rounded border border-white/20 bg-slate-950 p-3" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" />
        <Button intent="primary" disabled={username.trim().length < 3} onClick={() => void onSave()}>Save username</Button>
        {status ? <p className="text-xs text-slate-300">{status}</p> : null}
      </Surface>
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/95 p-3">
        <div className="mx-auto flex max-w-md gap-2">
          <Link className="flex-1 rounded bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950" href={appendQuery(nervous.toHref('/ingest'), { from: 'profile' })}>Upload slip</Link>
          <Link className="flex-1 rounded border border-white/20 px-3 py-2 text-center text-sm" href={appendQuery(nervous.toHref('/history'), {})}>Open history</Link>
        </div>
      </div>
    </div>
  );
}
