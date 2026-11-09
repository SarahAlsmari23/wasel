import { ExternalLink } from 'lucide-react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Card } from '@/components/ui/card'
import type { Locale } from '@/lib/i18n/config'
import { localizeEntity, type GovernmentEntity } from '@/lib/mock/government-entities'

const OFFICIAL_SITE = { ar: 'الموقع الرسمي', en: 'Official website' } as const
const LOGO_ALT = { ar: 'شعار', en: 'Logo of' } as const

type AuthorityCardProps = {
  entity: GovernmentEntity
  locale: Locale
  showLink?: boolean
}

export function AuthorityCard({ entity, locale, showLink = false }: AuthorityCardProps) {
  const text = localizeEntity(entity, locale)

  return (
    <Card interactive className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <GovernmentLogo iconKey={entity.iconKey} alt={`${LOGO_ALT[locale]} ${text.name}`} />
        <span className="bg-secondary/12 text-secondary rounded-full px-2.5 py-1 text-xs font-medium">
          {text.sector}
        </span>
      </div>

      <div>
        <h3 className="text-heading text-base font-semibold">{text.name}</h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{text.description}</p>
      </div>

      {showLink ? (
        <a
          href={entity.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-hover mt-auto inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {OFFICIAL_SITE[locale]}
          <span className="text-muted-foreground text-xs font-normal" dir="ltr">
            {entity.officialUrl.replace(/^https?:\/\//, '')}
          </span>
        </a>
      ) : null}
    </Card>
  )
}
