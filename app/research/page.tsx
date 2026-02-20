import { Suspense } from 'react';

import ResearchPageContent from '@/src/components/research/ResearchPageContent';

export default function ResearchPage() {
  return <Suspense fallback={null}><ResearchPageContent /></Suspense>;
}
