import type { HTMLAttributes } from 'react';

import { cn } from '@/src/lib/ui/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rb-skeleton rounded-md', className)} aria-hidden {...props} />;
}
