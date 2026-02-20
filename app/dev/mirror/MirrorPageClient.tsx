'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { readDeveloperMode } from '@/src/core/ui/preferences';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const extractDiff = (value: string): string | null => {
  const match = value.match(/```diff\n([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? null;
};

const extractSources = (value: string): string[] => {
  const marker = value.lastIndexOf('Sources');
  if (marker < 0) return [];

  return value
    .slice(marker)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, ''));
};

export function MirrorPageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [pathPrefix, setPathPrefix] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastIndexedAt, setLastIndexedAt] = useState<string | null>(null);

  const developerMode = useMemo(() => readDeveloperMode(), []);

  const loadStatus = async () => {
    const response = await fetch('/api/dev/mirror/status');
    if (!response.ok) {
      throw new Error('Unable to load index status.');
    }

    const payload = (await response.json()) as { lastIndexedAt?: string | null };
    setLastIndexedAt(payload.lastIndexedAt ?? null);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || status === 'loading') return;

    setError(null);
    setStatus('loading');
    setText('');

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: message }, { role: 'assistant', content: '' }];
    setMessages(nextMessages);

    try {
      const response = await fetch('/api/dev/mirror/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, pathPrefix: pathPrefix.trim() || undefined, topK: 5 })
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Mirror request failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistant = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        setMessages((current) => {
          const copy = [...current];
          copy[copy.length - 1] = { role: 'assistant', content: assistant };
          return copy;
        });
      }

      setStatus('idle');
      await loadStatus();
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Unknown error');
    }
  };

  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')?.content ?? '';
  const suggestedDiff = extractDiff(latestAssistant);
  const sources = extractSources(latestAssistant);

  if (!developerMode) {
    return <p className="text-sm text-slate-300">Enable Developer Mode in settings to access /dev/mirror.</p>;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-xl shadow-black/20">
        <h1 className="mb-1 text-2xl font-semibold text-slate-100">Project Mirror Control Room</h1>
        <p className="mb-4 text-sm text-slate-400">Internal, read-only code librarian for architecture questions and patch drafts.</p>

        <div className="mb-4 max-h-[500px] space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          {messages.length === 0 ? <p className="text-sm text-slate-400">Ask about code structure, API routes, or guardrails.</p> : null}
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={message.role === 'user' ? 'text-right' : 'text-left'}>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{message.role}</p>
              <pre className="inline-block max-w-full whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                {message.content}
              </pre>
            </article>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={pathPrefix}
            onChange={(event) => setPathPrefix(event.target.value)}
            placeholder="Optional path prefix (e.g., app/api)"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500 focus:ring"
          />
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ask Mirror…"
            className="min-h-28 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500 focus:ring"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Thinking…' : 'Send'}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Index Status</h2>
          <p className="mt-2 text-sm text-slate-400">{lastIndexedAt ? `Last indexed: ${new Date(lastIndexedAt).toLocaleString()}` : 'No chunks indexed yet.'}</p>
          <p className="mt-2 rounded bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">npm run dev:mirror:index</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Sources</h2>
          <ul className="mt-2 space-y-2 text-xs text-slate-300">
            {sources.length === 0 ? <li>No sources in latest answer yet.</li> : null}
            {sources.map((source) => (
              <li key={source} className="rounded border border-slate-800 bg-slate-900 p-2">
                <p className="break-all">{source}</p>
                <button
                  className="mt-2 rounded bg-slate-700 px-2 py-1 text-[11px]"
                  onClick={() => navigator.clipboard.writeText(source)}
                  type="button"
                >
                  Copy Path
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Suggested Patch</h2>
          {suggestedDiff ? (
            <>
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-slate-800 bg-slate-900 p-2 text-xs text-slate-100">{suggestedDiff}</pre>
              <button
                className="mt-2 rounded bg-slate-700 px-2 py-1 text-[11px]"
                onClick={() => navigator.clipboard.writeText(suggestedDiff)}
                type="button"
              >
                Copy Diff
              </button>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No diff block detected.</p>
          )}
        </div>
      </aside>
    </section>
  );
}
