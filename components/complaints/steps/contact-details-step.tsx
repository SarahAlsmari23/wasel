'use client'

import { FormField } from '@/components/complaints/form-field'
import type { ContactDetailsStepValues, ValidationErrors } from '@/types/complaint'

type ContactDetailsStepProps = {
  values: ContactDetailsStepValues
  errors: ValidationErrors
  onChange: (values: ContactDetailsStepValues) => void
}

export function ContactDetailsStep({ values, errors, onChange }: ContactDetailsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <FormField label="الاسم الكامل" htmlFor="fullName" error={errors.fullName}>
        <input
          id="fullName"
          type="text"
          value={values.fullName}
          onChange={(event) => onChange({ ...values, fullName: event.target.value })}
          placeholder="مثال: عبدالله محمد (اسم توضيحي فقط)"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        />
      </FormField>

      <FormField label="رقم الهوية" htmlFor="nationalId" error={errors.nationalId}>
        <input
          id="nationalId"
          type="text"
          inputMode="numeric"
          value={values.nationalId}
          onChange={(event) => onChange({ ...values, nationalId: event.target.value })}
          placeholder="مثال: 1000000000 (رقم توضيحي فقط)"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        />
      </FormField>

      <FormField label="رقم الجوال" htmlFor="phone" error={errors.phone}>
        <input
          id="phone"
          type="tel"
          value={values.phone}
          onChange={(event) => onChange({ ...values, phone: event.target.value })}
          placeholder="مثال: 0500000000 (رقم توضيحي فقط)"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        />
      </FormField>

      <FormField label="البريد الإلكتروني" htmlFor="email" error={errors.email}>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(event) => onChange({ ...values, email: event.target.value })}
          placeholder="مثال: example@email.com"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        />
      </FormField>

      <FormField label="وسيلة التواصل المفضلة" htmlFor="preferredContactMethod">
        <select
          id="preferredContactMethod"
          value={values.preferredContactMethod}
          onChange={(event) =>
            onChange({
              ...values,
              preferredContactMethod: event.target
                .value as ContactDetailsStepValues['preferredContactMethod'],
            })
          }
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        >
          <option value="phone">الهاتف</option>
          <option value="email">البريد الإلكتروني</option>
        </select>
      </FormField>
    </div>
  )
}
