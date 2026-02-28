import * as React from 'react';

import { cn } from '@/src/lib/ui/cn';

export function CardSurface({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/5 bg-gradient-to-b from-[#0A1220] to-[#0E1628] shadow-[0_10px_28px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.04]',
        className
      )}
      {...props}
    />
  );
}
