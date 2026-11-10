'use client'

import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { GovernmentLogo } from '@/components/government/government-logo'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { buttonClasses } from '@/components/ui/button'
import { RelativeTime } from '@/components/ui/relative-time'
import { localizeTitle } from '@/lib/complaints/display'
import type { DraftRecord } from '@/lib/db/conversations'
import { defineCopy } from '@/lib/i18n/config'
import { entityDisplayName, getGovernmentEntityByName } from '@/lib/mock/government-entities'

const COPY = defineCopy({
  ar: {
    heading: 'أكمل من حيث توقفت',
    lastEdited: 'آخر تعديل',
    draft: 'مسودة',
    continue: 'متابعة البلاغ',
    viewAll: 'عرض جميع المسودات',
  },
  en: {
    heading: 'Continue where you left off',
    lastEdited: 'Last edited',
    draft: 'Draft',
    continue: 'Continue complaint',
    viewAll: 'View all drafts',
  },
})

type ContinueCardProps = {
  draft: DraftRecord
  /** Rendered under the card when the user has more than one draft. */
  showViewAllDrafts: boolean
}

/**
 * "Continue Where You Left Off" — the single most recently updated draft
 * (a complaint-mode conversation with no complaint yet, see getUserDrafts).
 * The dashboard hides this section entirely when no drafts exist.
 */
export function ContinueCard({ draft, showViewAllDrafts }: ContinueCardProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const entity = draft.entityName ? getGovernmentEntityByName(draft.entityName) : undefined
  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-sm font-semibold">{copy.heading}</h2>

      <div className="bg-primary text-primary-foreground shadow-lift flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {/*
            No tint override here: this card's green background would show
            through a translucent plate and muddy the official artwork. The
            logo keeps its own white plate, which also separates it cleanly
            from the green.
          */}
          <GovernmentLogo iconKey={entity?.iconKey} className="border-transparent" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 dir="auto" className="text-match-parent text-base font-semibold text-balance">
              {localizeTitle(draft.title, locale)}
            </h3>
            <p className="text-primary-foreground/70 text-sm">
              {entityDisplayName(draft.entityName, locale)}
            </p>
            <div className="text-primary-foreground/70 mt-1 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {copy.lastEdited} <RelativeTime iso={draft.updatedAt} />
              </span>
              <span className="bg-primary-foreground/12 rounded-full px-2 py-0.5 font-medium">
                {copy.draft}
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/wasal?conversationId=${draft.id}`}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors"
        >
          {copy.continue}
          <ForwardArrow className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {showViewAllDrafts ? (
        <Link
          href="/dashboard/drafts"
          className={buttonClasses('ghost', 'sm', 'self-start px-0 hover:bg-transparent')}
        >
          {copy.viewAll}
          <ForwardArrow className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  )
}
