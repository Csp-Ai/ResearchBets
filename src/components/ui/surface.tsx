import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/src/lib/ui/cn';

const surfaceVariants = cva('', {
  variants: {
    kind: {
      card: 'ui-surface-card',
      hero: 'ui-surface-hero',
      panel: 'ui-surface-panel',
      ghost: 'ui-surface-ghost'
    }
  },
  defaultVariants: {
    kind: 'card'
  }
});

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof surfaceVariants> {}

export function Surface({ className, kind, ...props }: SurfaceProps) {
  return <div className={cn(surfaceVariants({ kind }), className)} {...props} />;
}

export { surfaceVariants };
