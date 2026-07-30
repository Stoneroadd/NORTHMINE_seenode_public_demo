import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium leading-none tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border-mid bg-elevated text-text-secondary',
        signal: 'border-transparent bg-signal/15 text-signal',
        success: 'border-transparent bg-success/15 text-success',
        warning: 'border-transparent bg-warning/15 text-warning',
        critical: 'border-transparent bg-critical/15 text-critical',
        info: 'border-transparent bg-info/15 text-info',
        outline: 'border-border-mid text-text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
