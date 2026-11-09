'use client'

import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthErrorDetails } from '@/lib/auth/error-messages'

type AuthErrorNoticeProps = {
  details: AuthErrorDetails
  action?: ReactNode
}

/**
 * Shows the localized explanation. Supabase's own technical message (code,
 * English text, HTTP status) is useful while developing but confusing — and
 * needlessly revealing — to end users, so it only renders in development.
 */
export function AuthErrorNotice({ details, action }: AuthErrorNoticeProps) {
  const showRaw =
    process.env.NODE_ENV === 'development' &&
    Boolean(details.rawMessage) &&
    details.rawMessage !== details.message

  return (
    <div
      role="alert"
      className="border-danger/25 bg-danger/5 animate-fade-in flex flex-col gap-2 rounded-xl border px-3.5 py-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="text-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-danger flex-1 text-sm leading-relaxed">{details.message}</p>
      </div>

      {showRaw ? (
        <p className="text-muted-foreground ps-6.5 text-xs" dir="ltr">
          {details.code ? `${details.code} · ` : ''}
          {details.rawMessage}
          {details.status ? ` (${details.status})` : ''}
        </p>
      ) : null}

      {action ? <div className="ps-6.5">{action}</div> : null}
    </div>
  )
}
