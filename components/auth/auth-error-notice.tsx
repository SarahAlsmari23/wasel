'use client'

import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthErrorDetails } from '@/lib/auth/error-messages'

type AuthErrorNoticeProps = {
  details: AuthErrorDetails
  /** Recovery action rendered under the message (e.g. resend confirmation). */
  action?: ReactNode
}

/**
 * Shows the Arabic explanation and, underneath it, the verbatim message and
 * code Supabase returned. Keeping the original text visible is deliberate:
 * a user reporting "حدث خطأ" gives no diagnostic signal, whereas
 * "email_not_confirmed · Email not confirmed" identifies the cause instantly.
 */
export function AuthErrorNotice({ details, action }: AuthErrorNoticeProps) {
  const showRaw = Boolean(details.rawMessage) && details.rawMessage !== details.message

  return (
    <div
      role="alert"
      className="border-danger/25 bg-danger/5 flex flex-col gap-2 rounded-xl border px-3.5 py-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="text-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-danger flex-1 text-sm leading-relaxed">{details.message}</p>
      </div>

      {showRaw ? (
        <p className="text-muted-foreground pr-6.5 text-xs" dir="ltr">
          {details.code ? `${details.code} · ` : ''}
          {details.rawMessage}
          {details.status ? ` (${details.status})` : ''}
        </p>
      ) : null}

      {action ? <div className="pr-6.5">{action}</div> : null}
    </div>
  )
}
