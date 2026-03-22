import { CanonicalLanding as CanonicalLandingImpl } from '@/app/_components/CanonicalLanding';

type SearchParams = Record<string, string | string[] | undefined>;

function CanonicalLanding({ searchParams }: { searchParams?: SearchParams }) {
  return <CanonicalLandingImpl searchParams={searchParams} />;
}

export default function HomePage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  return <CanonicalLanding searchParams={searchParams} />;
}
