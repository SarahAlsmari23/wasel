'use client'

import { useEffect, useState } from 'react'
import { formatDate, formatRelativeTime } from '@/lib/utils/format'

type RelativeTimeProps = {
  iso: string
  className?: string
}

/**
 * "قبل ساعتين" depends on the current clock, which differs between the server
 * render and the browser. The absolute date is rendered first and swapped for
 * the relative form after mount, so hydration always matches.
 */
export function RelativeTime({ iso, className }: RelativeTimeProps) {
  const [label, setLabel] = useState(() => formatDate(iso))

  useEffect(() => {
    setLabel(formatRelativeTime(iso))
  }, [iso])

  return (
    <time dateTime={iso} title={formatDate(iso)} className={className}>
      {label}
    </time>
  )
}
