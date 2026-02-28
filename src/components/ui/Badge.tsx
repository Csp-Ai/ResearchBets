import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/src/lib/ui/cn';

const badgeVariants = cva('inline-flex items-center rounded-md border font-medium tracking-wide', {
  variants: {
    size: {
      sm: 'px-1.5 py-0.5 text-[10px]',
      md: 'px-2 py-0.5 text-[11px]'
    },
    variant: {
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      warning: 'border-amber-400/35 bg-amber-400/10 text-amber-100',
      danger: 'border-rose-500/35 bg-rose-500/10 text-rose-100',
      neutral: 'border-white/12 bg-white/[0.04] text-slate-300',
      info: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100'
    }
  },
  defaultVariants: {
    size: 'md',
    variant: 'neutral'
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn('mono-number', badgeVariants({ variant, size }), className)} {...props} />;
}
