import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const ProductShellClient = dynamic(() => import('@/app/(product)/ProductShellClient').then((mod) => mod.ProductShellClient), {
  ssr: false,
});

export function ProductShell({ children }: { children: ReactNode }) {
  return <ProductShellClient>{children}</ProductShellClient>;
}
