import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'danger'
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'completed'
  | 'pending'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  neutral: 'bg-primary/6 text-muted-foreground',
  danger: 'bg-danger/10 text-danger',
  draft: 'bg-status-draft/12 text-status-draft',
  ready: 'bg-status-ready/14 text-status-ready',
  submitted: 'bg-status-submitted/12 text-status-submitted',
  completed: 'bg-status-completed/12 text-status-completed',
  pending: 'bg-status-pending/12 text-status-pending',
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.neutral,
        className,
      )}
    >
      {children}
    </span>
  )
}
