'use client'

import { CheckCircle2, FileSignature, MessagesSquare } from 'lucide-react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { GovernmentEntity } from '@/lib/mock/government-entities'

type AuthorityModalProps = {
  isOpen: boolean
  entity: GovernmentEntity | null
  /** Why this authority was matched, when the assistant provided a reason. */
  reason?: string
  onCreateComplaint: () => void
  onContinueChat: () => void
}

/**
 * Appears once the assistant has identified the responsible authority, turning
 * that moment into an explicit choice: build the complaint now, or keep
 * talking. Dismissing it changes nothing about the conversation.
 */
export function AuthorityModal({
  isOpen,
  entity,
  reason,
  onCreateComplaint,
  onContinueChat,
}: AuthorityModalProps) {
  if (!entity) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onContinueChat}
      title="تم تحديد الجهة الحكومية"
      description="تم تحديد الجهة الحكومية المناسبة لمعالجة شكواك."
      footer={
        <>
          <Button type="button" onClick={onCreateComplaint} className="w-full sm:flex-1">
            <FileSignature className="h-4 w-4" aria-hidden="true" />
            إنشاء بلاغ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onContinueChat}
            className="w-full sm:flex-1"
          >
            <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            متابعة المحادثة
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="border-border bg-surface-muted flex items-start gap-4 rounded-2xl border p-4">
          <GovernmentLogo iconKey={entity.iconKey} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-secondary text-xs font-medium">{entity.sector}</span>
            <h3 className="text-heading text-base leading-snug font-semibold">{entity.name}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{entity.description}</p>
          </div>
        </div>

        {reason ? <p className="text-muted-foreground text-sm leading-relaxed">{reason}</p> : null}

        <div className="text-secondary flex items-start gap-2 text-xs leading-relaxed">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            عند إنشاء البلاغ سيجمع واصل بقية التفاصيل، ثم يصيغ لك بلاغاً احترافياً جاهزاً للتقديم.
          </span>
        </div>
      </div>
    </Modal>
  )
}
