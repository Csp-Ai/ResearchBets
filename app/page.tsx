type SearchParams = Record<string, string | string[] | undefined>;

function CanonicalLanding({ searchParams }: { searchParams?: SearchParams }) {
  const { CanonicalLanding: CanonicalLandingImpl } = require('@/app/_components/CanonicalLanding') as typeof import('@/app/_components/CanonicalLanding');
  return <CanonicalLandingImpl searchParams={searchParams} />;
}

export default function HomePage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  return <CanonicalLanding searchParams={searchParams} />;
}
