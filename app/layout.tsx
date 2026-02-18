import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'ResearchBets V2',
  description: 'Anonymous-first AI sports betting research platform.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
