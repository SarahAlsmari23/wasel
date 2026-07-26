import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/utils/format'

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  href?: string
}

export function StatCard({ label, value, icon: Icon, href }: StatCardProps) {
  const content = (
    <Card interactive={Boolean(href)} className="flex h-full items-center gap-4 p-5">
      <span className="bg-secondary/12 text-secondary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-2xl font-semibold">{formatNumber(value)}</p>
        <p className="text-muted-foreground truncate text-sm">{label}</p>
      </div>
    </Card>
  )

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  )
}
