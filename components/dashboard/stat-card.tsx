import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n/config'
import { formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  locale: Locale
  href?: string
  /** Draws attention to a figure that calls for action (e.g. ready to submit). */
  highlight?: boolean
}

/**
 * One figure in the overview's stats strip: a cell, not a card. The strip's
 * hairlines come from the parent (`divide-*`), so four figures read as one
 * calm row instead of four boxes.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  locale,
  href,
  highlight = false,
}: StatCardProps) {
  const isCalling = highlight && value > 0
  const content = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs font-medium sm:text-sm">{label}</span>
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            isCalling ? 'text-primary' : 'text-subtle-foreground group-hover:text-primary',
          )}
          aria-hidden="true"
        />
      </span>
      <span className="flex items-center gap-2">
        <span className="text-heading text-[1.75rem] leading-none font-semibold tabular-nums">
          {formatNumber(value, locale)}
        </span>
        {isCalling ? (
          <span aria-hidden="true" className="bg-primary h-1.5 w-1.5 rounded-full" />
        ) : null}
      </span>
    </>
  )

  const cellClasses = 'group flex flex-col gap-3 px-5 py-5 transition-colors duration-200 sm:px-6'

  return href ? (
    <Link href={href} className={cn(cellClasses, 'hover:!bg-surface-tint/60')}>
      {content}
    </Link>
  ) : (
    <div className={cellClasses}>{content}</div>
  )
}
