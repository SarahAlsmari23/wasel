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
 * "Continue where you left off" — the single most recently updated draft
 * (a complaint conversation with no complaint yet). Hidden when none exist.
 */
export function ContinueCard({ draft, showViewAllDrafts }: ContinueCardProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const entity = draft.entityName ? getGovernmentEntityByName(draft.entityName) : undefined
  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-sm font-semibold">{copy.heading}</h2>

      {/*
        A quiet surface with an emerald leading edge: it is the one card on
        the page that asks the user to act, without shouting in solid green.
      */}
      <div className="bg-surface border-border relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <span aria-hidden="true" className="bg-primary absolute inset-y-0 start-0 w-1" />
        <div className="flex min-w-0 items-start gap-4">
          <GovernmentLogo iconKey={entity?.iconKey} />
          <div className="flex min-w-0 flex-col gap-1">
            <h3
              dir="auto"
              className="text-match-parent text-heading text-base font-semibold text-balance"
            >
              {localizeTitle(draft.title, locale)}
            </h3>
            <p className="text-muted-foreground text-sm">
              {entityDisplayName(draft.entityName, locale)}
            </p>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-xs">
              <span className="bg-status-draft/12 text-status-draft rounded-full px-2 py-0.5 font-medium">
                {copy.draft}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {copy.lastEdited} <RelativeTime iso={draft.updatedAt} />
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/wasal?conversationId=${draft.id}`}
          className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}
        >
          {copy.continue}
          <ForwardArrow className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {showViewAllDrafts ? (
        <Link
          href="/dashboard/drafts"
          className="text-primary hover:text-primary-hover inline-flex items-center gap-1.5 self-start text-xs font-medium transition-colors"
        >
          {copy.viewAll}
          <ForwardArrow className="h-3 w-3" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  )
}
