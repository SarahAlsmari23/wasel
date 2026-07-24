'use client'

import { useState, type KeyboardEvent } from 'react'

type MessageComposerProps = {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [value, setValue] = useState('')

  function handleSend() {
    if (disabled) return
    const trimmed = value.trim()
    if (trimmed === '') return

    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const isEmpty = value.trim() === ''

  return (
    <div className="flex items-end gap-2 border-t border-black/10 p-4 dark:border-white/10">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="اكتب رسالتك هنا..."
        className="max-h-40 flex-1 resize-none rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || isEmpty}
        className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        إرسال
      </button>
    </div>
  )
}
