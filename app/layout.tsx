import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed, DM_Mono } from 'next/font/google';

import { AppShell } from '@/src/components/terminal/AppShell';

import './globals.css';

const dmMono = DM_Mono({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-dm-mono' });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-barlow' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-barlow-condensed' });

export const metadata: Metadata = {
  title: 'ResearchBets — Build. Check. Improve.',
  description: 'Anonymous-first AI sports betting research platform.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmMono.variable} ${barlow.variable} ${barlowCondensed.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
