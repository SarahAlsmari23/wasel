import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-surface/60 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="bg-secondary/12 text-secondary flex h-12 w-12 items-center justify-center rounded-2xl">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-foreground text-base font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
