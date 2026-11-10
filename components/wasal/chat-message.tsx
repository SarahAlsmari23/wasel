'use client'

import { motion } from 'motion/react'
import { FileSignature } from 'lucide-react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { MarkdownMessage } from '@/components/wasal/markdown-message'
import { cn } from '@/lib/utils/cn'
import { formatTime } from '@/lib/utils/format'
import type { MockMessage } from '@/types/conversation'

const COPY = defineCopy({
  ar: { createComplaint: 'إنشاء البلاغ' },
  en: { createComplaint: 'Create the complaint' },
})

type ChatMessageProps = {
  message: MockMessage
  /**
   * Handler for the inline "إنشاء البلاغ" action. Omitted where messages are
   * read-only (the dashboard conversation view), which also hides the button.
   */
  onCreateComplaint?: () => void
}

export function ChatMessage({ message, onCreateComplaint }: ChatMessageProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const isUser = message.role === 'user'
  const showCta = message.cta === 'create_complaint' && Boolean(onCreateComplaint)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex w-full gap-2.5', isUser ? 'justify-start' : 'justify-end')}
    >
      {isUser ? null : <WaselLogo size="sm" variant="mark" className="mt-1 shrink-0" />}

      {/* Mobile chat UI review, Part 4 — `min-w-0` lets this flex item shrink
          below the intrinsic width of an unbroken long token (a URL, a long
          English word); without it a flex row's default `min-width: auto`
          would force the bubble wider than its `max-w-[85%]` cap instead of
          wrapping, producing horizontal overflow. */}
      <div className={cn('flex max-w-[85%] min-w-0 flex-col gap-1.5 sm:max-w-[75%]')}>
        <div
          className={cn(
            // `break-words` (overflow-wrap: break-word) is inherited, so it
            // also reaches the plain <p> below and every element MarkdownMessage
            // renders (paragraphs, links, inline code) without needing to
            // touch that component — a single authoritative wrap rule here.
            'rounded-2xl px-4 py-3 break-words',
            isUser
              ? 'bg-primary text-primary-foreground rounded-ss-md'
              : 'bg-surface border-border text-foreground shadow-soft rounded-se-md border',
          )}
        >
          {isUser ? (
            <p dir="auto" className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <MarkdownMessage content={message.content} />
          )}

          {showCta ? (
            <button
              type="button"
              onClick={onCreateComplaint}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors"
            >
              <FileSignature className="h-4 w-4" aria-hidden="true" />
              {copy.createComplaint}
            </button>
          ) : null}
        </div>

        <span
          className={cn(
            'text-muted-foreground px-1 text-[11px]',
            isUser ? 'text-start' : 'text-end',
          )}
        >
          {formatTime(message.createdAt, locale)}
        </span>
      </div>
    </motion.div>
  )
}
