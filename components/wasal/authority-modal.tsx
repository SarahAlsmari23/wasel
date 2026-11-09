'use client'

import { CheckCircle2, FileSignature, MessagesSquare } from 'lucide-react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { defineCopy } from '@/lib/i18n/config'
import { localizeEntity, type GovernmentEntity } from '@/lib/mock/government-entities'

const COPY = defineCopy({
  ar: {
    title: 'تم تحديد الجهة الحكومية',
    description: 'بناءً على وصفك، هذه هي الجهة المختصة بمعالجة شكواك.',
    createComplaint: 'إنشاء بلاغ',
    continueChat: 'متابعة المحادثة',
    nextStep: 'عند إنشاء البلاغ سيجمع واصل بقية التفاصيل، ثم يصيغ لك بلاغاً احترافياً جاهزاً للتقديم.',
  },
  en: {
    title: 'Authority identified',
    description: 'Based on your description, this is the authority responsible for your complaint.',
    createComplaint: 'Create complaint',
    continueChat: 'Continue chatting',
    nextStep:
      'When you create the complaint, Wasel will collect the remaining details and draft a professional complaint ready to submit.',
  },
})

type AuthorityModalProps = {
  isOpen: boolean
  entity: GovernmentEntity | null
  reason?: string
  onCreateComplaint: () => void
  onContinueChat: () => void
}

export function AuthorityModal({
  isOpen,
  entity,
  reason,
  onCreateComplaint,
  onContinueChat,
}: AuthorityModalProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  if (!entity) return null
  const text = localizeEntity(entity, locale)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onContinueChat}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button type="button" onClick={onCreateComplaint} className="w-full sm:flex-1">
            <FileSignature className="h-4 w-4" aria-hidden="true" />
            {copy.createComplaint}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onContinueChat}
            className="w-full sm:flex-1"
          >
            <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            {copy.continueChat}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="border-border bg-surface-muted flex items-start gap-4 rounded-2xl border p-4">
          <GovernmentLogo iconKey={entity.iconKey} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-secondary text-xs font-medium">{text.sector}</span>
            <h3 className="text-heading text-base leading-snug font-semibold">{text.name}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{text.description}</p>
          </div>
        </div>

        {reason ? (
          <p dir="auto" className="text-muted-foreground text-sm leading-relaxed">
            {reason}
          </p>
        ) : null}

        <div className="text-secondary flex items-start gap-2 text-xs leading-relaxed">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{copy.nextStep}</span>
        </div>
      </div>
    </Modal>
  )
}
