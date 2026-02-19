import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/src/lib/ui/cn';

const chipVariants = cva('ui-chip', {
  variants: {
    tone: {
      neutral: 'ui-tone-neutral',
      strong: 'ui-tone-strong',
      caution: 'ui-tone-caution',
      weak: 'ui-tone-weak'
    }
  },
  defaultVariants: {
    tone: 'neutral'
  }
});

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {}

export function Chip({ className, tone, ...props }: ChipProps) {
  return <span className={cn(chipVariants({ tone }), className)} {...props} />;
}

export { chipVariants };
