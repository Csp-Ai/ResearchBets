'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

const AppShellProduct = dynamic(
  () => import('@/src/components/terminal/AppShellProduct').then((mod) => mod.AppShellProduct),
  { ssr: false },
);

export function ProductShell({ children }: { children: ReactNode }) {
  return (
    <NervousSystemProvider>
      <AppShellProduct>{children}</AppShellProduct>
    </NervousSystemProvider>
  );
}
