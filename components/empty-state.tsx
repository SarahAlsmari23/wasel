import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  icon?: LucideIcon
  action?: ReactNode
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="bg-surface flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-14 text-center">
      {Icon ? (
        <span className="bg-secondary/15 text-secondary flex h-11 w-11 items-center justify-center rounded-full">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-sm text-gray-600">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
