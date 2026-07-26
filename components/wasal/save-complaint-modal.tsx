'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { ComplaintStatus } from '@/types/complaint'

const STATUS_OPTIONS: {
  value: Extract<ComplaintStatus, 'draft' | 'ready'>
  label: string
  description: string
}[] = [
  { value: 'draft', label: 'مسودة', description: 'أحتاج إلى مراجعتها لاحقاً.' },
  { value: 'ready', label: 'جاهزة للتقديم', description: 'البلاغ مكتمل وجاهز للإرسال.' },
]

type SaveComplaintModalProps = {
  isOpen: boolean
  onClose: () => void
  defaultTitle: string
  onConfirm: (title: string, status: ComplaintStatus) => void
  isSaving?: boolean
}

export function SaveComplaintModal({
  isOpen,
  onClose,
  defaultTitle,
  onConfirm,
  isSaving = false,
}: SaveComplaintModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [status, setStatus] = useState<ComplaintStatus>('draft')

  // Re-seed the title whenever the modal reopens for a different analysis.
  useEffect(() => {
    if (isOpen) setTitle(defaultTitle)
  }, [isOpen, defaultTitle])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    onConfirm(trimmed, status)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="حفظ البلاغ"
      description="سيظهر البلاغ في لوحة التحكم حيث يمكنك متابعته أو متابعة تعديله."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field htmlFor="complaint-title" label="عنوان البلاغ">
          <TextInput
            id="complaint-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            disabled={isSaving}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-foreground mb-1 text-sm font-medium">الحالة</legend>
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="border-border hover:bg-primary/4 has-checked:border-primary has-checked:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors"
            >
              <input
                type="radio"
                name="complaint-status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
                disabled={isSaving}
                className="accent-primary mt-0.5"
              />
              <span className="flex flex-col">
                <span className="text-foreground text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" isLoading={isSaving} className="w-full sm:flex-1">
            حفظ البلاغ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:flex-1"
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  )
}
