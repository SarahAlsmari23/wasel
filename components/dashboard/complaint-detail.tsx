'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  FileCheck,
  MessagesSquare,
  PencilLine,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { markComplaintSubmittedAction, updateComplaintAction } from '@/app/wasal/complaint-actions'
import { ComplaintEditor, type ComplaintUpdate } from '@/components/complaints/complaint-editor'
import { GovernmentLogo } from '@/components/government/government-logo'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { getDisplayTitle, getComplaintStatusPresentation } from '@/lib/complaints/display'
import type { ComplaintRecord } from '@/lib/db/complaints'
import { defineCopy } from '@/lib/i18n/config'
import { entityDisplayName, getGovernmentEntityByName } from '@/lib/mock/government-entities'
import { formatDate } from '@/lib/utils/format'

const COPY = defineCopy({
  ar: {
    back: 'العودة إلى البلاغات',
    letter: 'نص البلاغ الرسمي',
    copy: 'نسخ النص',
    copied: 'تم النسخ',
    copiedToast: 'تم نسخ البلاغ.',
    copyFailed: 'تعذر نسخ البلاغ. حاول مرة أخرى.',
    details: 'التفاصيل',
    reference: 'المرجع الداخلي',
    referenceNotice: 'رقم مرجعي داخلي في منصة واصل، وليس رقم البلاغ لدى الجهة الحكومية.',
    created: 'تاريخ الإنشاء',
    updated: 'آخر تعديل',
    submittedOn: 'تاريخ التقديم',
    nextSteps: 'الخطوات التالية',
    submitHint:
      'قدّم البلاغ بنفسك عبر الموقع الرسمي للجهة، ثم سجّل هنا أنك قدّمته لتتابع حالته في لوحة التحكم.',
    openOfficial: 'الانتقال إلى الموقع الرسمي',
    edit: 'تعديل التفاصيل',
    regenerate: 'إعادة الإنشاء',
    regenerated: 'تمت إعادة إنشاء البلاغ.',
    markSubmitted: 'لقد قدّمت البلاغ',
    alreadySubmitted: 'تم تقديم البلاغ',
    statusUpdated: 'تم تحديث حالة البلاغ.',
    unexpected: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    conversation: 'عرض المحادثة المرتبطة',
  },
  en: {
    back: 'Back to complaints',
    letter: 'Formal complaint text',
    copy: 'Copy text',
    copied: 'Copied',
    copiedToast: 'Complaint copied.',
    copyFailed: "Couldn't copy the complaint. Please try again.",
    details: 'Details',
    reference: 'Internal reference',
    referenceNotice:
      'An internal Wasel reference — not the complaint number at the government authority.',
    created: 'Created',
    updated: 'Last updated',
    submittedOn: 'Submitted on',
    nextSteps: 'Next steps',
    submitHint:
      "Submit the complaint yourself on the authority's official website, then record it here to track its status in your dashboard.",
    openOfficial: 'Go to the official website',
    edit: 'Edit details',
    regenerate: 'Regenerate',
    regenerated: 'The complaint was regenerated.',
    markSubmitted: "I've submitted it",
    alreadySubmitted: 'Complaint submitted',
    statusUpdated: 'Complaint status updated.',
    unexpected: 'Something went wrong. Please try again.',
    conversation: 'View the related conversation',
  },
})

type ComplaintDetailProps = {
  complaint: ComplaintRecord
}

/**
 * Real, database-backed complaint detail. Fields with no real backing data
 * (category, required documents, timeline) are not shown rather than
 * fabricated. Editing and regeneration create new versions of the same
 * complaint.
 */
