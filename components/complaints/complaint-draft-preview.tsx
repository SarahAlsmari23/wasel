'use client'

import { Copy, Pencil, Printer } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type ComplaintDraftPreviewProps = {
  draftText: string
  onEdit?: () => void
  onStartNew?: () => void
}

export function ComplaintDraftPreview({
  draftText,
  onEdit,
  onStartNew,
}: ComplaintDraftPreviewProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draftText)
      setCopyState('success')
    } catch {
      setCopyState('error')
    } finally {
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface text-foreground rounded-xl border border-gray-200 p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
        {draftText}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button type="button" variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          نسخ النص
        </Button>
        <Button type="button" variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          طباعة
        </Button>
        {onEdit ? (
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            تعديل البيانات
          </Button>
        ) : null}
        {onStartNew ? (
          <Button type="button" onClick={onStartNew}>
            بدء شكوى جديدة
          </Button>
        ) : null}
        {copyState === 'success' ? (
          <span className="text-secondary text-xs">تم نسخ النص.</span>
        ) : null}
        {copyState === 'error' ? (
          <span className="text-danger text-xs">تعذر نسخ النص، حاول مرة أخرى.</span>
        ) : null}
      </div>
    </div>
  )
}
