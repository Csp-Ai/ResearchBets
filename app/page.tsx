import { BoardPreviewSSR, getLandingSpineFromSearch } from '@/src/components/landing/BoardPreviewSSR';

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  const spine = getLandingSpineFromSearch(searchParams);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ResearchBets</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Tonight&apos;s Board / Scout Cards in seconds.</h1>
          <p className="max-w-2xl text-sm text-slate-300">Build from real board context, then stress-test your slip with deterministic fallback when live feeds are off.</p>
        </div>
        <BoardPreviewSSR spine={spine} />
      </section>
    </main>
  );
}
