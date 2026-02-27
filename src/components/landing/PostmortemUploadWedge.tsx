'use client';

import React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { detectSlip as detectFanDuel, parseSlip as parseFanDuel } from '@/src/core/postmortem/parsers/fanduel';
import { detectSlip as detectKalshi, parseSlip as parseKalshi } from '@/src/core/postmortem/parsers/kalshi';
import { detectSlip as detectPrizePicks, parseSlip as parsePrizePicks } from '@/src/core/postmortem/parsers/prizepicks';
import type { ParsedSlip } from '@/src/core/postmortem/types';

export function PostmortemUploadWedge() {
  const nervous = useNervousSystem();
  const [text, setText] = useState('');

  const parsed = useMemo((): ParsedSlip | null => {
    if (!text.trim()) return null;
    if (detectFanDuel(text)) return parseFanDuel(text);
    if (detectPrizePicks(text)) return parsePrizePicks(text);
    if (detectKalshi(text)) return parseKalshi(text);
    return null;
  }, [text]);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="postmortem-upload-wedge">
      <h2 className="text-sm font-semibold">Upload a slip. Get a post-mortem.</h2>
      <p className="mt-1 text-sm text-slate-300">FanDuel / PrizePicks / Kalshi — we&apos;ll find the weakest leg and what you missed.</p>
      <div className="mt-3 rounded-lg border border-dashed border-white/20 bg-slate-950/50 p-3 text-xs text-slate-400">
        Drop slip text here (MVP supports paste) or paste into the box below.
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste slip text"
        className="mt-3 min-h-24 w-full rounded-md border border-white/15 bg-slate-950/70 p-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        aria-label="Paste slip text"
      />
      {parsed ? <p className="mt-2 text-xs text-cyan-200">Detected: {parsed.book}</p> : <p className="mt-2 text-xs text-slate-400">Detected: —</p>}
      {parsed?.legs.length ? (
        <div className="mt-2 overflow-x-auto rounded-md border border-white/10">
          <table className="w-full min-w-[420px] text-left text-xs text-slate-200">
            <thead className="bg-slate-900/70 text-slate-400">
              <tr>
                <th className="px-2 py-1.5 font-medium">Player/Market</th>
                <th className="px-2 py-1.5 font-medium">Line</th>
                <th className="px-2 py-1.5 font-medium">Odds</th>
              </tr>
            </thead>
            <tbody>
              {parsed.legs.map((leg, index) => (
                <tr key={`${leg.player}-${index}`} className="border-t border-white/10">
                  <td className="px-2 py-1.5">{leg.player} · {leg.market}</td>
                  <td className="px-2 py-1.5">{leg.line ?? '—'}</td>
                  <td className="px-2 py-1.5">{leg.odds ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Link
        href={appendQuery(nervous.toHref('/stress-test'), { postmortem: 1, source: 'landing_wedge', book: parsed?.book })}
        className="mt-3 inline-block rounded-md border border-cyan-300/60 bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
      >
        Run post-mortem →
      </Link>
    </section>
  );
}
