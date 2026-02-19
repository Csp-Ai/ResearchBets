import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/src/lib/ui/cn';

const buttonVariants = cva('ui-button', {
  variants: {
    intent: {
      primary: 'ui-button-primary',
      secondary: 'ui-button-secondary'
    }
  },
  defaultVariants: {
    intent: 'primary'
  }
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, intent, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ intent }), className)} {...props} />;
}

export { buttonVariants };
