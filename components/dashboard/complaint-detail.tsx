'use client'

import { ArrowRight, Check, Copy, ExternalLink, FileCheck, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { markComplaintSubmittedAction } from '@/app/wasal/complaint-actions'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { getDisplayTitle, getComplaintStatusPresentation } from '@/lib/complaints/display'
import type { ComplaintRecord } from '@/lib/db/complaints'
import { getGovernmentEntityByName } from '@/lib/mock/government-entities'
import { formatDate } from '@/lib/utils/format'

const REFERENCE_NOTICE = 'رقم مرجعي داخلي في منصة واصل، وليس رقم البلاغ لدى الجهة الحكومية.'

type ComplaintDetailProps = {
  complaint: ComplaintRecord
}

/**
 * Real, database-backed complaint detail (Phase 6.5) — replaces the mock
 * MockComplaint-shaped detail view. Fields with no real backing data yet
 * (category, city, issue date, required documents, timeline) are simply not
 * shown, rather than being fabricated.
 */
export function ComplaintDetail({ complaint: initialComplaint }: ComplaintDetailProps) {
  const { showToast } = useToast()
  const [complaint, setComplaint] = useState(initialComplaint)
  const [justCopied, setJustCopied] = useState(false)
  const [isMarkingSubmitted, setIsMarkingSubmitted] = useState(false)

  const entity = complaint.entityName ? getGovernmentEntityByName(complaint.entityName) : undefined
  const displayTitle = getDisplayTitle({
    title: complaint.title,
    complaintSubject: complaint.subject,
  })
  const presentation = getComplaintStatusPresentation(complaint.status, complaint.submittedAt)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(complaint.complaintText)
      setJustCopied(true)
      showToast('تم نسخ البلاغ.')
      window.setTimeout(() => setJustCopied(false), 2000)
    } catch {
      showToast('تعذر نسخ البلاغ. حاول مرة أخرى.', 'error')
    }
  }

  async function handleMarkSubmitted() {
    if (isMarkingSubmitted || complaint.submittedAt) return
    setIsMarkingSubmitted(true)
    try {
      const result = await markComplaintSubmittedAction(complaint.id)
      if (result.success) {
        setComplaint((current) => ({
          ...current,
          submittedAt: result.submittedAt,
          updatedAt: result.updatedAt,
        }))
        showToast('تم تحديث حالة البلاغ.')
      } else {
        showToast(result.error, 'error')
      }
    } catch {
      showToast('حدث خطأ غير متوقع. حاول مرة أخرى.', 'error')
    } finally {
      setIsMarkingSubmitted(false)
    }
  }

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard/complaints"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        العودة إلى البلاغات
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <GovernmentLogo iconKey={entity?.iconKey} />
          <div>
            <h1 className="text-heading text-2xl font-semibold text-balance">{displayTitle}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{complaint.entityName ?? ''}</p>
          </div>
        </div>
        <Badge variant={presentation.badgeVariant}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {presentation.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-heading text-sm font-semibold">نص البلاغ</h2>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {justCopied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {justCopied ? 'تم النسخ' : 'نسخ النص'}
              </Button>
            </div>
            <pre className="bg-surface-muted text-foreground overflow-x-auto rounded-xl p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {complaint.complaintText}
            </pre>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h2 className="text-heading text-sm font-semibold">تفاصيل</h2>
            <DetailRow label="المرجع الداخلي" value={complaint.referenceNumber} />
            <p className="text-muted-foreground -mt-2 text-[11px] leading-relaxed">
              {REFERENCE_NOTICE}
            </p>
            <DetailRow label="تاريخ الإنشاء" value={formatDate(complaint.createdAt)} />
            <DetailRow label="آخر تعديل" value={formatDate(complaint.updatedAt)} />
            {complaint.submittedAt ? (
              <DetailRow label="تاريخ التقديم" value={formatDate(complaint.submittedAt)} />
            ) : null}
          </Card>

          <div className="flex flex-col gap-2">
            {complaint.officialUrl ? (
              <a
                href={complaint.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                الانتقال إلى الموقع الرسمي
              </a>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={handleMarkSubmitted}
              isLoading={isMarkingSubmitted}
              disabled={Boolean(complaint.submittedAt)}
              className="w-full"
            >
              <FileCheck className="h-4 w-4" aria-hidden="true" />
              {complaint.submittedAt ? 'تم تقديم البلاغ' : 'تحديد كمُقدَّم'}
            </Button>

            {complaint.conversationId ? (
              <Link
                href={`/dashboard/conversations/${complaint.conversationId}`}
                className="border-border bg-surface text-foreground hover:bg-surface-muted inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors"
              >
                <MessagesSquare className="h-4 w-4" aria-hidden="true" />
                عرض المحادثة المرتبطة
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="text-foreground text-end text-sm">{value}</span>
    </div>
  )
}
