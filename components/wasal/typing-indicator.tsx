'use client'

import { motion } from 'motion/react'
import { WaselLogo } from '@/components/brand/wasel-logo'

type TypingIndicatorProps = {
  label: string
}

export function TypingIndicator({ label }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-end gap-2.5"
      role="status"
      aria-live="polite"
    >
      <WaselLogo size="sm" variant="mark" className="mt-1 shrink-0" />
      <div className="bg-surface border-border shadow-soft flex items-center gap-2.5 rounded-2xl rounded-se-md border px-4 py-3">
        {/* Soft pulse rather than a bounce — calm, and static under reduced motion. */}
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="bg-secondary/80 h-1.5 w-1.5 animate-pulse rounded-full" />
          <span className="bg-secondary/80 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
          <span className="bg-secondary/80 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
        </span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    </motion.div>
  )
}
