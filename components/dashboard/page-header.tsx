import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

/**
 * Page title band for the authenticated area. Carries a quiet slice of the
 * landing page's network artwork (`wasel-brand-band`) so every dashboard page
 * reads as part of the same product — behind the heading only, never behind
 * data.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="wasel-brand-band border-border shadow-soft flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-5 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-heading text-2xl font-semibold text-balance">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
