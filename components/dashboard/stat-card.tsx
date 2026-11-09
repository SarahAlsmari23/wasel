import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
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

export function StatCard({ label, value, icon: Icon, locale, href, highlight = false }: StatCardProps) {
  const content = (
    <Card
      interactive={Boolean(href)}
      className={cn('flex h-full items-center gap-4 p-5', highlight && value > 0 && 'border-primary/30')}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          highlight && value > 0 ? 'bg-primary text-primary-foreground' : 'bg-surface-tint text-primary',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground tabular-nums text-2xl font-semibold">
          {formatNumber(value, locale)}
        </p>
        <p className="text-muted-foreground text-sm leading-snug">{label}</p>
      </div>
    </Card>
  )

  return href ? (
    <Link href={href} className="block h-full rounded-2xl">
      {content}
    </Link>
  ) : (
    content
  )
}
