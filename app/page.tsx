import { CanonicalLanding } from '@/app/_components/CanonicalLanding';

export default function HomePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <CanonicalLanding searchParams={searchParams} />;
}
