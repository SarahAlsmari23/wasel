const FALLBACK_MESSAGE = 'حدث خطأ ما. حاول مرة أخرى.'

const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'بيانات الدخول غير صحيحة.',
  'User already registered': 'هذا البريد الإلكتروني مسجل بالفعل.',
  'Password should be at least 6 characters': 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
  'Unsupported provider': 'خدمة تسجيل الدخول هذه غير مفعّلة حالياً.',
}

/**
 * Maps a raw Supabase Auth error message to a safe Arabic message. Never
 * returns the raw input — unrecognized messages fall back to a generic
 * Arabic error so implementation details are never shown to the user.
 */
export function getAuthErrorMessage(rawMessage: string | null | undefined): string {
  if (!rawMessage) return FALLBACK_MESSAGE
  return KNOWN_ERROR_MESSAGES[rawMessage] ?? FALLBACK_MESSAGE
}
