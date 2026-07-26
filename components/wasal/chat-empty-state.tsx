'use client'

import { motion } from 'motion/react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { SuggestionChips } from '@/components/wasal/suggestion-chips'

export const CHAT_GREETING = 'مرحباً، كيف يمكنني مساعدتك اليوم؟'

type ChatEmptyStateProps = {
  onSelectSuggestion: (suggestion: string) => void
}

/**
 * The first thing a visitor sees on /wasal: a ready assistant, not a choice of
 * modes. Guests can start typing immediately — the complaint flow is offered
 * later, in context, once there is something to build a complaint from.
 */
export function ChatEmptyState({ onSelectSuggestion }: ChatEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 py-10 text-center sm:py-16"
    >
      <WaselLogo size="lg" />

      <div className="flex flex-col gap-2">
        <h1 className="text-heading text-2xl font-semibold text-balance sm:text-3xl">
          {CHAT_GREETING}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed text-pretty">
          اشرح مشكلتك بلغتك الطبيعية، وسأساعدك في تحديد الجهة الحكومية المختصة وخطوات التقديم.
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <p className="text-muted-foreground text-xs">جرّب أن تسأل:</p>
        <SuggestionChips onSelect={onSelectSuggestion} className="justify-center" />
      </div>
    </motion.div>
  )
}
