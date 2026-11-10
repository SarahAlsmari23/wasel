import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-heading text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
