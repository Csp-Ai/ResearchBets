'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';
import { getSupabaseBrowserClient } from '@/src/core/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const nervous = useNervousSystem();

  const onMagicLink = async () => {
    setBusy(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Live auth unavailable (demo mode active).');
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + nervous.toHref('/profile') } });
    setMessage(error ? 'Could not send login link yet.' : 'Check your email for your secure login link.');
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <h1 className="text-2xl font-semibold">Login</h1>
      <Surface className="space-y-3">
        <p className="text-sm text-slate-300">Use a magic link to save uploads, settlements, and feedback.</p>
        <input className="w-full rounded border border-white/20 bg-slate-950 p-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        <Button intent="primary" disabled={!email || busy} onClick={() => void onMagicLink()}>{busy ? 'Sending…' : 'Send magic link'}</Button>
        {message ? <p className="text-xs text-slate-300">{message}</p> : null}
      </Surface>
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <Link href={appendQuery(nervous.toHref('/ingest'), { source: 'quick_upload' })}>Upload slip</Link>
        <span>•</span>
        <Link href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Tonight&apos;s Board</Link>
        <span>•</span>
        <button type="button" onClick={() => router.push(appendQuery(nervous.toHref('/cockpit'), { mode: 'demo' }))}>Try sample slip</button>
      </div>
    </div>
  );
}
