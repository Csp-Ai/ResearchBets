'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { HabitLoopTracker } from '@/src/components/analytics/HabitLoopTracker';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

const AppShellProduct = dynamic(
  () => import('@/src/components/terminal/AppShellProduct').then((mod) => mod.AppShellProduct),
  { ssr: false },
);

export function ProductShellClient({ children }: { children: ReactNode }) {
  return (
    <NervousSystemProvider>
      <HabitLoopTracker />
      <AppShellProduct>{children}</AppShellProduct>
    </NervousSystemProvider>
  );
}
