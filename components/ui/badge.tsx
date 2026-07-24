import type { ReactNode } from 'react'

type BadgeVariant = 'primary' | 'secondary' | 'neutral' | 'danger'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  neutral: 'bg-gray-100 text-gray-600',
  danger: 'bg-danger/10 text-danger',
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
