export default function UserProfilePage({ params }: { params: { username: string } }) {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">@{params.username}</h1>
      <p className="text-sm text-slate-300">Anonymous profile. Public picks and receipts only.</p>
      <div className="bettor-card p-4 text-sm text-slate-300">Recent shared ideas will appear here.</div>
    </section>
  );
}
