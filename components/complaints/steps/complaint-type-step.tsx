'use client'

import { FormField } from '@/components/complaints/form-field'
import {
  MOCK_DOMAINS,
  getComplaintTypesByDomain,
  getEntitiesByDomain,
  getServicesByEntity,
} from '@/lib/mock/complaint-reference-data'
import type { ComplaintTypeStepValues, ValidationErrors } from '@/types/complaint'

type ComplaintTypeStepProps = {
  values: ComplaintTypeStepValues
  errors: ValidationErrors
  onChange: (values: ComplaintTypeStepValues) => void
}

export function ComplaintTypeStep({ values, errors, onChange }: ComplaintTypeStepProps) {
  const entities = getEntitiesByDomain(values.domainId)
  const services = getServicesByEntity(values.entityId)
  const complaintTypes = getComplaintTypesByDomain(values.domainId)

  return (
    <div className="flex flex-col gap-4">
      <FormField label="المجال" htmlFor="domainId" error={errors.domainId}>
        <select
          id="domainId"
          value={values.domainId}
          onChange={(event) =>
            onChange({
              domainId: event.target.value,
              entityId: '',
              serviceId: '',
              complaintTypeId: '',
            })
          }
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        >
          <option value="">اختر المجال</option>
          {MOCK_DOMAINS.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="الجهة الحكومية" htmlFor="entityId" error={errors.entityId}>
        <select
          id="entityId"
          value={values.entityId}
          disabled={!values.domainId}
          onChange={(event) => onChange({ ...values, entityId: event.target.value, serviceId: '' })}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
        >
          <option value="">اختر الجهة الحكومية</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="الخدمة" htmlFor="serviceId" error={errors.serviceId}>
        <select
          id="serviceId"
          value={values.serviceId}
          disabled={!values.entityId}
          onChange={(event) => onChange({ ...values, serviceId: event.target.value })}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
        >
          <option value="">اختر الخدمة</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="نوع الشكوى" htmlFor="complaintTypeId" error={errors.complaintTypeId}>
        <select
          id="complaintTypeId"
          value={values.complaintTypeId}
          disabled={!values.domainId}
          onChange={(event) => onChange({ ...values, complaintTypeId: event.target.value })}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
        >
          <option value="">اختر نوع الشكوى</option>
          {complaintTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  )
}
