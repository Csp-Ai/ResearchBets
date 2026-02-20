import { notFound } from 'next/navigation';

import { MirrorPageClient } from './MirrorPageClient';

export default function MirrorPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <MirrorPageClient />;
}
