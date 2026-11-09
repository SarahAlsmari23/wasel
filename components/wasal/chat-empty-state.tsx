'use client'

import { motion, useReducedMotion } from 'motion/react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { useCopy } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: {
    greeting: 'مرحبًا، كيف يمكنني مساعدتك اليوم؟',
    lead: 'اشرح مشكلتك بلغتك الطبيعية، وسيساعدك واصل في تحديد الجهة الحكومية المختصة وخطوات التقديم.',
    note: 'واصل مساعد ذكي وليس جهة حكومية؛ راجع المعلومات قبل تقديم أي بلاغ.',
  },
  en: {
    greeting: 'Hello, how can I help you today?',
    lead: 'Describe your problem in your own words, and Wasel will help you identify the responsible government authority and how to submit.',
    note: 'Wasel is an AI assistant, not a government authority; review the information before submitting any complaint.',
  },
})

type ChatEmptyStateProps = {
  onSelectSuggestion: (suggestion: string) => void
}

/**
 * The centred landing screen shown before the first message. Suggested
 * starter chips were removed deliberately (they seeded generic text as a
 * complaint description — see wasal-chat.tsx); `onSelectSuggestion` is kept
 * so the chips can return without changing the parent.
 */
export function ChatEmptyState({ onSelectSuggestion: _onSelectSuggestion }: ChatEmptyStateProps) {
  const copy = useCopy(COPY)
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 py-10 text-center sm:py-16"
    >
      <WaselLogo size="lg" />

      <div className="flex flex-col gap-2">
        <h1 className="text-heading text-2xl font-semibold text-balance sm:text-3xl">
          {copy.greeting}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed text-pretty">
          {copy.lead}
        </p>
        <p className="text-subtle-foreground mx-auto mt-1 max-w-md text-xs leading-relaxed">
          {copy.note}
        </p>
      </div>
    </motion.div>
  )
}
