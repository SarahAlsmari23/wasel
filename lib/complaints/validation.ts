import type {
  ComplaintTypeStepValues,
  ContactDetailsStepValues,
  ProblemDetailsStepValues,
  ValidationErrors,
} from '@/types/complaint'

const PHONE_REGEX = /^05\d{8}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NATIONAL_ID_REGEX = /^\d{10}$/

export function validateComplaintTypeStep(values: ComplaintTypeStepValues): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!values.domainId) errors.domainId = 'يرجى اختيار المجال.'
  if (!values.entityId) errors.entityId = 'يرجى اختيار الجهة الحكومية.'
  if (!values.serviceId) errors.serviceId = 'يرجى اختيار الخدمة.'
  if (!values.complaintTypeId) errors.complaintTypeId = 'يرجى اختيار نوع الشكوى.'
  return errors
}

export function validateProblemDetailsStep(values: ProblemDetailsStepValues): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!values.title.trim()) errors.title = 'عنوان الشكوى مطلوب.'
  if (!values.description.trim()) errors.description = 'وصف المشكلة مطلوب.'
  if (!values.issueDate) errors.issueDate = 'تاريخ حدوث المشكلة مطلوب.'
  return errors
}

export function validateContactDetailsStep(values: ContactDetailsStepValues): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!values.fullName.trim()) errors.fullName = 'الاسم الكامل مطلوب.'
  if (!NATIONAL_ID_REGEX.test(values.nationalId.trim())) {
    errors.nationalId = 'رقم الهوية يجب أن يتكون من 10 أرقام.'
  }
  if (!PHONE_REGEX.test(values.phone.trim())) {
    errors.phone = 'يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx).'
  }
  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'يرجى إدخال بريد إلكتروني صحيح.'
  }
  return errors
}
