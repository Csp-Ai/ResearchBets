'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';
import { AppShellProduct } from '@/src/components/terminal/AppShellProduct';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <NervousSystemProvider>
      {isHome ? children : <AppShellProduct>{children}</AppShellProduct>}
    </NervousSystemProvider>
  );
}
