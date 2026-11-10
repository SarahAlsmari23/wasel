'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  getComplaintEditDataAction,
  updateComplaintAction,
  type ComplaintEditableField,
} from '@/app/(site)/wasal/complaint-actions'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: {
    title: 'تعديل تفاصيل البلاغ',
    description:
      'صحّح أي معلومة ثم أعد إنشاء البلاغ. ستُحفظ النسخة الجديدة، وتبقى النسخ السابقة في سجل البلاغ.',
    loading: 'جارٍ تحميل التفاصيل...',
    required: 'مطلوب',
    save: 'حفظ وإعادة إنشاء البلاغ',
    cancel: 'إلغاء',
    updated: (version: number) => `تم تحديث البلاغ (النسخة ${version}).`,
    loadFailed: 'تعذر تحميل تفاصيل البلاغ.',
    missingRequired: 'يرجى تعبئة الحقول المطلوبة.',
  },
  en: {
    title: 'Edit complaint details',
    description:
      'Correct any detail, then regenerate the complaint. The new version is saved, and earlier versions stay in the complaint history.',
    loading: 'Loading details...',
    required: 'Required',
    save: 'Save and regenerate',
    cancel: 'Cancel',
    updated: (version: number) => `Complaint updated (version ${version}).`,
    loadFailed: "Couldn't load the complaint details.",
    missingRequired: 'Please fill in the required fields.',
  },
})

export type ComplaintUpdate = {
  subject: string
  complaintText: string
  updatedAt: string
  versionNumber: number
}

type ComplaintEditorProps = {
  complaintId: string
  isOpen: boolean
  onClose: () => void
  onUpdated: (update: ComplaintUpdate) => void
}

/**
 * Edit-and-regenerate dialog shared by the chat result card and the dashboard
 * complaint page. Loads the complaint type's required fields (pre-filled from
 * what was collected), saves corrections, and regenerates the letter as a new
 * version of the same complaint — never a duplicate complaint.
 */
export function ComplaintEditor({ complaintId, isOpen, onClose, onUpdated }: ComplaintEditorProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const [fields, setFields] = useState<ComplaintEditableField[] | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setFields(null)
    setLoadError(null)
    setSubmitError(null)
    getComplaintEditDataAction(complaintId, locale)
      .then((result) => {
        if (cancelled) return
        if (result.success) {
          setFields(result.fields)
          setValues(Object.fromEntries(result.fields.map((field) => [field.key, field.value])))
        } else {
          setLoadError(result.error)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(copy.loadFailed)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, complaintId, locale, copy.loadFailed])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!fields || isSaving) return

    const missing = fields.some((field) => field.required && !values[field.key]?.trim())
    if (missing) {
      setSubmitError(copy.missingRequired)
      return
    }

    setIsSaving(true)
    setSubmitError(null)
    try {
      const result = await updateComplaintAction(complaintId, values, locale)
      if (result.success) {
        onUpdated({
          subject: result.complaint.subject,
          complaintText: result.complaint.complaintText,
          updatedAt: result.complaint.updatedAt,
          versionNumber: result.versionNumber,
        })
        showToast(copy.updated(result.versionNumber))
        onClose()
      } else {
        setSubmitError(result.error)
      }
    } catch {
      setSubmitError(copy.loadFailed)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      className="sm:max-w-lg"
    >
      {loadError ? (
        <p role="alert" className="text-danger text-sm">
          {loadError}
        </p>
      ) : !fields ? (
        <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm" role="status">
          <Spinner className="h-4 w-4" />
          {copy.loading}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {fields.map((field) => {
            const id = `complaint-field-${field.key}`
            const label = field.required ? `${field.label} (${copy.required})` : field.label
            return (
              <Field key={field.key} htmlFor={id} label={label}>
                {field.multiline ? (
                  <TextArea
                    id={id}
                    rows={5}
                    dir="auto"
                    maxLength={500}
                    value={values[field.key] ?? ''}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                    required={field.required}
                    disabled={isSaving}
                  />
                ) : (
                  <TextInput
                    id={id}
                    dir="auto"
                    maxLength={500}
                    value={values[field.key] ?? ''}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                    required={field.required}
                    disabled={isSaving}
                  />
                )}
              </Field>
            )
          })}

          {submitError ? (
            <p role="alert" className="text-danger text-sm">
              {submitError}
            </p>
          ) : null}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button type="submit" isLoading={isSaving} className="w-full sm:flex-1">
              {copy.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:flex-1"
            >
              {copy.cancel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
