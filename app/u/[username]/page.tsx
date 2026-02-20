'use client';

import { useEffect, useState } from 'react';

type ProfilePayload = {
  profile: { username: string; avatarUrl?: string | null; joinedAt: string };
  historicalBets: Array<{ id: string; slipText: string; outcome: string; closingLine?: string | null; createdAt: string }>;
};

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/u/${params.username}`)
      .then(async (res) => {
        if (res.status === 404) {
          setMissing(true);
          return null;
        }
        return (await res.json()) as ProfilePayload;
      })
      .then((data) => {
        if (data) setPayload(data);
      });
  }, [params.username]);

  if (missing) return <p className="text-sm text-slate-300">Profile not found.</p>;
  if (!payload) return <p className="text-sm text-slate-300">Loading profile…</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">@{payload.profile.username}</h1>
      <p className="text-sm text-slate-300">Joined {new Date(payload.profile.joinedAt).toLocaleDateString()}</p>
      <div className="space-y-2">
        {payload.historicalBets.map((bet) => (
          <article key={bet.id} className="bettor-card p-4">
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{bet.slipText}</p>
            <p className="mt-2 text-xs text-slate-400">Outcome: {bet.outcome} • {new Date(bet.createdAt).toLocaleString()}</p>
          </article>
        ))}
        {payload.historicalBets.length === 0 ? <p className="text-sm text-slate-400">No recent bets shared.</p> : null}
      </div>
    </section>
  );
}
