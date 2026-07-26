'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils/cn'

export const ASSISTANT_SUGGESTIONS = [
  'لدي مشكلة مع شركة اتصالات.',
  'أريد تقديم شكوى ضد متجر.',
  'لدي مشكلة في خدمة حكومية.',
  'كيف أعرف الجهة المختصة؟',
]

type SuggestionChipsProps = {
  suggestions?: string[]
  onSelect: (suggestion: string) => void
  className?: string
}

export function SuggestionChips({
  suggestions = ASSISTANT_SUGGESTIONS,
  onSelect,
  className = '',
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="border-border bg-surface text-foreground hover:border-primary/40 hover:bg-primary/5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors"
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  )
}
