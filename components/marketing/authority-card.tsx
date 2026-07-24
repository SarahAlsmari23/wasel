import { Landmark } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { MarketingEntity } from '@/lib/mock/marketing-entities'

type AuthorityCardProps = {
  entity: MarketingEntity
  actionLabel: string
  actionHref: string
}

export function AuthorityCard({ entity, actionLabel, actionHref }: AuthorityCardProps) {
  const isExternal = actionHref.startsWith('http')

  return (
    <Card className="flex flex-col gap-4">
      {/* Generic placeholder icon — no real official logo assets available. */}
      <span className="bg-secondary/15 text-secondary flex h-12 w-12 items-center justify-center rounded-full">
        <Landmark className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-foreground text-sm font-semibold">{entity.name}</p>
        <p className="mt-1 text-sm text-gray-600">{entity.description}</p>
      </div>
      <a
        href={actionHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-foreground mt-auto self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
      >
        {actionLabel}
      </a>
    </Card>
  )
}
