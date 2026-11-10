'use client'

import { Check, Copy, ExternalLink, FileCheck, PencilLine, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { updateComplaintAction } from '@/app/wasal/complaint-actions'
import { ComplaintEditor, type ComplaintUpdate } from '@/components/complaints/complaint-editor'
import { GovernmentLogo } from '@/components/government/government-logo'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { getComplaintStatusPresentation, getDisplayTitle } from '@/lib/complaints/display'
import { defineCopy } from '@/lib/i18n/config'
import { entityDisplayName, getGovernmentEntityByName } from '@/lib/mock/government-entities'
import { formatDate } from '@/lib/utils/format'

const COPY = defineCopy({
  ar: {
    reference: 'المرجع الداخلي',
    referenceNotice: 'رقم مرجعي داخلي في منصة واصل، وليس رقم البلاغ لدى الجهة الحكومية.',
    created: 'أُنشئ',
    updated: 'آخر تحديث',
    submittedOn: 'تم التقديم',
    authority: 'الجهة المختصة',
    howToSubmit: 'خطوات التقديم',
    submitInstruction:
      'انتقل إلى الموقع الرسمي للجهة المختصة واتبع خطوات تقديم البلاغ المنشورة فيه، ثم الصق نص البلاغ الجاهز وأرفق المستندات المطلوبة إن طُلبت. واصل لا يقدّم البلاغ نيابةً عنك.',
    letter: 'نص البلاغ الرسمي',
    openOfficial: 'الانتقال إلى الموقع الرسمي',
    copy: 'نسخ البلاغ',
    copied: 'تم نسخ البلاغ',
    copyFailed: 'تعذر نسخ البلاغ. حاول مرة أخرى.',
    edit: 'تعديل التفاصيل',
    regenerate: 'إعادة الإنشاء',
    regenerated: 'تمت إعادة إنشاء البلاغ.',
    markSubmitted: 'لقد قدّمت البلاغ',
    alreadySubmitted: 'تم تقديم البلاغ',
    backToComplaints: 'عرض بلاغاتي في لوحة التحكم',
  },
  en: {
    reference: 'Internal reference',
    referenceNotice:
      'An internal Wasel reference — not the complaint number at the government authority.',
    created: 'Created',
    updated: 'Last updated',
    submittedOn: 'Submitted',
    authority: 'Responsible authority',
    howToSubmit: 'How to submit',
    submitInstruction:
      "Go to the authority's official website and follow its published steps for submitting a complaint, then paste the prepared complaint text and attach any documents it asks for. Wasel does not submit the complaint on your behalf.",
    letter: 'Formal complaint text',
    openOfficial: 'Go to the official website',
    copy: 'Copy complaint',
    copied: 'Complaint copied',
    copyFailed: "Couldn't copy the complaint. Please try again.",
    edit: 'Edit details',
    regenerate: 'Regenerate',
    regenerated: 'The complaint was regenerated.',
    markSubmitted: "I've submitted it",
    alreadySubmitted: 'Complaint submitted',
    backToComplaints: 'View my complaints in the dashboard',
  },
})

export type ComplaintResult = {
  id: string
  referenceNumber: string
  title: string
  status: string
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  entityName: string
  officialUrl: string
  subject: string
  complaintText: string
}

type ComplaintResultCardProps = {
  complaint: ComplaintResult
  onMarkSubmitted: () => void
  isMarkingSubmitted?: boolean
  /** Receives the regenerated letter after an edit or regeneration. */
  onComplaintUpdated?: (update: ComplaintUpdate) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-foreground text-xs font-semibold">{title}</p>
      {children}
    </div>
  )
}

/**
 * The real complaint's result view — shown once `createComplaintAction`
 * succeeds: reference, authority, the generated letter, and every next step
 * (official site, copy, edit, regenerate, mark as submitted).
 */
