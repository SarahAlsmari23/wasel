import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  /** Small label above the title — usually the section the page belongs to. */
  eyebrow?: string
}

/**
 * Page title for the authenticated area. Deliberately frameless — the title
 * sits directly on the page, closed by a hairline — so the dashboard reads
 * with the same editorial rhythm as the public site's section headings,
 * instead of opening every page with another boxed card.
 */
export function PageHeader({ title, description, action, eyebrow }: PageHeaderProps) {
  return (
    <div className="border-border flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="text-heading text-2xl leading-tight font-semibold text-balance sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
