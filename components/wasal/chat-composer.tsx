'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useCopy } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const MAX_TEXTAREA_HEIGHT = 160

const COPY = defineCopy({
  ar: {
    defaultPlaceholder: 'صف مشكلتك...',
    inputLabel: 'رسالتك إلى واصل',
    send: 'إرسال',
    hint: 'اضغط Enter للإرسال · Shift + Enter لسطر جديد',
  },
  en: {
    defaultPlaceholder: 'Describe your problem...',
    inputLabel: 'Your message to Wasel',
    send: 'Send',
    hint: 'Press Enter to send · Shift + Enter for a new line',
  },
})

/*
 * File attachments were removed deliberately: the previous paperclip control
 * only recorded a file's name and never sent or analysed its contents, which
 * misled users into thinking a bill or photo had been read. A future
 * document/image-understanding service can reintroduce an upload control here
 * once its contents are genuinely processed end to end.
 */
type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder,
}: ChatComposerProps) {
  const copy = useCopy(COPY)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Grow with the content up to a cap, then scroll inside the field.
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [value])

  const canSend = value.trim() !== '' && !disabled

  function handleSend() {
    if (!canSend) return
    onSend()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // IME composition (e.g. some keyboard layouts) must not send mid-word.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    // Mobile chat UI review, Part 2 — the single authoritative safe-area
    // source for this page: at least 0.75rem of breathing room, plus the iOS
    // home-indicator inset when the browser renders edge-to-edge.
    <div className="border-border bg-background/85 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="border-border bg-surface shadow-soft focus-within:border-primary/50 focus-within:ring-primary/10 flex items-end gap-2 rounded-2xl border p-2 transition-[border-color,box-shadow] duration-200 focus-within:ring-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={placeholder ?? copy.defaultPlaceholder}
            aria-label={copy.inputLabel}
            dir="auto"
            className="text-foreground placeholder:text-muted-foreground/70 max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-relaxed focus:outline-none disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label={copy.send}
            className={cn(
              'shrink-0 rounded-xl p-2.5 transition-[background-color,transform] duration-200 active:scale-95',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                : 'bg-primary/10 text-muted-foreground cursor-not-allowed',
            )}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-muted-foreground mt-2 hidden text-center text-[11px] sm:block">
          {copy.hint}
        </p>
      </div>
    </div>
  )
}
