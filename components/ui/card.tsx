import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds the shared hover lift used by every clickable card in the app. */
  interactive?: boolean
}

export function Card({ interactive = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border-border shadow-soft rounded-2xl border p-6',
        interactive && 'hover:shadow-lift transition-all duration-200 hover:-translate-y-0.5',
        className,
      )}
      {...props}
    />
  )
}