export function ComplaintResultCard({
  complaint,
  onMarkSubmitted,
  isMarkingSubmitted = false,
  onComplaintUpdated,
}: ComplaintResultCardProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const [justCopied, setJustCopied] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const entity = getGovernmentEntityByName(complaint.entityName)
  const displayTitle = getDisplayTitle(
    { title: complaint.title, complaintSubject: complaint.subject },
    locale,
  )
  const status = getComplaintStatusPresentation(complaint.status, complaint.submittedAt, locale)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${complaint.subject}\n\n${complaint.complaintText}`)
      setJustCopied(true)
      showToast(copy.copied)
      window.setTimeout(() => setJustCopied(false), 2000)
    } catch {
      showToast(copy.copyFailed, 'error')
    }
  }

  async function handleRegenerate() {
    if (isRegenerating) return
    setIsRegenerating(true)
    try {
      const result = await updateComplaintAction(complaint.id, null, locale)
      if (result.success) {
        onComplaintUpdated?.({
          subject: result.complaint.subject,
          complaintText: result.complaint.complaintText,
          updatedAt: result.complaint.updatedAt,
          versionNumber: result.versionNumber,
        })
        showToast(copy.regenerated)
      } else {
        showToast(result.error, 'error')
      }
    } catch {
      showToast(copy.copyFailed, 'error')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="bg-surface border-border shadow-soft animate-fade-in flex flex-col gap-5 rounded-2xl border p-5">
      <div className="flex flex-col gap-1">
        <h2 dir="auto" className="text-heading text-base leading-snug font-semibold">
          {displayTitle}
        </h2>
        <p className="text-muted-foreground text-xs">
          {copy.reference}:{' '}
          <span dir="ltr" className="tabular-nums">
            {complaint.referenceNumber}
          </span>
        </p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">{copy.referenceNotice}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Badge variant={status.badgeVariant}>{status.label}</Badge>
        <span className="text-muted-foreground">
          {copy.created}: {formatDate(complaint.createdAt, locale)}
        </span>
        <span className="text-muted-foreground">
          {copy.updated}: {formatDate(complaint.updatedAt, locale)}
        </span>
        {complaint.submittedAt ? (
          <span className="text-muted-foreground">
            {copy.submittedOn}: {formatDate(complaint.submittedAt, locale)}
          </span>
        ) : null}
      </div>

      <div className="flex items-start gap-3">
        <GovernmentLogo iconKey={entity?.iconKey} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-secondary text-xs font-medium">{copy.authority}</span>
          <h3 className="text-heading text-sm font-semibold">
            {entityDisplayName(complaint.entityName, locale)}
          </h3>
        </div>
      </div>

      <Section title={copy.howToSubmit}>
        <p className="text-muted-foreground text-sm leading-relaxed">{copy.submitInstruction}</p>
      </Section>

      <Section title={copy.letter}>
        <div className="bg-surface-muted border-border rounded-xl border p-4">
          <p dir="auto" className="text-foreground text-sm font-medium break-words">
            {complaint.subject}
          </p>
          <p
            dir="auto"
            className="text-muted-foreground mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap"
          >
            {complaint.complaintText}
          </p>
        </div>
      </Section>

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <a
          href={complaint.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {copy.openOfficial}
        </a>

        <Button type="button" variant="outline" onClick={handleCopy} className="w-full">
          {justCopied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {justCopied ? copy.copied : copy.copy}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={() => setIsEditorOpen(true)}>
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            {copy.edit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleRegenerate}
            isLoading={isRegenerating}
          >
            {isRegenerating ? null : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {copy.regenerate}
          </Button>
        </div>

        <Button
          type="button"
          variant="subtle"
          onClick={onMarkSubmitted}
          isLoading={isMarkingSubmitted}
          disabled={Boolean(complaint.submittedAt)}
          className="w-full"
        >
          <FileCheck className="h-4 w-4" aria-hidden="true" />
          {complaint.submittedAt ? copy.alreadySubmitted : copy.markSubmitted}
        </Button>

        <Link
          href="/dashboard/complaints"
          className="text-muted-foreground hover:text-primary mt-1 text-center text-xs font-medium transition-colors"
        >
          {copy.backToComplaints}
        </Link>
      </div>

      <ComplaintEditor
        complaintId={complaint.id}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onUpdated={(update) => onComplaintUpdated?.(update)}
      />
    </div>
  )
}
