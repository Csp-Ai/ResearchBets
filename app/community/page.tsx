import Link from 'next/link';

const FEED = [
  { id: '1', user: 'DesertParlayKing', idea: 'Luka 8.5+ assists', receipt: 'Trend + matchup both point to playmaking volume.', reactions: 24 },
  { id: '2', user: 'LineMover27', idea: 'Tatum 28.5+ points', receipt: 'Usage plus opponent wing injuries create scoring runway.', reactions: 17 }
];

export default function CommunityPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">Community</h1>
        <p className="text-sm text-slate-300">Share ideas with receipts. No lock language, only research framing.</p>
      </header>
      <div className="space-y-3">
        {FEED.map((post) => (
          <article key={post.id} className="bettor-card p-4">
            <Link href={`/u/${post.user}`} className="text-sm text-cyan-300">@{post.user}</Link>
            <p className="mt-2 font-medium">{post.idea}</p>
            <p className="mt-1 text-sm text-slate-300">Receipt: {post.receipt}</p>
            <div className="mt-3 flex gap-2 text-xs"><button type="button" className="rounded border border-white/15 px-2 py-1">React ({post.reactions})</button><button type="button" className="rounded border border-white/15 px-2 py-1">Save</button><button type="button" className="rounded border border-white/15 px-2 py-1">Follow</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
