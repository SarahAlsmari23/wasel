import type { ComplaintDraftFormValues } from '@/types/complaint'

type DraftLabels = {
  entityName: string
  serviceName: string
  categoryName: string
}

/**
 * Masks a national ID down to its last four digits (e.g. "1234567890" ->
 * "******7890"). The full value must never appear in generated drafts,
 * review summaries, or any other user-facing text.
 */
export function maskNationalId(nationalId: string): string {
  const digitsOnly = nationalId.replace(/\D/g, '')
  if (digitsOnly.length <= 4) {
    return '*'.repeat(digitsOnly.length)
  }
  const lastFour = digitsOnly.slice(-4)
  return '*'.repeat(digitsOnly.length - 4) + lastFour
}

export function generateComplaintDraft(
  values: ComplaintDraftFormValues,
  labels: DraftLabels,
): string {
  const { problem, contact } = values
  const { entityName, serviceName, categoryName } = labels

  const contactMethodLabel =
    contact.preferredContactMethod === 'phone' ? 'الهاتف' : 'البريد الإلكتروني'

  const optionalLines = [
    problem.city ? `المدينة: ${problem.city}` : null,
    problem.referenceNumber ? `الرقم المرجعي السابق: ${problem.referenceNumber}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `إلى: ${entityName}
الموضوع: ${problem.title}

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقع أدناه، ${contact.fullName}، بصفتي أحد المستفيدين من خدمات ${entityName}، بشكوى بخصوص ${categoryName} ضمن خدمة ${serviceName}.

تفاصيل المشكلة:
${problem.description}

تاريخ حدوث المشكلة: ${problem.issueDate}
${optionalLines}

بيانات التواصل:
الاسم: ${contact.fullName}
رقم الهوية: ${maskNationalId(contact.nationalId)}
الجوال: ${contact.phone}
البريد الإلكتروني: ${contact.email}
وسيلة التواصل المفضلة: ${contactMethodLabel}

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
${contact.fullName}`
}
