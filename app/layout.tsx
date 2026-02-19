import type { Metadata } from 'next';

import { AppShell } from '@/src/components/terminal/AppShell';

import './globals.css';

export const metadata: Metadata = {
  title: 'ResearchBets V2',
  description: 'Anonymous-first AI sports betting research platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
