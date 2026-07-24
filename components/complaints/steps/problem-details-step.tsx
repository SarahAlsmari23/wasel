'use client'

import { FormField } from '@/components/complaints/form-field'
import type { ProblemDetailsStepValues, ValidationErrors } from '@/types/complaint'

type ProblemDetailsStepProps = {
  values: ProblemDetailsStepValues
  errors: ValidationErrors
  onChange: (values: ProblemDetailsStepValues) => void
}

export function ProblemDetailsStep({ values, errors, onChange }: ProblemDetailsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <FormField label="عنوان الشكوى" htmlFor="title" error={errors.title}>
        <input
          id="title"
          type="text"
          value={values.title}
          onChange={(event) => onChange({ ...values, title: event.target.value })}
          placeholder="مثال: تأخر معالجة طلب بلدي"
          className="bg-surface text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </FormField>

      <FormField label="وصف المشكلة" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
          rows={4}
          placeholder="اشرح المشكلة بالتفصيل..."
          className="bg-surface text-foreground focus:border-primary focus:ring-primary w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </FormField>

      <FormField label="تاريخ حدوث المشكلة" htmlFor="issueDate" error={errors.issueDate}>
        <input
          id="issueDate"
          type="date"
          value={values.issueDate}
          onChange={(event) => onChange({ ...values, issueDate: event.target.value })}
          className="bg-surface text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </FormField>

      <FormField label="المدينة (اختياري)" htmlFor="city">
        <input
          id="city"
          type="text"
          value={values.city}
          onChange={(event) => onChange({ ...values, city: event.target.value })}
          placeholder="مثال: الرياض"
          className="bg-surface text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </FormField>

      <FormField label="رقم مرجعي سابق (اختياري)" htmlFor="referenceNumber">
        <input
          id="referenceNumber"
          type="text"
          value={values.referenceNumber}
          onChange={(event) => onChange({ ...values, referenceNumber: event.target.value })}
          placeholder="مثال: 458291"
          className="bg-surface text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </FormField>
    </div>
  )
}