export function ComplaintDetail({ complaint: initialComplaint }: ComplaintDetailProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const [complaint, setComplaint] = useState(initialComplaint)
  const [justCopied, setJustCopied] = useState(false)
  const [isMarkingSubmitted, setIsMarkingSubmitted] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft
  const entity = complaint.entityName ? getGovernmentEntityByName(complaint.entityName) : undefined
  const displayTitle = getDisplayTitle(
    { title: complaint.title, complaintSubject: complaint.subject },
    locale,
  )
  const presentation = getComplaintStatusPresentation(
    complaint.status,
    complaint.submittedAt,
    locale,
  )

  function applyUpdate(update: ComplaintUpdate) {
    setComplaint((current) => ({
      ...current,
      subject: update.subject,
      complaintText: update.complaintText,
      updatedAt: update.updatedAt,
    }))
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${complaint.subject}\n\n${complaint.complaintText}`)
      setJustCopied(true)
      showToast(copy.copiedToast)
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
        applyUpdate({ ...result.complaint, versionNumber: result.versionNumber })
        showToast(copy.regenerated)
      } else {
        showToast(result.error, 'error')
      }
    } catch {
      showToast(copy.unexpected, 'error')
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleMarkSubmitted() {
    if (isMarkingSubmitted || complaint.submittedAt) return
    setIsMarkingSubmitted(true)
    try {
      const result = await markComplaintSubmittedAction(complaint.id, locale)
      if (result.success) {
        setComplaint((current) => ({
          ...current,
          submittedAt: result.submittedAt,
          updatedAt: result.updatedAt,
        }))
        showToast(copy.statusUpdated)
      } else {
        showToast(result.error, 'error')
      }
    } catch {
      showToast(copy.unexpected, 'error')
    } finally {
      setIsMarkingSubmitted(false)
    }
  }

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard/complaints"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <BackArrow className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.back}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <GovernmentLogo iconKey={entity?.iconKey} />
          <div>
            <h1 dir="auto" className="text-heading text-2xl font-semibold text-balance">
              {displayTitle}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {entityDisplayName(complaint.entityName, locale)}
            </p>
          </div>
        </div>
        <Badge variant={presentation.badgeVariant}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {presentation.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-heading text-sm font-semibold">{copy.letter}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditorOpen(true)}>
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                {copy.edit}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                isLoading={isRegenerating}
              >
                {isRegenerating ? null : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                {copy.regenerate}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {justCopied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {justCopied ? copy.copied : copy.copy}
              </Button>
            </div>
          </div>
          <div className="bg-surface-muted rounded-xl p-4">
            <p dir="auto" className="text-foreground text-sm font-semibold">
              {complaint.subject}
            </p>
            <p
              dir="auto"
              className="text-foreground mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap"
            >
              {complaint.complaintText}
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h2 className="text-heading text-sm font-semibold">{copy.details}</h2>
            <DetailRow label={copy.reference} value={complaint.referenceNumber} ltr />
            <p className="text-muted-foreground -mt-2 text-[11px] leading-relaxed">
              {copy.referenceNotice}
            </p>
            <DetailRow label={copy.created} value={formatDate(complaint.createdAt, locale)} />
            <DetailRow label={copy.updated} value={formatDate(complaint.updatedAt, locale)} />
            {complaint.submittedAt ? (
              <DetailRow
                label={copy.submittedOn}
                value={formatDate(complaint.submittedAt, locale)}
              />
            ) : null}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-heading text-sm font-semibold">{copy.nextSteps}</h2>
            <p className="text-muted-foreground text-xs leading-relaxed">{copy.submitHint}</p>
            {complaint.officialUrl ? (
              <a
                href={complaint.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {copy.openOfficial}
              </a>
            ) : null}

            <Button
              type="button"
              variant="subtle"
              onClick={handleMarkSubmitted}
              isLoading={isMarkingSubmitted}
              disabled={Boolean(complaint.submittedAt)}
              className="w-full"
            >
              <FileCheck className="h-4 w-4" aria-hidden="true" />
              {complaint.submittedAt ? copy.alreadySubmitted : copy.markSubmitted}
            </Button>

            {complaint.conversationId ? (
              <Link
                href={`/dashboard/conversations/${complaint.conversationId}`}
                className="border-border bg-surface text-foreground hover:bg-surface-tint hover:text-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors"
              >
                <MessagesSquare className="h-4 w-4" aria-hidden="true" />
                {copy.conversation}
              </Link>
            ) : null}
          </Card>
        </div>
      </div>

      <ComplaintEditor
        complaintId={complaint.id}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onUpdated={applyUpdate}
      />
    </div>
  )
}

function DetailRow({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span dir={ltr ? 'ltr' : undefined} className="text-foreground text-end text-sm tabular-nums">
        {value}
      </span>
    </div>
  )
}
