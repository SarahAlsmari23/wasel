import { ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import { GovernmentLogo } from '@/components/government/government-logo'
import { buttonClasses } from '@/components/ui/button'
import { RelativeTime } from '@/components/ui/relative-time'
import type { DraftRecord } from '@/lib/db/conversations'
import { getGovernmentEntityByName } from '@/lib/mock/government-entities'

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
  const entity = draft.entityName ? getGovernmentEntityByName(draft.entityName) : undefined

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-sm font-semibold">أكمل من حيث توقفت</h2>

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
            <h3 className="text-base font-semibold text-balance">{draft.title}</h3>
            <p className="text-primary-foreground/70 text-sm">{draft.entityName ?? ''}</p>
            <div className="text-primary-foreground/70 mt-1 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                آخر تعديل <RelativeTime iso={draft.updatedAt} />
              </span>
              <span className="bg-primary-foreground/12 rounded-full px-2 py-0.5 font-medium">
                مسودة
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/wasal?conversationId=${draft.id}`}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors"
        >
          متابعة البلاغ
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {showViewAllDrafts ? (
        <Link
          href="/dashboard/drafts"
          className={buttonClasses('ghost', 'sm', 'self-start px-0 hover:bg-transparent')}
        >
          عرض جميع المسودات
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  )
}
