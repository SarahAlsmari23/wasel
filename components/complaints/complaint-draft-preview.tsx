'use client'

import { useState } from 'react'

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
      <div className="rounded-lg border border-black/10 p-4 text-sm leading-relaxed whitespace-pre-wrap dark:border-white/10">
        {draftText}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          نسخ النص
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          طباعة
        </button>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
          >
            تعديل البيانات
          </button>
        ) : null}
        {onStartNew ? (
          <button
            type="button"
            onClick={onStartNew}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium"
          >
            بدء شكوى جديدة
          </button>
        ) : null}
        {copyState === 'success' ? (
          <span className="text-xs text-emerald-600">تم نسخ النص.</span>
        ) : null}
        {copyState === 'error' ? (
          <span className="text-xs text-red-600">تعذر نسخ النص، حاول مرة أخرى.</span>
        ) : null}
      </div>
    </div>
  )
}
