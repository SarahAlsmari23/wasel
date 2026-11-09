'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/i18n/locale-provider'
import { formatDate, formatRelativeTime } from '@/lib/utils/format'

type RelativeTimeProps = {
  iso: string
  className?: string
}

/**
 * Renders the absolute date on the server (stable, cache-safe), then upgrades
 * to a relative phrase ("3 hours ago") after hydration, in the active locale.
 */
export function RelativeTime({ iso, className }: RelativeTimeProps) {
  const locale = useLocale()
  const [label, setLabel] = useState(() => formatDate(iso, locale))

  useEffect(() => {
    setLabel(formatRelativeTime(iso, locale))
  }, [iso, locale])

  return (
    <time dateTime={iso} title={formatDate(iso, locale)} className={className}>
      {label}
    </time>
  )
}
