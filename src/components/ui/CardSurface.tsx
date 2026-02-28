import * as React from 'react';

import { cn } from '@/src/lib/ui/cn';

export function CardSurface({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'panel-shell',
        className
      )}
      {...props}
    />
  );
}
