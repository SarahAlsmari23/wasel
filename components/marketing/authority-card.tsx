import { ArrowUpRight } from 'lucide-react'
import { GovernmentLogo } from '@/components/government/government-logo'
import type { Locale } from '@/lib/i18n/config'
import { localizeEntity, type GovernmentEntity } from '@/lib/mock/government-entities'

const OFFICIAL_SITE = { ar: 'الموقع الرسمي', en: 'Official website' } as const
const LOGO_ALT = { ar: 'شعار', en: 'Logo of' } as const

type AuthorityCardProps = {
  entity: GovernmentEntity
  locale: Locale
  showLink?: boolean
}

/**
 * One supported authority: logo, sector, official name and remit. Quiet by
 * design — a hairline frame and a faint emerald edge on hover, no lift — so a
 * row of five reads as one calm directory rather than five competing cards.
 */
export function AuthorityCard({ entity, locale, showLink = false }: AuthorityCardProps) {
  const text = localizeEntity(entity, locale)

  return (
    <article className="group bg-surface/90 border-border hover:border-primary/30 flex h-full flex-col gap-4 rounded-2xl border p-5 transition-colors duration-200">
      <div className="flex items-center justify-between gap-3">
        <GovernmentLogo iconKey={entity.iconKey} alt={`${LOGO_ALT[locale]} ${text.name}`} />
        <span className="text-muted-foreground text-xs font-medium">{text.sector}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-heading text-[0.95rem] leading-snug font-semibold">{text.name}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{text.description}</p>
      </div>

      {showLink ? (
        <a
          href={entity.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border text-primary hover:text-primary-hover mt-auto flex items-center justify-between gap-2 border-t pt-4 text-sm font-medium transition-colors duration-200"
        >
          <span className="flex min-w-0 flex-col">
            {OFFICIAL_SITE[locale]}
            <span className="text-muted-foreground truncate text-xs font-normal" dir="ltr">
              {entity.officialUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
        </a>
      ) : null}
    </article>
  )
}
