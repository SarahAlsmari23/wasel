'use client'

import { maskNationalId } from '@/lib/complaints/generate-draft'
import {
  MOCK_COMPLAINT_TYPES,
  MOCK_DOMAINS,
  MOCK_ENTITIES,
  MOCK_SERVICES,
} from '@/lib/mock/complaint-reference-data'
import type { ComplaintDraftFormValues, ValidationErrors } from '@/types/complaint'

type ComplaintReviewStepProps = {
  values: ComplaintDraftFormValues
  typeErrors: ValidationErrors
  problemErrors: ValidationErrors
  contactErrors: ValidationErrors
  isGenerating: boolean
  onEditStep: (step: number) => void
  onGenerateDraft: () => void
}

function findName<T extends { id: string; name: string }>(list: T[], id: string): string {
  return list.find((item) => item.id === id)?.name ?? '—'
}

export function ComplaintReviewStep({
  values,
  typeErrors,
  problemErrors,
  contactErrors,
  isGenerating,
  onEditStep,
  onGenerateDraft,
}: ComplaintReviewStepProps) {
  const hasErrors =
    Object.keys(typeErrors).length > 0 ||
    Object.keys(problemErrors).length > 0 ||
    Object.keys(contactErrors).length > 0

  const contactMethodLabel =
    values.contact.preferredContactMethod === 'phone' ? 'الهاتف' : 'البريد الإلكتروني'

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">نوع الشكوى</h2>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-xs font-medium underline"
          >
            تعديل
          </button>
        </div>
        <dl className="flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
          <div className="flex justify-between gap-2">
            <dt>المجال</dt>
            <dd>{findName(MOCK_DOMAINS, values.type.domainId)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>الجهة الحكومية</dt>
            <dd>{findName(MOCK_ENTITIES, values.type.entityId)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>الخدمة</dt>
            <dd>{findName(MOCK_SERVICES, values.type.serviceId)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>نوع الشكوى</dt>
            <dd>{findName(MOCK_COMPLAINT_TYPES, values.type.complaintTypeId)}</dd>
          </div>
        </dl>
        {Object.keys(typeErrors).length > 0 ? (
          <p className="mt-2 text-xs text-red-600">يوجد حقول ناقصة في هذه الخطوة.</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">تفاصيل المشكلة</h2>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-xs font-medium underline"
          >
            تعديل
          </button>
        </div>
        <dl className="flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
          <div className="flex justify-between gap-2">
            <dt>العنوان</dt>
            <dd>{values.problem.title || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>الوصف</dt>
            <dd className="max-w-[60%] truncate">{values.problem.description || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>تاريخ المشكلة</dt>
            <dd>{values.problem.issueDate || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>المدينة</dt>
            <dd>{values.problem.city || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>الرقم المرجعي</dt>
            <dd>{values.problem.referenceNumber || '—'}</dd>
          </div>
        </dl>
        {Object.keys(problemErrors).length > 0 ? (
          <p className="mt-2 text-xs text-red-600">يوجد حقول ناقصة في هذه الخطوة.</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">بيانات التواصل</h2>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-xs font-medium underline"
          >
            تعديل
          </button>
        </div>
        <dl className="flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
          <div className="flex justify-between gap-2">
            <dt>الاسم</dt>
            <dd>{values.contact.fullName || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>رقم الهوية</dt>
            <dd>{values.contact.nationalId ? maskNationalId(values.contact.nationalId) : '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>الجوال</dt>
            <dd>{values.contact.phone || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>البريد الإلكتروني</dt>
            <dd>{values.contact.email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>وسيلة التواصل المفضلة</dt>
            <dd>{contactMethodLabel}</dd>
          </div>
        </dl>
        {Object.keys(contactErrors).length > 0 ? (
          <p className="mt-2 text-xs text-red-600">يوجد حقول ناقصة في هذه الخطوة.</p>
        ) : null}
      </section>

      {hasErrors ? (
        <p className="text-sm text-red-600">
          يرجى إكمال الحقول المطلوبة الناقصة قبل إنشاء المسودة.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onGenerateDraft}
        disabled={hasErrors || isGenerating}
        className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        إنشاء المسودة
      </button>
    </div>
  )
}
