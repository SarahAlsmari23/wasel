import { ExternalLink } from 'lucide-react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Card } from '@/components/ui/card'
import type { GovernmentEntity } from '@/lib/mock/government-entities'

type AuthorityCardProps = {
  entity: GovernmentEntity
  /** Renders the official-site link when true. */
  showLink?: boolean
}

export function AuthorityCard({ entity, showLink = false }: AuthorityCardProps) {
  return (
    <Card interactive className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <GovernmentLogo iconKey={entity.iconKey} />
        <span className="bg-secondary/12 text-secondary rounded-full px-2.5 py-1 text-xs font-medium">
          {entity.sector}
        </span>
      </div>

      <div>
        <h3 className="text-heading text-base font-semibold">{entity.name}</h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{entity.description}</p>
      </div>

      {showLink ? (
        <a
          href={entity.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/75 mt-auto inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          الموقع الرسمي
        </a>
      ) : null}
    </Card>
  )
}
