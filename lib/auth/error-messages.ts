import { AuthError } from '@supabase/supabase-js'

const FALLBACK_MESSAGE = 'تعذر إتمام العملية. حاول مرة أخرى.'

/**
 * Keyed on Supabase's stable `error_code`, NOT on the English `message`.
 * Message strings are prose that GoTrue rewords between releases, so matching
 * on them silently degrades to the generic fallback the moment a wording
 * changes — which is exactly how "Email not confirmed" ended up surfacing as
 * a meaningless "حدث خطأ".
 *
 * See https://supabase.com/docs/guides/auth/debugging/error-codes
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  email_not_confirmed: 'لم يتم تفعيل بريدك الإلكتروني بعد. تحقق من رسالة التفعيل في بريدك.',
  invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  user_already_exists: 'هذا البريد الإلكتروني مسجل بالفعل.',
  email_exists: 'هذا البريد الإلكتروني مسجل بالفعل.',
  weak_password: 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.',
  over_email_send_rate_limit:
    'تم تجاوز الحد المسموح به لرسائل البريد. انتظر قليلاً قبل المحاولة مرة أخرى.',
  over_request_rate_limit: 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.',
  email_address_invalid: 'صيغة البريد الإلكتروني غير صحيحة أو النطاق غير مقبول.',
  validation_failed: 'تحقق من البيانات المدخلة.',
  user_not_found: 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.',
  session_expired: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.',
  same_password: 'كلمة المرور الجديدة مطابقة للحالية. اختر كلمة مرور مختلفة.',
  signup_disabled: 'التسجيل غير متاح حالياً.',
  email_provider_disabled: 'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في المشروع.',
  provider_disabled: 'خدمة تسجيل الدخول هذه غير مفعّلة في المشروع.',
  otp_expired: 'انتهت صلاحية رابط التفعيل. اطلب رابطاً جديداً.',
  reauthentication_needed: 'يرجى تسجيل الدخول مجدداً قبل تنفيذ هذا الإجراء.',
}

/** Older GoTrue responses that carry no `code` — matched on message text. */
const LEGACY_MESSAGE_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'Email not confirmed': 'لم يتم تفعيل بريدك الإلكتروني بعد. تحقق من رسالة التفعيل في بريدك.',
  'User already registered': 'هذا البريد الإلكتروني مسجل بالفعل.',
  'Password should be at least 6 characters': 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
  'Unsupported provider': 'خدمة تسجيل الدخول هذه غير مفعّلة في المشروع.',
}

export type AuthErrorDetails = {
  /** Arabic text shown to the user. */
  message: string
  /** Supabase's stable error code, when present. */
  code?: string
  /** Supabase's original English message, surfaced for debugging. */
  rawMessage?: string
  status?: number
}

/**
 * Normalizes anything Supabase Auth throws or returns into a displayable
 * shape. Unmapped errors keep Supabase's own message in `rawMessage` so the
 * real cause is never lost — the UI shows it beneath the Arabic text rather
 * than swallowing it.
 */
export function getAuthErrorDetails(error: unknown): AuthErrorDetails {
  if (error instanceof AuthError) {
    const code = error.code
    const mapped =
      (code ? ERROR_CODE_MESSAGES[code] : undefined) ?? LEGACY_MESSAGE_MESSAGES[error.message]

    return {
      message: mapped ?? FALLBACK_MESSAGE,
      code,
      rawMessage: error.message,
      status: error.status,
    }
  }

  if (error instanceof Error) {
    return { message: FALLBACK_MESSAGE, rawMessage: error.message }
  }

  return { message: FALLBACK_MESSAGE }
}

/**
 * Convenience wrapper for call sites that only need the Arabic string.
 * Accepts an AuthError, an Error, or a raw message for backwards
 * compatibility with the previous signature.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return LEGACY_MESSAGE_MESSAGES[error] ?? FALLBACK_MESSAGE
  }
  if (error === null || error === undefined) {
    return FALLBACK_MESSAGE
  }
  return getAuthErrorDetails(error).message
}

/** True when the account exists but its email has never been confirmed. */
export function isEmailNotConfirmed(details: AuthErrorDetails): boolean {
  return details.code === 'email_not_confirmed' || details.rawMessage === 'Email not confirmed'
}
