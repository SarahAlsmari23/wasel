'use client'

import { motion } from 'motion/react'
import { WaselLogo } from '@/components/brand/wasel-logo'

type TypingIndicatorProps = {
  /** Phase 2 asks for "واصل يحلل الشكوى..." during complaint analysis. */
  label?: string
}

export function TypingIndicator({ label = 'واصل يكتب...' }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-end gap-2.5"
      role="status"
      aria-live="polite"
    >
      <WaselLogo size="sm" variant="mark" className="mt-1 shrink-0" />
      <div className="bg-surface border-border shadow-soft flex items-center gap-2.5 rounded-2xl rounded-tl-md border px-4 py-3">
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="bg-secondary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
          <span className="bg-secondary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
          <span className="bg-secondary h-1.5 w-1.5 animate-bounce rounded-full" />
        </span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    </motion.div>
  )
}
