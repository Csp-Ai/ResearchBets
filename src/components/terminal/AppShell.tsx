'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

const AppShellProduct = dynamic(
  () => import('@/src/components/terminal/AppShellProduct').then((mod) => mod.AppShellProduct),
  { ssr: false },
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) return <>{children}</>;

  return <NervousSystemProvider><AppShellProduct>{children}</AppShellProduct></NervousSystemProvider>;
}
