import { AuthorityCard } from '@/components/marketing/authority-card'
import type { MarketingEntity } from '@/lib/mock/marketing-entities'

type AuthoritiesGridProps = {
  entities: MarketingEntity[]
  actionLabel: string
  getActionHref: (entity: MarketingEntity) => string
}

export function AuthoritiesGrid({ entities, actionLabel, getActionHref }: AuthoritiesGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity) => (
        <AuthorityCard
          key={entity.id}
          entity={entity}
          actionLabel={actionLabel}
          actionHref={getActionHref(entity)}
        />
      ))}
    </div>
  )
}
