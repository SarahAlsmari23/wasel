'use client'

import { ArrowRight, Check, Copy, ExternalLink, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ComplaintStatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils/format'
import { getGovernmentEntityById } from '@/lib/mock/government-entities'
import type { MockComplaint } from '@/types/complaint'

type ComplaintDetailProps = {
  complaint: MockComplaint
}

export function ComplaintDetail({ complaint }: ComplaintDetailProps) {
  const { showToast } = useToast()
  const [justCopied, setJustCopied] = useState(false)
  const entity = getGovernmentEntityById(complaint.entityId)

  // Records saved by an older version of the app (or a future API) may omit
  // these collections entirely; defaulting here keeps the page rendering
  // instead of throwing on `.map` of undefined.
  const timeline = complaint.timeline ?? []
  const requiredDocuments = complaint.requiredDocuments ?? []

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(complaint.draftText)
      setJustCopied(true)
      showToast('تم نسخ ملخص البلاغ.')
      window.setTimeout(() => setJustCopied(false), 2000)
    } catch {
      showToast('تعذر نسخ الملخص. حاول مرة أخرى.', 'error')
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
          <GovernmentLogo iconKey={complaint.entityIconKey} />
          <div>
            <h1 className="text-heading text-2xl font-semibold text-balance">{complaint.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {complaint.entityName} · {complaint.categoryName}
            </p>
          </div>
        </div>
        <ComplaintStatusBadge status={complaint.status} />
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
              {complaint.draftText}
            </pre>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading text-sm font-semibold">سجل البلاغ</h2>
            <ol className="flex flex-col">
              {timeline.map((entry, index) => {
                const isLast = index === timeline.length - 1
                return (
                  <li key={`${entry.label}-${entry.at}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="bg-status-completed mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                      {isLast ? null : <span className="bg-border w-px flex-1" />}
                    </div>
                    <div className={isLast ? 'pb-0' : 'pb-5'}>
                      <p className="text-foreground text-sm">{entry.label}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(entry.at)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h2 className="text-heading text-sm font-semibold">تفاصيل</h2>
            <DetailRow label="المدينة" value={complaint.city} />
            <DetailRow label="تاريخ حدوث المشكلة" value={formatDate(complaint.issueDate)} />
            <DetailRow label="الرقم المرجعي" value={complaint.referenceNumber || 'غير متوفر'} />
            <DetailRow label="تاريخ الإنشاء" value={formatDate(complaint.createdAt)} />
            <DetailRow label="آخر تعديل" value={formatDate(complaint.updatedAt)} />
          </Card>

          {requiredDocuments.length > 0 ? (
            <Card className="flex flex-col gap-3">
              <h2 className="text-heading text-sm font-semibold">المستندات المطلوبة</h2>
              <ul className="flex flex-col gap-2">
                {requiredDocuments.map((document) => (
                  <li key={document} className="text-muted-foreground flex gap-2 text-sm">
                    <span
                      className="bg-secondary mt-1.5 h-1 w-1 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    {document}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="flex flex-col gap-2">
            {entity ? (
              <a
                href={entity.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                الانتقال إلى الموقع الرسمي
              </a>
            ) : null}

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
